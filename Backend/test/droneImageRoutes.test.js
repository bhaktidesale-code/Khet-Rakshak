const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const sharp = require("sharp");
const { createDroneImageRouter, extractExifMetadata, parseExifCoordinate } = require("../routes/droneImageRoutes");

const farmerId = "KR-AAAAAAAAAAAAAAAA";
const farmId = "f0f0f0f0-1111-4111-8111-111111111111";
const batchId = "b0b0b0b0-2222-4222-8222-222222222222";
const clientImageId = "c0c0c0c0-3333-4333-8333-333333333333";

function createServer({ role = "DRONE_PILOT", database, storage } = {}) {
  const app = express();
  const authenticate = (req, res, next) => {
    if (!req.get("authorization")) return res.status(401).json({ message: "Authentication is required." });
    req.user = { id: role === "FARMER" ? "10" : "20", role };
    return next();
  };
  app.use("/api", createDroneImageRouter({ authenticate, database, storage }));
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  });
  const server = app.listen(0);
  return new Promise((resolve) => {
    server.once("listening", () => resolve({
      baseUrl: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise((done) => server.close(() => done())),
    }));
  });
}

function authHeaders() {
  return { Authorization: "Bearer test-token" };
}

function createDatabase({ imageCount = 0, wrongFarm = false, failImageInsert = false } = {}) {
  const calls = [];
  let savedImageCount = imageCount;
  let savedImage = null;
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes("FROM public.app_users") && sql.includes("farmer_id")) {
        return { rowCount: 1, rows: [{ id: "10", farmer_id: farmerId, full_name: "Test Farmer", village: "Test Village" }] };
      }
      if (sql.includes("FROM public.farms") && sql.includes("WHERE id = $1 AND owner_user_id = $2")) {
        if (wrongFarm) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [{ id: farmId, name: "North Plot" }] };
      }
      if (sql.includes("FROM public.farms WHERE owner_user_id = $1")) {
        return { rowCount: 1, rows: [{ id: farmId, name: "North Plot", location: "Test Village", crop: "Cotton", area_acres: 2 }] };
      }
      if (sql.includes("FROM public.drone_upload_batches WHERE id = $1")) {
        return { rowCount: 1, rows: [{
          id: batchId,
          farmer_user_id: "10",
          farm_id: farmId,
          operator_user_id: "20",
          expected_image_count: 1,
        }] };
      }
      if (sql.includes("FROM public.drone_images") && sql.includes("client_image_id = $2") && sql.includes("sha256")) {
        return savedImage
          ? { rowCount: 1, rows: [{ id: savedImage.id, sha256: savedImage.sha256 }] }
          : { rowCount: 0, rows: [] };
      }
      if (sql.includes("INSERT INTO public.drone_images")) {
        if (failImageInsert) throw new Error("database insert failed");
        savedImage = {
          id: "d0d0d0d0-4444-4444-8444-444444444444",
          sha256: params[9],
        };
        savedImageCount += 1;
        return { rowCount: 1, rows: [{ id: savedImage.id }] };
      }
      if (sql.includes("COUNT(*)::int AS uploaded_count")) return { rowCount: 1, rows: [{ uploaded_count: savedImageCount }] };
      if (sql.includes("SELECT storage_key FROM public.drone_images WHERE id = $1 AND farmer_user_id = $2")) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("INSERT INTO public.drone_upload_batches")) return { rowCount: 1, rows: [] };
      if (sql.includes("UPDATE public.drone_upload_batches")) return { rowCount: 1, rows: [] };
      if (sql.includes("SELECT storage_key FROM public.drone_images")) return { rowCount: 0, rows: [] };
      if (sql.includes("FROM public.drone_images i")) return { rowCount: 0, rows: [] };
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };
}

function storageService(overrides = {}) {
  return {
    getStorageConfiguration: () => ({ bucket: "private-test-bucket" }),
    uploadPrivateImage: async () => {},
    deletePrivateImage: async () => {},
    createPrivateImageUrl: async () => "https://storage.invalid/signed-test",
    ...overrides,
  };
}

function uploadForm(buffer, mimeType = "image/jpeg", expectedImageCount = "1") {
  const form = new FormData();
  form.append("farmerId", farmerId);
  form.append("farmId", farmId);
  form.append("batchId", batchId);
  form.append("expectedImageCount", expectedImageCount);
  form.append("imageIds", clientImageId);
  form.append("images", new Blob([buffer], { type: mimeType }), "field.jpg");
  return form;
}

