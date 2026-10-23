const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const HISTORY_TABLE = "public.app_schema_migrations";
const LOCK_KEY = "khet-rakshak-schema-migrations";

function validateDatabaseUrl(value = process.env.DATABASE_URL) {
  if (!value) throw new Error("DATABASE_URL is required.");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname || parsed.pathname === "/") {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
}

function discoverMigrations(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => {
      const match = entry.name.match(/^(\d{3,})_([a-z0-9][a-z0-9_-]*)\.sql$/i);
      if (!match) throw new Error(`Invalid migration filename: ${entry.name}`);
      return { version: match[1], name: match[2], filename: entry.name, path: path.join(migrationsDir, entry.name) };
    })
    .sort((left, right) => Number(left.version) - Number(right.version));

  const seenVersions = new Set();
  for (const migration of files) {
    if (seenVersions.has(migration.version)) throw new Error(`Duplicate migration version: ${migration.version}`);
    seenVersions.add(migration.version);
  }
  return files;
}

async function getMigrationStatus(queryable, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const migrations = discoverMigrations(migrationsDir);
  const history = await queryable.query("SELECT to_regclass($1) AS history_table", [HISTORY_TABLE]);
  const appliedRows = history.rows[0].history_table
    ? (await queryable.query(
      "SELECT version, name, applied_at FROM public.app_schema_migrations ORDER BY version"
    )).rows
    : [];
  const appliedByVersion = new Map(appliedRows.map((row) => [String(row.version), row]));

  for (const migration of migrations) {
    const applied = appliedByVersion.get(migration.version);
    if (applied && applied.name !== migration.name) {
      throw new Error(`Migration ${migration.version} has a different name in the database history.`);
    }
  }

  return {
    applied: migrations.filter((migration) => appliedByVersion.has(migration.version)),
    pending: migrations.filter((migration) => !appliedByVersion.has(migration.version)),
    unknownApplied: appliedRows.filter((row) => !migrations.some((migration) => migration.version === String(row.version))),
  };
}

async function applyMigrations(pool, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const migrations = discoverMigrations(migrationsDir);
  const client = await pool.connect();
  let lockAcquired = false;
  const appliedNow = [];

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
    lockAcquired = true;
    await client.query(`CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
      version VARCHAR(32) PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const status = await getMigrationStatus(client, migrationsDir);
    if (status.unknownApplied.length) {
      throw new Error("The migration history contains versions missing from this codebase. Restore the missing migration files before applying more migrations.");
    }

    for (const migration of status.pending) {
      const sql = fs.readFileSync(migration.path, "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO public.app_schema_migrations (version, name) VALUES ($1, $2)",
          [migration.version, migration.name]
        );
        await client.query("COMMIT");
        appliedNow.push(migration);
      } catch {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Migration ${migration.filename} failed; its transaction was rolled back.`);
      }
    }

    return { applied: appliedNow };
  } finally {
    if (lockAcquired) await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

const REQUIRED_COLUMNS = [
  ["app_users", "id", "bigint", false, true, null],
  ["app_users", "firebase_uid", "character varying", false, false, 128],
  ["app_users", "email", "character varying", true, false, 320],
  ["app_users", "full_name", "character varying", false, false, 120],
  ["app_users", "mobile_number", "character varying", true, false, 20],
  ["app_users", "village", "character varying", false, false, 120],
  ["app_users", "role", "character varying", false, true, 20],
  ["app_users", "account_status", "character varying", false, true, 20],
  ["app_users", "created_at", "timestamp with time zone", false, true, null],
  ["app_users", "updated_at", "timestamp with time zone", false, true, null],
  ["role_requests", "id", "bigint", false, true, null],
  ["role_requests", "user_id", "bigint", false, false, null],
  ["role_requests", "requested_role", "character varying", false, false, 20],
  ["role_requests", "status", "character varying", false, true, 20],
  ["role_requests", "reviewed_by", "bigint", true, false, null],
  ["role_requests", "created_at", "timestamp with time zone", false, true, null],
  ["role_requests", "reviewed_at", "timestamp with time zone", true, false, null],
];

const REQUIRED_CONSTRAINTS = [
  ["app_users", "app_users_pkey", "p", ["primary key (id)"]],
  ["app_users", "app_users_firebase_uid_key", "u", ["unique (firebase_uid)"]],
  ["app_users", "app_users_role_check", "c", ["role", "farmer", "drone_pilot", "outlet_manager", "admin"]],
  ["app_users", "app_users_account_status_check", "c", ["account_status", "active", "pending", "suspended"]],
  ["role_requests", "role_requests_pkey", "p", ["primary key (id)"]],
  ["role_requests", "role_requests_user_id_requested_role_key", "u", ["unique (user_id, requested_role)"]],
  ["role_requests", "role_requests_requested_role_check", "c", ["requested_role", "drone_pilot", "outlet_manager"]],
  ["role_requests", "role_requests_status_check", "c", ["status", "pending", "approved", "rejected"]],
  ["role_requests", "role_requests_user_id_fkey", "f", ["foreign key (user_id)", "references app_users(id)", "on delete cascade"]],
  ["role_requests", "role_requests_reviewed_by_fkey", "f", ["foreign key (reviewed_by)", "references app_users(id)"]],
];

async function checkApplicationSchema(queryable, { skipTables = [] } = {}) {
  const requiredColumns = REQUIRED_COLUMNS.filter(([table]) => !skipTables.includes(table));
  const columns = await queryable.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name IN ('app_users', 'role_requests')`
  );
  const columnsByKey = new Map(columns.rows.map((column) => [`${column.table_name}.${column.column_name}`, column]));
  const columnsReady = requiredColumns.every(([table, column, type, nullable, hasDefault, maxLength]) => {
    const actual = columnsByKey.get(`${table}.${column}`);
    return actual && actual.data_type === type && actual.is_nullable === (nullable ? "YES" : "NO") &&
      (!hasDefault || actual.column_default !== null) &&
      (maxLength === null || Number(actual.character_maximum_length) === maxLength);
  });

  const constraints = await queryable.query(
    `SELECT t.relname AS table_name, c.conname AS constraint_name,
            c.contype AS constraint_type, pg_get_constraintdef(c.oid) AS constraint_definition
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname IN ('app_users', 'role_requests')`
  );
  const constraintKeys = new Set(constraints.rows.map((constraint) =>
    `${constraint.table_name}.${constraint.constraint_name}.${constraint.constraint_type}`
  ));
  const definitionsByKey = new Map(constraints.rows.map((constraint) =>
    [`${constraint.table_name}.${constraint.constraint_name}.${constraint.constraint_type}`, constraint.constraint_definition.toLowerCase()]
  ));
  const requiredConstraints = REQUIRED_CONSTRAINTS.filter(([table]) => !skipTables.includes(table));
  const constraintsReady = requiredConstraints.every(([table, name, type, fragments]) => {
    const definition = definitionsByKey.get(`${table}.${name}.${type}`);
    return definition && fragments.every((fragment) => definition.includes(fragment));
  });

  const indexReady = skipTables.includes("app_users")
    ? true
    : (await queryable.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'app_users'
           AND indexname = 'app_users_mobile_unique'
           AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%WHERE (mobile_number IS NOT NULL)%'
       ) AS mobile_index_ready`
    )).rows[0].mobile_index_ready;
  return columnsReady && constraintsReady && indexReady;
}

module.exports = {
  applyMigrations,
  checkApplicationSchema,
  discoverMigrations,
  getMigrationStatus,
  REQUIRED_COLUMNS,
  REQUIRED_CONSTRAINTS,
  validateDatabaseUrl,
};
