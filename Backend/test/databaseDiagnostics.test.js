const test = require("node:test");
const assert = require("node:assert/strict");
const { getSafeDatabaseErrorDetails } = require("../services/databaseDiagnostics");

test("undefined-relation diagnostics include the relation and schema without raw error details", () => {
  const details = getSafeDatabaseErrorDetails(Object.assign(
    new Error('relation "public.app_users" does not exist'),
    {
      code: "42P01",
      schema: "public",
      detail: "sensitive row data must not be logged",
    }
  ));

  assert.deepEqual(details, {
    databaseMessage: 'relation "public.app_users" does not exist',
    databaseRelation: "public.app_users",
    databaseSchema: "public",
  });
  assert.equal(JSON.stringify(details).includes("sensitive row data"), false);
});

test("database diagnostics omit arbitrary messages and all details for unrelated errors", () => {
  const undefinedRelation = getSafeDatabaseErrorDetails(Object.assign(
    new Error("connection string and user data must not be logged"),
    { code: "42P01" }
  ));
  assert.deepEqual(undefinedRelation, { databaseMessage: "relation does not exist" });

  const unrelated = getSafeDatabaseErrorDetails(Object.assign(
    new Error("private detail"),
    { code: "23505", schema: "public", table: "app_users" }
  ));
  assert.deepEqual(unrelated, {});
});