test("operator-only and farmer-only routes reject missing or wrong roles", async (context) => {
  const server = await createServer({ database: createDatabase(), storage: storageService() });
  context.after(() => server.close());

  const noToken = await fetch(`${server.baseUrl}/api/operator/farmers/${farmerId}`);
  assert.equal(noToken.status, 401);

  const farmerSession = await createServer({ role: "FARMER", database: createDatabase(), storage: storageService() });
  context.after(() => farmerSession.close());
  const deniedOperator = await fetch(`${farmerSession.baseUrl}/api/operator/farmers/${farmerId}`, { headers: authHeaders() });
  assert.equal(deniedOperator.status, 403);

  const operatorSession = await createServer({ database: createDatabase(), storage: storageService() });
  context.after(() => operatorSession.close());
  const deniedFarmer = await fetch(`${operatorSession.baseUrl}/api/farmer/drone-images`, { headers: authHeaders() });
  assert.equal(deniedFarmer.status, 403);
});

test("farmer lookup returns verified fields and farm records without exposing contact data", async (context) => {
  const database = createDatabase();
  const server = await createServer({ database, storage: storageService() });
  context.after(() => server.close());
  const response = await fetch(`${server.baseUrl}/api/operator/farmers/${farmerId}`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.farmer, {
    farmerId,
    fullName: "Test Farmer",
    village: "Test Village",
    farms: [{ id: farmId, name: "North Plot", location: "Test Village", crop: "Cotton", areaAcres: 2 }],
  });
  assert.equal(JSON.stringify(result).includes("mobile"), false);
  assert.equal(database.calls.length, 2);
});

test("unreadable images are rejected and supported JPEG uploads persist private metadata", async (context) => {
  const database = createDatabase();
  let uploaded;
  const storage = storageService({
    uploadPrivateImage: async (image) => { uploaded = image; },
  });
  const server = await createServer({ database, storage });
  context.after(() => server.close());

  const badImage = await fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(Buffer.from("not a JPEG")),
  });
  assert.equal(badImage.status, 200, await badImage.clone().text());
  const badImageResult = await badImage.json();
  assert.equal(badImageResult.results[0].status, "failed");
  assert.match(badImageResult.results[0].message, /readable image/i);
  assert.equal(uploaded, undefined);

  const unsupported = await fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(Buffer.from("not JPEG"), "image/gif"),
  });
  assert.equal(unsupported.status, 415);

  database.calls.length = 0;
  const jpeg = await sharp({
    create: { width: 8, height: 6, channels: 3, background: "#4c8c4a" },
  }).jpeg().toBuffer();
  const response = await fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(jpeg),
  });
  assert.equal(response.status, 200, await response.clone().text());
  const result = await response.json();
  assert.equal(result.status, "COMPLETED", JSON.stringify(result));
  assert.equal(result.results[0].status, "uploaded");
  assert.deepEqual(uploaded.buffer, jpeg);
  assert.match(uploaded.storageKey, /^farmer\/KR-AAAAAAAAAAAAAAAA\//);
  assert.match(uploaded.storageKey, /\/f0f0f0f0-1111-4111-8111-111111111111\//);
  const persistedImage = database.calls.find((call) => call.sql.includes("INSERT INTO public.drone_images"));
  assert.equal(persistedImage.params[12], null);
  assert.equal(persistedImage.params[13], null);
  assert.equal(persistedImage.params[14], null);
});

test("storage configuration failures stop before creating upload history", async (context) => {
  const database = createDatabase();
  const storage = storageService({
    getStorageConfiguration() {
      throw Object.assign(new Error("Private image storage is not configured."), { statusCode: 503 });
    },
  });
  const server = await createServer({ database, storage });
  context.after(() => server.close());
  const jpeg = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "#4c8c4a" },
  }).jpeg().toBuffer();
  const response = await fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(jpeg),
  });
  assert.equal(response.status, 503, await response.clone().text());
  assert.match((await response.json()).message, /storage is not configured/i);
  assert.equal(database.calls.some((call) => call.sql.includes("INSERT INTO public.drone_upload_batches")), false);
});

