const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const sharp = require("sharp");
const { createCropAnalysisRouter } = require("../routes/cropAnalysisRoutes");
const app = require("../server");
const {
  CropImageError,
  MAX_IMAGE_BYTES,
  createAnalysis,
  getAnalysis,
  inspectImage,
  listCropImages,
} = require("../services/cropAnalysis");

const sampleDirectory = path.join(__dirname, "..", "..", "Frontend", "public", "crop-demo");
const pngPixel = sharp({
  create: { width: 4, height: 4, channels: 3, background: "#4c8c4a" },
}).png().toBuffer();

test("catalog lists the 21 bundled samples without asserting disease or verified crop labels", () => {
  const samples = listCropImages();
  assert.equal(samples.length, 21);
  assert.equal(new Set(samples.map((sample) => sample.filename)).size, 21);
  assert.equal(samples.every((sample) => sample.cropType === null), true);
  assert.equal(samples.filter((sample) => sample.cropHint === "cotton").length, 10);
  assert.equal(samples.filter((sample) => sample.cropHint === "turmeric").length, 9);
  assert.equal(samples.filter((sample) => sample.cropHint === null).length, 2);
});

test("mounted public image catalogue endpoint returns the sample inventory", async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/crop-images`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).samples.length, 21);
});

test("short-lived analysis results expire", async () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const analysis = await createAnalysis({
    file: { buffer: await pngPixel, originalname: "temporary.png" },
    cropType: "unknown",
    cropTypeSource: "unknown",
    userId: "farmer-expiration",
    now: createdAt,
  });
  assert.equal(getAnalysis(analysis.id, "farmer-expiration", createdAt.getTime() + 1000).id, analysis.id);
  assert.equal(getAnalysis(analysis.id, "farmer-expiration", createdAt.getTime() + 15 * 60 * 1000 + 1), null);
});

test("all 21 dataset samples decode as supported JPEGs", async () => {
  const samples = listCropImages();
  const frontendCatalog = fs.readFileSync(
    path.join(__dirname, "..", "..", "Frontend", "src", "data", "cropImageCatalog.ts"),
    "utf8"
  );
  const frontendFilenameList = frontendCatalog.match(/const filenames = \[([\s\S]*?)\];/)[1];
  const frontendFilenames = [...frontendFilenameList.matchAll(/'([^']+\.jpeg)'/g)].map((match) => match[1]);
  assert.deepEqual(frontendFilenames, samples.map((sample) => sample.filename));

  for (const sample of samples) {
    const buffer = fs.readFileSync(path.join(sampleDirectory, sample.filename));
    const image = await inspectImage({ buffer, originalname: sample.filename });
    assert.equal(image.format, "jpeg", sample.filename);
    assert.ok(image.width > 0 && image.height > 0, sample.filename);
    assert.equal(image.qualityStatus, "readable", sample.filename);
  }
});

test("invalid image bytes and unsupported formats are rejected", async () => {
  await assert.rejects(
    inspectImage({ buffer: Buffer.from("not an image"), originalname: "broken.jpeg" }),
    (error) => error instanceof CropImageError && error.statusCode === 400
  );
  await assert.rejects(
    inspectImage({
      buffer: await sharp({
        create: { width: 4, height: 4, channels: 3, background: "#4c8c4a" },
      }).tiff().toBuffer(),
      originalname: "image.tiff",
    }),
    (error) => error instanceof CropImageError && error.statusCode === 415
  );
});

test("analysis reports image readability and model unavailability without inventing a prediction", async () => {
  const analysis = await createAnalysis({
    file: { buffer: await pngPixel, originalname: "pixel.png" },
    cropType: "cotton",
    cropTypeSource: "user_selected",
    userId: "farmer-1",
  });
  assert.equal(analysis.analysisStatus, "model_unavailable");
  assert.equal(analysis.resultType, "image_quality_only");
  assert.equal(analysis.prediction, null);
  assert.equal(analysis.confidence, null);
  assert.equal(analysis.model, null);
  assert.equal(analysis.image.format, "png");
  assert.equal(getAnalysis(analysis.id, "farmer-1").id, analysis.id);
  assert.equal(getAnalysis(analysis.id, "farmer-2"), null);
});

test("unsupported crop selection returns an explicit unsupported status", async () => {
  const analysis = await createAnalysis({
    file: { buffer: await pngPixel, originalname: "other-crop.png" },
    cropType: "other",
    cropTypeSource: "user_selected",
    userId: "farmer-1",
  });
  assert.equal(analysis.analysisStatus, "unsupported_crop");
  assert.equal(analysis.prediction, null);
});

test("crop type values and sources are validated rather than inferred from arbitrary filenames", async () => {
  await assert.rejects(
    createAnalysis({
      file: { buffer: await pngPixel, originalname: "Cotton_1.jpeg" },
      cropType: "cotton",
      cropTypeSource: "unknown",
      userId: "farmer-1",
    }),
    (error) => error instanceof CropImageError && /source/i.test(error.message)
  );
});

test("image size limit is enforced before decoding", async () => {
  await assert.rejects(
    inspectImage({ buffer: Buffer.alloc(MAX_IMAGE_BYTES + 1), originalname: "large.jpeg" }),
    (error) => error instanceof CropImageError && error.statusCode === 413
  );
});

test("decoded image pixel limit is enforced explicitly", async () => {
  const oversizedPixels = await sharp({
    create: { width: 5000, height: 4000, channels: 3, background: "#ffffff" },
  }).png().toBuffer();
  await assert.rejects(
    inspectImage({ buffer: oversizedPixels, originalname: "large-dimensions.png" }),
    (error) => error instanceof CropImageError && error.statusCode === 413 && /16-megapixel/i.test(error.message)
  );
});

function createTestServer({ analyze } = {}) {
  const app = express();
  const authenticate = (req, res, next) => {
    const token = req.get("authorization");
    if (!token) return res.status(401).json({ message: "Authentication is required." });
    const role = token === "Bearer admin" ? "ADMIN" : "FARMER";
    req.user = { id: token === "Bearer other-farmer" ? "farmer-2" : "farmer-1", role };
    return next();
  };
  app.use("/api", createCropAnalysisRouter({ authenticate, analyze }));
  app.use((error, _req, res, _next) => res.status(500).json({ message: "Test server error." }));
  const server = app.listen(0);
  return new Promise((resolve) => {
    server.once("listening", () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

test("crop endpoints enforce farmer access and return only the owner's temporary result", async (context) => {
  const server = await createTestServer();
  context.after(() => server.close());

  const catalogueResponse = await fetch(`${server.baseUrl}/api/crop-images`);
  assert.equal(catalogueResponse.status, 200);
  assert.equal((await catalogueResponse.json()).samples.length, 21);

  const unauthenticated = await fetch(`${server.baseUrl}/api/crop-analysis`, { method: "POST" });
  assert.equal(unauthenticated.status, 401);
  const unauthorized = await fetch(`${server.baseUrl}/api/crop-analysis`, {
    method: "POST",
    headers: { Authorization: "Bearer admin" },
  });
  assert.equal(unauthorized.status, 403);

  const form = new FormData();
  form.append("image", new Blob([await pngPixel], { type: "image/png" }), "sample.png");
  form.append("cropType", "unknown");
  form.append("cropTypeSource", "unknown");
  const submitted = await fetch(`${server.baseUrl}/api/crop-analysis`, {
    method: "POST",
    headers: { Authorization: "Bearer farmer" },
    body: form,
  });
  assert.equal(submitted.status, 200);
  const { analysis } = await submitted.json();

  const retrieved = await fetch(`${server.baseUrl}/api/crop-analysis/${analysis.id}`, {
    headers: { Authorization: "Bearer farmer" },
  });
  assert.equal(retrieved.status, 200);
  assert.equal((await retrieved.json()).analysis.id, analysis.id);

  const guestRead = await fetch(`${server.baseUrl}/api/crop-analysis/${analysis.id}`);
  assert.equal(guestRead.status, 401);

  const otherFarmer = await fetch(`${server.baseUrl}/api/crop-analysis/${analysis.id}`, {
    headers: { Authorization: "Bearer other-farmer" },
  });
  assert.equal(otherFarmer.status, 404);
});

test("multipart endpoint rejects absent and malformed image uploads with client errors", async (context) => {
  const server = await createTestServer();
  context.after(() => server.close());
  const headers = { Authorization: "Bearer farmer" };

  const missing = await fetch(`${server.baseUrl}/api/crop-analysis`, {
    method: "POST",
    headers,
    body: new FormData(),
  });
  assert.equal(missing.status, 400);

  const form = new FormData();
  form.append("image", new Blob(["not image"], { type: "image/jpeg" }), "broken.jpg");
  form.append("cropType", "unknown");
  form.append("cropTypeSource", "unknown");
  const malformed = await fetch(`${server.baseUrl}/api/crop-analysis`, {
    method: "POST",
    headers,
    body: form,
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).message, /readable image/i);
});

test("analysis endpoint converts oversized uploads into an explicit payload error", async (context) => {
  const server = await createTestServer();
  context.after(() => server.close());
  const form = new FormData();
  form.append("image", new Blob([Buffer.alloc(MAX_IMAGE_BYTES + 1)], { type: "image/jpeg" }), "large.jpg");
  form.append("cropType", "unknown");
  form.append("cropTypeSource", "unknown");
  const response = await fetch(`${server.baseUrl}/api/crop-analysis`, {
    method: "POST",
    headers: { Authorization: "Bearer farmer" },
    body: form,
  });
  assert.equal(response.status, 413);
  assert.match((await response.json()).message, /8 MB/i);
});

test("unexpected analysis service errors are forwarded without returning success-shaped results", async (context) => {
  const server = await createTestServer({
    analyze: async () => { throw new Error("private processing detail"); },
  });
  context.after(() => server.close());
  const form = new FormData();
  form.append("image", new Blob([await pngPixel], { type: "image/png" }), "sample.png");
  form.append("cropType", "unknown");
  form.append("cropTypeSource", "unknown");
  const response = await fetch(`${server.baseUrl}/api/crop-analysis`, {
    method: "POST",
    headers: { Authorization: "Bearer farmer" },
    body: form,
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: "Test server error." });
});
