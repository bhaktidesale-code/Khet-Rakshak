
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const caPath = path.join(__dirname, "prod-ca-2021.crt");

function getCaCertificate() {
  if (process.env.SUPABASE_CA_CERT) {
    return process.env.SUPABASE_CA_CERT.replace(/\\n/g, "\n");
  }

  return fs.readFileSync(caPath, "utf8");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? {
          ca: getCaCertificate(),
          rejectUnauthorized: true,
        }
      : undefined,
});

module.exports = pool;
