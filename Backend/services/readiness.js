const { checkApplicationSchema, getMigrationStatus } = require("./migrations");

async function getDatabaseReadiness(pool, {
  databaseUrl = process.env.DATABASE_URL,
  migrationsDir,
} = {}) {
  if (!databaseUrl) {
    return { httpStatus: 503, body: { success: false, status: "not_ready", database: "not_configured" } };
  }

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    return {
      httpStatus: 503,
      body: { success: false, status: "not_ready", database: "unavailable" },
      logCode: error.code || "unknown",
    };
  }

  try {
    const migrationStatus = await getMigrationStatus(pool, migrationsDir);
    if (migrationStatus.pending.length || migrationStatus.unknownApplied.length) {
      return {
        httpStatus: 503,
        body: { success: false, status: "not_ready", database: "connected", schema: "migration_required" },
      };
    }
    if (!await checkApplicationSchema(pool)) {
      return {
        httpStatus: 503,
        body: { success: false, status: "not_ready", database: "connected", schema: "invalid" },
      };
    }
    return {
      httpStatus: 200,
      body: { success: true, status: "ready", database: "connected", schema: "ready" },
    };
  } catch (error) {
    return {
      httpStatus: 503,
      body: { success: false, status: "not_ready", database: "connected", schema: "unavailable" },
      logCode: error.code || "unknown",
    };
  }
}

module.exports = { getDatabaseReadiness };
