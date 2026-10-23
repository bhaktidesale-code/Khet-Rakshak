const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  applyMigrations,
  checkApplicationSchema,
  discoverMigrations,
  getMigrationStatus,
  REQUIRED_COLUMNS,
  REQUIRED_CONSTRAINTS,
  REQUIRED_INDEXES,
  validateDatabaseUrl,
} = require("../services/migrations");
const { getDatabaseReadiness } = require("../services/readiness");

function fixtureDirectory(t, migrations = { "001_first.sql": "CREATE TABLE example (id INT);" }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "khet-rakshak-migrations-"));
  for (const [filename, sql] of Object.entries(migrations)) fs.writeFileSync(path.join(directory, filename), sql);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function fakePool() {
  const state = { historyExists: false, rows: [], transaction: false, releaseCount: 0, failSql: false };
  const client = {
    async query(sql, params = []) {
      if (sql.includes("pg_advisory_lock") || sql.includes("pg_advisory_unlock")) return { rows: [] };
      if (sql.includes("CREATE TABLE IF NOT EXISTS public.app_schema_migrations")) {
        state.historyExists = true;
        return { rows: [] };
      }
      if (sql.includes("to_regclass($1)")) return { rows: [{ history_table: state.historyExists ? "app_schema_migrations" : null }] };
      if (sql.includes("SELECT version, name, applied_at")) return { rows: [...state.rows] };
      if (sql === "BEGIN") { state.transaction = true; return { rows: [] }; }
      if (sql === "COMMIT") { state.transaction = false; return { rows: [] }; }
      if (sql === "ROLLBACK") { state.transaction = false; return { rows: [] }; }
      if (sql.includes("INSERT INTO public.app_schema_migrations")) {
        state.rows.push({ version: params[0], name: params[1] });
        return { rows: [] };
      }
      if (state.failSql) throw new Error("mock SQL failure");
      return { rows: [] };
    },
    release() { state.releaseCount += 1; },
  };
  return { state, connect: async () => client, query: client.query };
}

test("database URL validation rejects missing and non-PostgreSQL URLs without echoing values", () => {
  assert.throws(() => validateDatabaseUrl(""), /DATABASE_URL is required/);
  assert.throws(() => validateDatabaseUrl("mysql://private:password@db.example/test"), /PostgreSQL/);
  assert.doesNotThrow(() => validateDatabaseUrl("postgresql://user:password@db.example:5432/app"));
});

test("migration discovery orders versioned SQL and rejects malformed or duplicate versions", (t) => {
  const directory = fixtureDirectory(t, {
    "002_second.sql": "SELECT 2;",
    "001_first.sql": "SELECT 1;",
  });
  assert.deepEqual(discoverMigrations(directory).map((migration) => migration.filename), ["001_first.sql", "002_second.sql"]);
  fs.writeFileSync(path.join(directory, "notes.sql"), "SELECT 3;");
  assert.throws(() => discoverMigrations(directory), /Invalid migration filename/);
  fs.rmSync(path.join(directory, "notes.sql"));
  fs.writeFileSync(path.join(directory, "001_duplicate.sql"), "SELECT 4;");
  assert.throws(() => discoverMigrations(directory), /Duplicate migration version/);
});

test("authentication repair migration is additive and follows the original schema migration", () => {
  const migrations = discoverMigrations();
  assert.deepEqual(
    migrations.map((migration) => migration.filename),
    ["001_authentication.sql", "002_ensure_auth_tables.sql", "003_drone_image_workflow.sql"]
  );
  const repairSql = fs.readFileSync(migrations[1].path, "utf8");
  assert.match(repairSql, /CREATE TABLE IF NOT EXISTS public\.app_users/);
  assert.match(repairSql, /CREATE TABLE IF NOT EXISTS public\.role_requests/);
  assert.match(repairSql, /exists outside public; refusing to create a second table/);
  assert.doesNotMatch(repairSql, /^\s*(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|INSERT\s+INTO|UPDATE)\b/im);
  assert.match(repairSql, /CREATE UNIQUE INDEX IF NOT EXISTS app_users_mobile_unique/);
  const droneSql = fs.readFileSync(migrations[2].path, "utf8");
  assert.match(droneSql, /CREATE TABLE IF NOT EXISTS public\.drone_images/);
  assert.match(droneSql, /FOREIGN KEY \(farmer_user_id, farm_id\)/);
  assert.match(droneSql, /FOREIGN KEY \(batch_id, farmer_user_id, farm_id, operator_user_id\)/);
  assert.match(droneSql, /captured_at TIMESTAMP WITHOUT TIME ZONE/);
  assert.doesNotMatch(droneSql, /^\s*(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM)\b/im);
});

