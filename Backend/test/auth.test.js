const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createAuthenticationMiddleware, requireRole } = require("../middleware/auth");
const app = require("../server");

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("unauthenticated requests are rejected before a protected handler", async () => {
  const authenticate = createAuthenticationMiddleware();
  const response = responseRecorder();
  let advanced = false;
  await authenticate({ get: () => undefined }, response, () => { advanced = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(advanced, false);
});

test("verified Firebase identity is loaded from the database, not request role data", async () => {
  const authenticate = createAuthenticationMiddleware({
    firebaseAuth: () => ({ verifyIdToken: async () => ({ uid: "firebase-1" }) }),
    database: {
      query: async (sql, params) => {
        assert.match(sql, /INSERT INTO public\.app_users AS app_user/);
        assert.match(sql, /app_user\.email/);
        assert.deepEqual(params, ["firebase-1", null, "", null]);
        return { rows: [{
          id: 7, firebase_uid: "firebase-1", role: "FARMER", account_status: "ACTIVE",
        }] };
      },
    },
  });
  const request = { get: () => "Bearer valid-provider-token", body: { role: "ADMIN" } };
  const response = responseRecorder();
  let advanced = false;
  await authenticate(request, response, () => { advanced = true; });
  assert.equal(advanced, true);
  assert.equal(request.user.role, "FARMER");
});

test("auth upsert columns are supplied by the additive schema migration", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "..", "migrations", "002_ensure_auth_tables.sql"),
    "utf8"
  );
  for (const column of [
    "firebase_uid",
    "email",
    "full_name",
    "mobile_number",
    "village",
    "role",
    "account_status",
    "updated_at",
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`));
  }
});

test("role middleware denies farmer access to administrator resources", () => {
  const response = responseRecorder();
  let advanced = false;
  requireRole("ADMIN")(
    { user: { role: "FARMER" } },
    response,
    () => { advanced = true; }
  );
  assert.equal(response.statusCode, 403);
  assert.equal(advanced, false);
});

test("drone pilots cannot access farmer or administrator resources", () => {
  for (const role of ["DRONE_PILOT", "OUTLET_MANAGER"]) {
    const response = responseRecorder();
    let advanced = false;
    requireRole("FARMER", "ADMIN")(
      { user: { role } },
      response,
      () => { advanced = true; }
    );
    assert.equal(response.statusCode, 403);
    assert.equal(advanced, false);
  }
});

test("invalid Firebase tokens are rejected without querying or creating accounts", async () => {
  let databaseCalled = false;
  const authenticate = createAuthenticationMiddleware({
    firebaseAuth: () => ({
      verifyIdToken: async () => { throw Object.assign(new Error("invalid token"), { code: "auth/invalid-id-token" }); },
    }),
    database: { query: async () => { databaseCalled = true; } },
  });
  const response = responseRecorder();
  await authenticate({ get: () => "Bearer invalid-token" }, response, () => {});
  assert.equal(response.statusCode, 401);
  assert.equal(databaseCalled, false);
});

test("Firebase token verification outages are tagged and forwarded as server errors", async () => {
  const authenticate = createAuthenticationMiddleware({
    firebaseAuth: () => ({
      verifyIdToken: async () => {
        throw Object.assign(new Error("verification service unavailable"), { code: "auth/internal-error" });
      },
    }),
  });
  const request = { get: () => "******" };
  let forwarded;
  request.get = () => `${String.fromCharCode(66, 101, 97, 114, 101, 114)} verification-outage-token`;
  await authenticate(request, responseRecorder(), (error) => { forwarded = error; });
  assert.equal(request.authFailureStage, "firebase-token-verification");
  assert.equal(forwarded.code, "auth/internal-error");
});

test("Firebase Admin initialization failures are tagged for safe server diagnostics", async () => {
  const authenticate = createAuthenticationMiddleware({
    firebaseAuth: () => { throw Object.assign(new Error("private credential detail"), { code: "app/invalid-credential" }); },
  });
  const request = { get: () => "Bearer token-value" };
  let forwarded;
  await authenticate(request, responseRecorder(), (error) => { forwarded = error; });
  assert.equal(request.authFailureStage, "firebase-admin-initialization");
  assert.equal(forwarded.code, "app/invalid-credential");
});

test("database upsert failures are tagged after token verification", async () => {
  const authenticate = createAuthenticationMiddleware({
    firebaseAuth: () => ({ verifyIdToken: async () => ({ uid: "firebase-1" }) }),
    database: { query: async () => { throw Object.assign(new Error("database detail"), { code: "23502" }); } },
  });
  const request = { get: () => "Bearer token-value" };
  let forwarded;
  await authenticate(request, responseRecorder(), (error) => { forwarded = error; });
  assert.equal(request.authFailureStage, "app-user-upsert");
  assert.equal(forwarded.code, "23502");
});

test("role middleware permits the role assigned by the server", () => {
  const response = responseRecorder();
  let advanced = false;
  requireRole("ADMIN")(
    { user: { role: "ADMIN" } },
    response,
    () => { advanced = true; }
  );
  assert.equal(advanced, true);
});

test("protected API routes reject guests even when a role is submitted in the body", async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const requests = [
    { path: "/api/farmer/profile", method: "GET" },
    { path: "/api/operator/assignments", method: "GET" },
    { path: "/api/admin/health", method: "GET" },
    { path: "/api/auth/admin/users", method: "GET" },
    { path: "/api/auth/admin/role-requests", method: "GET" },
    { path: "/api/auth/admin/users/1/role", method: "PATCH", body: { role: "ADMIN" } },
    { path: "/api/auth/admin/role-requests/1", method: "PATCH", body: { status: "APPROVED" } },
  ];

  for (const request of requests) {
    const response = await fetch(`${baseUrl}${request.path}`, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
    assert.equal(response.status, 401, `${request.path} should reject a guest`);
  }
});

test("development CORS allows the local Vite origins but rejects unrelated origins", async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]) {
    const response = await fetch(`${baseUrl}/`, { headers: { Origin: origin } });
    assert.equal(response.status, 200, `${origin} should be allowed`);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }

  const rejected = await fetch(`${baseUrl}/`, {
    headers: { Origin: "http://untrusted.example" },
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("access-control-allow-origin"), null);
});

test("liveness and readiness health endpoints do not expose internal details", async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const liveness = await fetch(`${baseUrl}/health`);
  assert.equal(liveness.status, 200);
  assert.deepEqual(await liveness.json(), { success: true, status: "alive" });

  const configuredDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    const readiness = await fetch(`${baseUrl}/api/health`);
    assert.equal(readiness.status, 503);
    assert.deepEqual(await readiness.json(), {
      success: false,
      status: "not_ready",
      database: "not_configured",
    });
  } finally {
    if (configuredDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = configuredDatabaseUrl;
  }
});
