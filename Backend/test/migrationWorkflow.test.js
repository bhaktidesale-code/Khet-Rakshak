const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertTargetConfirmation,
  classifyProvider,
  getTargetConfirmation,
  getTargetFingerprint,
  validateMigrationTarget,
} = require("../scripts/db-migrate-confirmed");

test("confirmed migration only accepts recognized provider categories", () => {
  assert.equal(classifyProvider("db.project.supabase.co"), "Supabase");
  assert.equal(classifyProvider("aws-0.pooler.supabase.com"), "Supabase");
  assert.equal(classifyProvider("database.example.render.com"), "Render PostgreSQL");
  assert.equal(classifyProvider("database.example.invalid"), null);
});

test("target fingerprint distinguishes databases without exposing hostname or credentials", () => {
  const url = "postgres://operator:private-password@db.project.supabase.co:5432/postgres";
  const fingerprint = getTargetFingerprint(url);
  assert.match(fingerprint, /^[a-f0-9]{12}$/);
  assert.notEqual(
    getTargetFingerprint("postgres://operator:private-password@db.project.supabase.co:5432/other"),
    fingerprint
  );
  assert.equal(fingerprint.includes("private-password"), false);
  assert.equal(fingerprint.includes("supabase"), false);
});

test("migration requires an exact explicit target confirmation", () => {
  const expected = getTargetConfirmation("postgres", "012345abcdef");
  assert.equal(expected, "MIGRATE postgres 012345abcdef");
  assert.doesNotThrow(() => assertTargetConfirmation(expected, "postgres", "012345abcdef"));
  assert.throws(
    () => assertTargetConfirmation("yes", "postgres", "012345abcdef"),
    /no migration was run/
  );
});

test("remote migration requires a recognized provider and validated TLS", () => {
  const url = "postgres://user:private-password@db.project.supabase.co:5432/postgres";
  assert.equal(validateMigrationTarget(url, "true", "true"), "Supabase");
  assert.throws(() => validateMigrationTarget(url, "false", "true"), /DATABASE_SSL=true/);
  assert.throws(() => validateMigrationTarget(url, "true", "false"), /certificate validation disabled/);
  assert.throws(
    () => validateMigrationTarget("postgres://user:password@db.example.invalid:5432/postgres", "true", "true"),
    /provider is not recognized/
  );
});