test("migration status reports all migrations pending when history does not exist", async (t) => {
  const directory = fixtureDirectory(t);
  const pool = fakePool();
  const status = await getMigrationStatus(pool, directory);
  assert.equal(status.pending.length, 1);
  assert.equal(status.applied.length, 0);
});

test("an already-applied original migration leaves the additive repair migration pending", async () => {
  const pool = fakePool();
  pool.state.historyExists = true;
  pool.state.rows.push({ version: "001", name: "authentication" });
  const status = await getMigrationStatus(pool);
  assert.deepEqual(status.applied.map((migration) => migration.filename), ["001_authentication.sql"]);
  assert.deepEqual(status.pending.map((migration) => migration.filename), [
    "002_ensure_auth_tables.sql",
    "003_drone_image_workflow.sql",
  ]);
});

test("migrations are recorded transactionally and repeat runs are no-ops", async (t) => {
  const directory = fixtureDirectory(t, {
    "001_first.sql": "CREATE TABLE example (id INT);",
    "002_second.sql": "CREATE INDEX example_idx ON example (id);",
  });
  const pool = fakePool();
  const first = await applyMigrations(pool, directory);
  assert.deepEqual(first.applied.map((migration) => migration.version), ["001", "002"]);
  assert.equal(pool.state.rows.length, 2);
  assert.equal(pool.state.transaction, false);

  const second = await applyMigrations(pool, directory);
  assert.equal(second.applied.length, 0);
  assert.equal(pool.state.rows.length, 2);
  assert.equal(pool.state.releaseCount, 2);
});

test("failed migrations roll back and are not recorded as applied", async (t) => {
  const directory = fixtureDirectory(t, { "001_broken.sql": "FAIL;" });
  const pool = fakePool();
  pool.state.failSql = true;
  await assert.rejects(() => applyMigrations(pool, directory), /transaction was rolled back/);
  assert.equal(pool.state.rows.length, 0);
  assert.equal(pool.state.transaction, false);
  assert.equal(pool.state.releaseCount, 1);
});

test("schema readiness requires all application columns, constraints, and indexes", async () => {
  const validColumns = REQUIRED_COLUMNS.map(([table_name, column_name, data_type, nullable, hasDefault, character_maximum_length]) => ({
    table_name, column_name, data_type,
    is_nullable: nullable ? "YES" : "NO",
    column_default: hasDefault ? "configured_default" : null,
    character_maximum_length,
  }));
  const validConstraints = REQUIRED_CONSTRAINTS.map(([table_name, constraint_name, kind, fragments]) => ({
    table_name, constraint_name, constraint_type: kind,
    constraint_definition: fragments.join(" "),
  }));
  const validIndexes = REQUIRED_INDEXES.map(([tablename, indexname, fragments]) => ({
    tablename,
    indexname,
    indexdef: `CREATE ${fragments.join(" ")} INDEX ${indexname}`,
  }));
  const validSchema = {
    async query(sql) {
      if (sql.includes("information_schema.columns")) return { rows: validColumns };
      if (sql.includes("FROM pg_constraint")) return { rows: validConstraints };
      if (sql.includes("FROM pg_indexes")) return { rows: validIndexes };
      return { rows: [] };
    },
  };
  assert.equal(await checkApplicationSchema(validSchema), true);

  const missingIndex = { ...validSchema, async query(sql) {
    if (sql.includes("information_schema.columns")) return { rows: validColumns };
    if (sql.includes("FROM pg_constraint")) return { rows: validConstraints };
    if (sql.includes("FROM pg_indexes")) return { rows: validIndexes.slice(1) };
    return { rows: [] };
  } };
  assert.equal(await checkApplicationSchema(missingIndex), false);
});

