require("dotenv").config({ quiet: true });

const { createHash } = require("node:crypto");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const {
  applyMigrations,
  checkApplicationSchema,
  getMigrationStatus,
  validateDatabaseUrl,
} = require("../services/migrations");

function readHiddenValue(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("A secure interactive terminal is required to enter DATABASE_URL."));
      return;
    }

    const wasRaw = stdin.isRaw;
    let value = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw);
      stdout.write("\n");
    }

    function onData(chunk) {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " " && character <= "~") value += character;
      }
    }

    stdin.on("data", onData);
  });
}

function classifyProvider(hostname) {
  const normalizedHost = hostname.toLowerCase();
  if (normalizedHost.endsWith(".supabase.co") || normalizedHost.endsWith(".supabase.com")) {
    return "Supabase";
  }
  if (normalizedHost.endsWith(".render.com")) return "Render PostgreSQL";
  return null;
}

function validateMigrationTarget(databaseUrl, databaseSsl, rejectUnauthorized) {
  validateDatabaseUrl(databaseUrl);
  const parsedUrl = new URL(databaseUrl);
  const provider = classifyProvider(parsedUrl.hostname);
  if (!provider) {
    throw new Error("Database provider is not recognized; refusing to run a production migration.");
  }
  if (databaseSsl !== "true") {
    throw new Error("Set DATABASE_SSL=true for this remote database before running the migration.");
  }
  if (rejectUnauthorized === "false") {
    throw new Error("Refusing a database connection with TLS certificate validation disabled.");
  }
  return provider;
}

function getTargetFingerprint(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return createHash("sha256")
    .update(`${parsed.hostname.toLowerCase()}:${parsed.port}${parsed.pathname}`)
    .digest("hex")
    .slice(0, 12);
}

function getTargetConfirmation(databaseName, fingerprint) {
  return `MIGRATE ${databaseName} ${fingerprint}`;
}

function assertTargetConfirmation(answer, databaseName, fingerprint) {
  if (answer.trim() !== getTargetConfirmation(databaseName, fingerprint)) {
    throw new Error("Target confirmation did not match; no migration was run.");
  }
}

async function selectDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = await readHiddenValue("Enter DATABASE_URL (input hidden): ");
    return;
  }

  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(
      "Use DATABASE_URL from the environment or Backend/.env? [y/N] "
    );
    if (answer.trim().toLowerCase() !== "y") {
      process.env.DATABASE_URL = await readHiddenValue("Enter DATABASE_URL (input hidden): ");
    }
  } finally {
    prompt.close();
  }
}

function safeDatabaseErrorCode(error) {
  return error && typeof error.code === "string" && /^[a-z0-9_/-]{1,64}$/i.test(error.code)
    ? error.code
    : "unknown";
}

