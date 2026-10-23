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

const AUTH_COLUMNS = [
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

const DRONE_WORKFLOW_COLUMNS = [
  ["app_users", "farmer_id", "character varying", false, true, 19],
  ["farms", "id", "uuid", false, true, null],
  ["farms", "owner_user_id", "bigint", false, false, null],
  ["farms", "name", "character varying", false, false, 100],
  ["farms", "location", "character varying", false, false, 120],
  ["farms", "crop", "character varying", false, false, 80],
  ["farms", "area_acres", "numeric", false, false, null],
  ["farms", "created_at", "timestamp with time zone", false, true, null],
  ["drone_upload_batches", "id", "uuid", false, false, null],
  ["drone_upload_batches", "farmer_user_id", "bigint", false, false, null],
  ["drone_upload_batches", "farm_id", "uuid", false, false, null],
  ["drone_upload_batches", "operator_user_id", "bigint", false, false, null],
  ["drone_upload_batches", "expected_image_count", "integer", false, false, null],
  ["drone_upload_batches", "status", "character varying", false, true, 20],
  ["drone_upload_batches", "created_at", "timestamp with time zone", false, true, null],
  ["drone_upload_batches", "completed_at", "timestamp with time zone", true, false, null],
  ["drone_images", "id", "uuid", false, true, null],
  ["drone_images", "batch_id", "uuid", false, false, null],
  ["drone_images", "client_image_id", "uuid", false, false, null],
  ["drone_images", "farmer_user_id", "bigint", false, false, null],
  ["drone_images", "farm_id", "uuid", false, false, null],
  ["drone_images", "operator_user_id", "bigint", false, false, null],
  ["drone_images", "storage_key", "character varying", false, false, 512],
  ["drone_images", "original_filename", "character varying", false, false, 255],
  ["drone_images", "file_size_bytes", "bigint", false, false, null],
  ["drone_images", "mime_type", "character varying", false, false, 64],
  ["drone_images", "sha256", "character", false, false, 64],
  ["drone_images", "width", "integer", false, false, null],
  ["drone_images", "height", "integer", false, false, null],
  ["drone_images", "captured_at", "timestamp without time zone", true, false, null],
  ["drone_images", "gps_latitude", "double precision", true, false, null],
  ["drone_images", "gps_longitude", "double precision", true, false, null],
  ["drone_images", "analysis_status", "character varying", false, true, 24],
  ["drone_images", "uploaded_at", "timestamp with time zone", false, true, null],
];

const REQUIRED_COLUMNS = [...AUTH_COLUMNS, ...DRONE_WORKFLOW_COLUMNS];

const AUTH_CONSTRAINTS = [
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

const DRONE_WORKFLOW_CONSTRAINTS = [
  ["farms", "farms_pkey", "p", ["primary key (id)"]],
  ["farms", "farms_owner_user_id_fkey", "f", ["foreign key (owner_user_id)", "references app_users(id)", "on delete cascade"]],
  ["farms", "farms_owner_user_id_id_key", "u", ["unique (owner_user_id, id)"]],
  ["farms", "farms_area_acres_check", "c", ["area_acres >"]],
  ["drone_upload_batches", "drone_upload_batches_pkey", "p", ["primary key (id)"]],
  ["drone_upload_batches", "drone_upload_batches_farm_owner_fkey", "f", ["foreign key (farmer_user_id, farm_id)", "references farms(owner_user_id, id)"]],
  ["drone_upload_batches", "drone_upload_batches_expected_image_count_check", "c", ["expected_image_count >= 1", "expected_image_count <= 8"]],
  ["drone_images", "drone_images_pkey", "p", ["primary key (id)"]],
  ["drone_images", "drone_images_batch_owner_fkey", "f", ["foreign key (batch_id, farmer_user_id, farm_id, operator_user_id)", "references drone_upload_batches(id, farmer_user_id, farm_id, operator_user_id)"]],
  ["drone_images", "drone_images_batch_id_client_image_id_key", "u", ["unique (batch_id, client_image_id)"]],
];

const REQUIRED_CONSTRAINTS = [...AUTH_CONSTRAINTS, ...DRONE_WORKFLOW_CONSTRAINTS];

async function checkApplicationSchema(queryable, { skipTables = [], skipDroneWorkflow = false } = {}) {
  const requiredColumns = REQUIRED_COLUMNS.filter(([table, column]) =>
    !skipTables.includes(table) &&
    (!skipDroneWorkflow || (!DRONE_WORKFLOW_TABLES.has(table) && !(table === "app_users" && column === "farmer_id")))
  );
  const tableNames = [...new Set(requiredColumns.map(([table]) => table))];
  const columns = await queryable.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [tableNames]
  );
  const columnsByKey = new Map(columns.rows.map((column) => [`${column.table_name}.${column.column_name}`, column]));
  const columnsReady = requiredColumns.every(([table, column, type, nullable, hasDefault, maxLength]) => {
    const actual = columnsByKey.get(`${table}.${column}`);
    return actual && actual.data_type === type && actual.is_nullable === (nullable ? "YES" : "NO") &&
      (!hasDefault || actual.column_default !== null) &&
      (maxLength === null || Number(actual.character_maximum_length) === maxLength);
  });

  const requiredConstraints = REQUIRED_CONSTRAINTS.filter(([table]) =>
    !skipTables.includes(table) && (!skipDroneWorkflow || !DRONE_WORKFLOW_TABLES.has(table))
  );
  const constraintTables = [...new Set(requiredConstraints.map(([table]) => table))];
  const constraints = await queryable.query(
    `SELECT t.relname AS table_name, c.conname AS constraint_name,
            c.contype AS constraint_type, pg_get_constraintdef(c.oid) AS constraint_definition
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname = ANY($1::text[])`,
    [constraintTables]
  );
  const definitionsByKey = new Map(constraints.rows.map((constraint) =>
    [`${constraint.table_name}.${constraint.constraint_name}.${constraint.constraint_type}`, constraint.constraint_definition.toLowerCase()]
  ));
  const constraintsReady = requiredConstraints.every(([table, name, type, fragments]) => {
    const definition = definitionsByKey.get(`${table}.${name}.${type}`);
    return definition && fragments.every((fragment) => definition.includes(fragment));
  });

  const requiredIndexes = REQUIRED_INDEXES.filter(([table, name]) =>
    !skipTables.includes(table) &&
    (!skipDroneWorkflow || (!DRONE_WORKFLOW_TABLES.has(table) && name !== "app_users_farmer_id_unique"))
  );
  const indexes = await queryable.query(
    `SELECT tablename, indexname, indexdef FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [[...new Set(requiredIndexes.map(([table]) => table))]]
  );
  const indexDefinitions = new Map(indexes.rows.map((index) =>
    [`${index.tablename}.${index.indexname}`, index.indexdef.toLowerCase()]
  ));
  const indexesReady = requiredIndexes.every(([table, name, fragments]) => {
    const definition = indexDefinitions.get(`${table}.${name}`);
    return definition && fragments.every((fragment) => definition.includes(fragment));
  });
  return columnsReady && constraintsReady && indexesReady;
}

const DRONE_WORKFLOW_TABLES = new Set(["farms", "drone_upload_batches", "drone_images"]);
const REQUIRED_INDEXES = [
  ["app_users", "app_users_mobile_unique", ["unique", "where (mobile_number is not null)"]],
  ["app_users", "app_users_farmer_id_unique", ["unique", "farmer_id"]],
  ["farms", "farms_owner_created_idx", ["owner_user_id", "created_at"]],
  ["drone_upload_batches", "drone_upload_batches_operator_created_idx", ["operator_user_id", "created_at"]],
  ["drone_upload_batches", "drone_upload_batches_farmer_created_idx", ["farmer_user_id", "created_at"]],
  ["drone_images", "drone_images_farmer_uploaded_idx", ["farmer_user_id", "uploaded_at"]],
  ["drone_images", "drone_images_farm_uploaded_idx", ["farm_id", "uploaded_at"]],
];

module.exports = {
  applyMigrations,
  checkApplicationSchema,
  discoverMigrations,
  getMigrationStatus,
  REQUIRED_COLUMNS,
  REQUIRED_CONSTRAINTS,
  DRONE_WORKFLOW_COLUMNS,
  DRONE_WORKFLOW_CONSTRAINTS,
  REQUIRED_INDEXES,
  validateDatabaseUrl,
};