test("operators cannot upload to a field that does not belong to the verified farmer", async (context) => {
  const database = createDatabase({ wrongFarm: true });
  let storageUploadCalled = false;
  const storage = storageService({
    uploadPrivateImage: async () => { storageUploadCalled = true; },
  });
  const server = await createServer({ database, storage });
  context.after(() => server.close());
  const response = await fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(Buffer.from("not decoded"), "image/jpeg"),
  });
  assert.equal(response.status, 404);
  assert.match((await response.json()).message, /does not belong/i);
  assert.equal(storageUploadCalled, false);
  assert.equal(database.calls.some((call) => call.sql.includes("INSERT INTO public.drone_upload_batches")), false);
});

test("retries of the same image are idempotent and do not upload duplicate files", async (context) => {
  const database = createDatabase();
  let uploadCount = 0;
  const storage = storageService({
    uploadPrivateImage: async () => { uploadCount += 1; },
  });
  const server = await createServer({ database, storage });
  context.after(() => server.close());
  const jpeg = await sharp({
    create: { width: 6, height: 6, channels: 3, background: "#4c8c4a" },
  }).jpeg().toBuffer();
  const post = () => fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(jpeg),
  });
  const first = await post();
  const second = await post();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).results[0].status, "uploaded");
  assert.equal((await second.json()).results[0].status, "uploaded");
  assert.equal(uploadCount, 1);
});

test("storage and database failures return partial status and clean up unrecorded files", async (context) => {
  const jpeg = await sharp({
    create: { width: 6, height: 6, channels: 3, background: "#4c8c4a" },
  }).jpeg().toBuffer();
  const storageFailureDb = createDatabase();
  const storageFailureServer = await createServer({
    database: storageFailureDb,
    storage: storageService({
      uploadPrivateImage: async () => { throw Object.assign(new Error("storage unavailable"), { code: "storage_unavailable" }); },
    }),
  });
  context.after(() => storageFailureServer.close());
  const storageFailure = await fetch(`${storageFailureServer.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(jpeg),
  });
  assert.equal(storageFailure.status, 200);
  const storageFailureResult = await storageFailure.json();
  assert.equal(storageFailureResult.status, "PARTIAL");
  assert.equal(storageFailureResult.results[0].status, "failed");

  const databaseFailureDb = createDatabase({ failImageInsert: true });
  let deleteCount = 0;
  const databaseFailureServer = await createServer({
    database: databaseFailureDb,
    storage: storageService({
      deletePrivateImage: async () => { deleteCount += 1; },
    }),
  });
  context.after(() => databaseFailureServer.close());
  const databaseFailure = await fetch(`${databaseFailureServer.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(jpeg),
  });
  assert.equal(databaseFailure.status, 200);
  const databaseFailureResult = await databaseFailure.json();
  assert.equal(databaseFailureResult.status, "PARTIAL");
  assert.equal(databaseFailureResult.results[0].status, "failed");
  assert.equal(deleteCount, 1);
});

test("upload count must be an integer that includes the submitted image", async (context) => {
  const database = createDatabase();
  const server = await createServer({ database, storage: storageService() });
  context.after(() => server.close());
  const response = await fetch(`${server.baseUrl}/api/operator/drone-uploads`, {
    method: "POST",
    headers: authHeaders(),
    body: uploadForm(Buffer.from("not an image"), "image/jpeg", "1.5"),
  });
  assert.equal(response.status, 400);
  assert.equal(database.calls.length, 0);
});

test("farmer image URLs are owner-scoped and unknown images stay unavailable", async (context) => {
  const database = createDatabase();
  const server = await createServer({ role: "FARMER", database, storage: storageService() });
  context.after(() => server.close());
  const imageId = "d0d0d0d0-4444-4444-8444-444444444444";
  const response = await fetch(`${server.baseUrl}/api/farmer/drone-images/${imageId}/url`, {
    headers: authHeaders(),
  });
  assert.equal(response.status, 404);
  const lookup = database.calls.find((call) => call.sql.includes("farmer_user_id = $2"));
  assert.deepEqual(lookup.params, [imageId, "10"]);
});

test("EXIF coordinates are range-checked and absent or malformed metadata remains null", async () => {
  assert.equal(parseExifCoordinate([[19, 1], [4, 1], [30, 1]], "N", "N"), 19 + 4 / 60 + 30 / 3600);
  assert.equal(parseExifCoordinate([[19, 1], [4, 1], [30, 1]], "S", "N"), -(19 + 4 / 60 + 30 / 3600));
  assert.equal(parseExifCoordinate([[91, 1], [0, 1], [0, 1]], "N", "N"), null);
  assert.deepEqual(extractExifMetadata(Buffer.from("not an image"), "jpeg"), { capturedAt: null, gps: null });
});