async function main() {
  await selectDatabaseUrl();
  const provider = validateMigrationTarget(
    process.env.DATABASE_URL,
    process.env.DATABASE_SSL,
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
  );

  const pool = require("../config/db");
  try {
    let target;
    try {
      target = await pool.query(
        "SELECT current_database() AS database_name, current_schema() AS schema_name"
      );
    } catch (error) {
      throw new Error(`Unable to inspect the target database (code ${safeDatabaseErrorCode(error)}).`);
    }

    const databaseName = target.rows[0] && target.rows[0].database_name;
    const schemaName = target.rows[0] && target.rows[0].schema_name;
    if (typeof databaseName !== "string" || !databaseName || typeof schemaName !== "string" || !schemaName) {
      throw new Error("The target database identity is incomplete; refusing to migrate.");
    }

    let status;
    let schemaReady;
    let existingSchemaReady;
    let missingRelations;
    try {
      status = await getMigrationStatus(pool);
      schemaReady = await checkApplicationSchema(pool);
      const relations = await pool.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [["app_users", "role_requests"]]
      );
      const existingRelations = new Set(relations.rows.map((row) => row.table_name));
      missingRelations = ["app_users", "role_requests"]
        .filter((relation) => !existingRelations.has(relation));
      existingSchemaReady = await checkApplicationSchema(pool, {
        skipTables: missingRelations,
        skipDroneWorkflow: status.pending.some((migration) => migration.name === "drone_image_workflow"),
      });
      if (missingRelations.length) {
        const otherSchemaRelations = await pool.query(
          `SELECT c.relname AS table_name
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname <> 'public'
             AND c.relname = ANY($1::text[])
             AND c.relkind IN ('r', 'p', 'v', 'm', 'f')`,
          [missingRelations]
        );
        if (otherSchemaRelations.rows.length) {
          throw new Error("Authentication tables exist outside public; refusing to create duplicate tables.");
        }
      }
    } catch (error) {
      if (error.message === "Authentication tables exist outside public; refusing to create duplicate tables.") {
        throw error;
      }
      throw new Error(`Unable to inspect migration state (code ${safeDatabaseErrorCode(error)}).`);
    }
    if (status.unknownApplied.length) {
      throw new Error("Migration history contains unknown applied versions; refusing to migrate.");
    }
    const fingerprint = getTargetFingerprint(process.env.DATABASE_URL);

    console.log("Migration target (no connection URL or hostname is displayed):");
    console.log(`  Provider: ${provider}`);
    console.log(`  Database: ${databaseName}`);
    console.log(`  Current schema: ${schemaName}`);
    console.log(`  Target fingerprint: ${fingerprint}`);
    for (const migration of status.applied) console.log(`  APPLIED  ${migration.filename}`);
    for (const migration of status.pending) console.log(`  PENDING  ${migration.filename}`);
    if (missingRelations.length) console.log(`  Missing public tables: ${missingRelations.join(", ")}`);

    if (!status.pending.length) {
      if (!schemaReady) {
        throw new Error("No migration is pending, but the application schema is invalid; refusing to alter it.");
      }
      console.log("Database is ready; no migration is pending.");
      return;
    }
    if (!existingSchemaReady) {
      throw new Error("Existing application tables do not match the expected schema; refusing to alter them.");
    }

    const confirmation = getTargetConfirmation(databaseName, fingerprint);
    console.log("Compare this target with the production database configured for the Render service.");
    console.log(`To apply the listed migrations, type exactly: ${confirmation}`);

    const prompt = readline.createInterface({ input: stdin, output: stdout });
    let answer;
    try {
      answer = await prompt.question("> ");
    } finally {
      prompt.close();
    }
    assertTargetConfirmation(answer, databaseName, fingerprint);

    let applied;
    try {
      applied = await applyMigrations(pool);
    } catch (error) {
      if (error.message && /^Migration [0-9]+_[a-z0-9_-]+\.sql failed; its transaction was rolled back\.$/i.test(error.message)) {
        throw error;
      }
      throw new Error(`Migration runner failed (code ${safeDatabaseErrorCode(error)}); inspect status before retrying.`);
    }
    for (const migration of applied.applied) console.log(`Applied ${migration.filename}.`);

    let finalStatus;
    let finalSchemaReady;
    try {
      finalStatus = await getMigrationStatus(pool);
      finalSchemaReady = await checkApplicationSchema(pool);
    } catch (error) {
      throw new Error(`Unable to verify migration results (code ${safeDatabaseErrorCode(error)}).`);
    }
    if (finalStatus.pending.length || finalStatus.unknownApplied.length) {
      throw new Error("Post-migration status is incomplete; review the database before retrying.");
    }
    if (!finalSchemaReady) {
      throw new Error("Migrations completed, but the application schema is still invalid.");
    }
    console.log("Migration status and application schema verified.");
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Confirmed migration stopped: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  classifyProvider,
  assertTargetConfirmation,
  getTargetConfirmation,
  getTargetFingerprint,
  readHiddenValue,
  selectDatabaseUrl,
  validateMigrationTarget,
};
