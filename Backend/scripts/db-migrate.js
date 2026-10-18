require("dotenv").config();
const pool = require("../config/db");
const { applyMigrations, validateDatabaseUrl } = require("../services/migrations");

async function main() {
  validateDatabaseUrl();
  const result = await applyMigrations(pool);
  if (!result.applied.length) {
    console.log("Database schema is up to date; no migrations were applied.");
    return;
  }
  for (const migration of result.applied) console.log(`Applied migration ${migration.filename}.`);
  console.log(`Successfully applied ${result.applied.length} migration(s).`);
}

main()
  .catch((error) => {
    console.error(`Database migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
