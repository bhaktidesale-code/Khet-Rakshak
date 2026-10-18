require("dotenv").config();
const pool = require("../config/db");
const { getMigrationStatus, validateDatabaseUrl } = require("../services/migrations");

async function main() {
  validateDatabaseUrl();
  const status = await getMigrationStatus(pool);
  if (status.applied.length) {
    for (const migration of status.applied) console.log(`APPLIED  ${migration.filename}`);
  }
  if (status.pending.length) {
    for (const migration of status.pending) console.log(`PENDING  ${migration.filename}`);
  }
  if (status.unknownApplied.length) {
    for (const migration of status.unknownApplied) console.log(`UNKNOWN  ${migration.version}_${migration.name}`);
  }
  if (!status.pending.length && !status.unknownApplied.length) console.log("All known migrations are applied.");
}

main()
  .catch((error) => {
    console.error(`Unable to read migration status: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