test("schema preflight validates existing tables while allowing an absent table to be created", async () => {
  const columns = REQUIRED_COLUMNS.filter(([table, column]) => table === "app_users" && column !== "farmer_id").map(
    ([table_name, column_name, data_type, nullable, hasDefault, character_maximum_length]) => ({
      table_name,
      column_name,
      data_type,
      is_nullable: nullable ? "YES" : "NO",
      column_default: hasDefault ? "configured_default" : null,
      character_maximum_length,
    })
  );
  const constraints = REQUIRED_CONSTRAINTS.filter(([table]) => table === "app_users").map(
    ([table_name, constraint_name, kind, fragments]) => ({
      table_name,
      constraint_name,
      constraint_type: kind,
      constraint_definition: fragments.join(" "),
    })
  );
  const existingAppUsers = { async query(sql) {
    if (sql.includes("information_schema.columns")) return { rows: columns };
    if (sql.includes("FROM pg_constraint")) return { rows: constraints };
    if (sql.includes("FROM pg_indexes")) return { rows: REQUIRED_INDEXES.filter(([, name]) => name === "app_users_mobile_unique").map(([tablename, indexname, fragments]) => ({ tablename, indexname, indexdef: `CREATE ${fragments.join(" ")} INDEX ${indexname}` })) };
    return { rows: [] };
  } };
  assert.equal(await checkApplicationSchema(existingAppUsers, { skipTables: ["role_requests"], skipDroneWorkflow: true }), true);
});

test("readiness distinguishes unconfigured, unreachable, unmigrated, and ready databases", async () => {
  const unconfigured = await getDatabaseReadiness({ query: async () => { throw new Error("must not connect"); } }, { databaseUrl: "" });
  assert.equal(unconfigured.body.database, "not_configured");

  const unreachable = await getDatabaseReadiness({ query: async () => { throw Object.assign(new Error("private connection detail"), { code: "ECONNREFUSED" }); } }, { databaseUrl: "postgres://user:password@host/db" });
  assert.equal(unreachable.body.database, "unavailable");
  assert.equal(unreachable.logCode, "ECONNREFUSED");
  assert.equal(JSON.stringify(unreachable.body).includes("private connection detail"), false);

  const unmigrated = await getDatabaseReadiness({ query: async (sql) => {
    if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
    if (sql.includes("to_regclass")) return { rows: [{ history_table: null }] };
    throw new Error("unexpected query");
  } }, { databaseUrl: "postgres://user:password@host/db" });
  assert.deepEqual(unmigrated.body, {
    success: false, status: "not_ready", database: "connected", schema: "migration_required",
  });

  const columns = REQUIRED_COLUMNS.map(([table_name, column_name, data_type, nullable, hasDefault, character_maximum_length]) => ({
    table_name, column_name, data_type,
    is_nullable: nullable ? "YES" : "NO",
    column_default: hasDefault ? "configured_default" : null,
    character_maximum_length,
  }));
  const constraints = REQUIRED_CONSTRAINTS.map(([table_name, constraint_name, kind, fragments]) => ({
    table_name, constraint_name, constraint_type: kind,
    constraint_definition: fragments.join(" "),
  }));
  const indexes = REQUIRED_INDEXES.map(([tablename, indexname, fragments]) => ({
    tablename,
    indexname,
    indexdef: `CREATE ${fragments.join(" ")} INDEX ${indexname}`,
  }));
  const readyDatabase = { async query(sql) {
    if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
    if (sql.includes("to_regclass")) return { rows: [{ history_table: "app_schema_migrations" }] };
    if (sql.includes("SELECT version, name, applied_at")) return { rows: [
      { version: "001", name: "authentication" },
      { version: "002", name: "ensure_auth_tables" },
      { version: "003", name: "drone_image_workflow" },
    ] };
    if (sql.includes("information_schema.columns")) return { rows: columns };
    if (sql.includes("FROM pg_constraint")) return { rows: constraints };
    if (sql.includes("FROM pg_indexes")) return { rows: indexes };
    return { rows: [] };
  } };
  const ready = await getDatabaseReadiness(readyDatabase, { databaseUrl: "postgres://user:password@host/db" });
  assert.deepEqual(ready, {
    httpStatus: 200,
    body: { success: true, status: "ready", database: "connected", schema: "ready" },
  });
});
