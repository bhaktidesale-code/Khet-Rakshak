const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const sharp = require("sharp");
const ExifParser = require("exif-parser");
const pool = require("../config/db");
const { createAuthenticationMiddleware, requireRole } = require("../middleware/auth");
const {
  createPrivateImageUrl,
  deletePrivateImage,
  getStorageConfiguration,
  uploadPrivateImage,
} = require("../services/privateStorage");

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_COUNT = 8;
const FARMER_ID_PATTERN = /^KR-[0-9A-F]{16}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createDroneImageRouter({
  database = pool,
  authenticate = createAuthenticationMiddleware(),
  authorizeOperator = requireRole("DRONE_PILOT", "ADMIN"),
  authorizeFarmer = requireRole("FARMER"),
  storage = { uploadPrivateImage, deletePrivateImage, createPrivateImageUrl, getStorageConfiguration },
} = {}) {
  const router = express.Router();
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_IMAGE_BYTES,
      files: MAX_IMAGE_COUNT,
      fields: MAX_IMAGE_COUNT + 4,
      fieldSize: 256,
      parts: MAX_IMAGE_COUNT * 2 + 4,
    },
    fileFilter(_req, file, callback) {
      if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
        callback(new Error("Unsupported image type."));
        return;
      }
      callback(null, true);
    },
  });

  router.get(
    "/operator/farmers/:farmerId",
    authenticate,
    authorizeOperator,
    async (req, res, next) => {
      const farmerId = String(req.params.farmerId || "").trim().toUpperCase();
      if (!FARMER_ID_PATTERN.test(farmerId)) {
        return res.status(400).json({ message: "Enter a valid Farmer ID." });
      }
      try {
        const result = await database.query(
          `SELECT u.id::text AS id, u.farmer_id, u.full_name, u.village
           FROM public.app_users u
           WHERE u.farmer_id = $1 AND u.role = 'FARMER' AND u.account_status = 'ACTIVE'`,
          [farmerId]
        );
        if (!result.rowCount) return res.status(404).json({ message: "No active farmer was found for that Farmer ID." });
        const farmer = result.rows[0];
        const farms = await database.query(
          `SELECT id::text AS id, name, location, crop, area_acres::float8 AS area_acres
           FROM public.farms WHERE owner_user_id = $1 ORDER BY created_at DESC`,
          [farmer.id]
        );
        return res.json({
          farmer: {
            farmerId: farmer.farmer_id,
            fullName: farmer.full_name,
            village: farmer.village,
            farms: farms.rows.map(toPublicFarm),
          },
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.get("/farmer/farms", authenticate, authorizeFarmer, async (req, res, next) => {
    try {
      const result = await database.query(
        `SELECT id::text AS id, name, location, crop, area_acres::float8 AS area_acres
         FROM public.farms WHERE owner_user_id = $1 ORDER BY created_at DESC`,
        [req.user.id]
      );
      return res.json({ farms: result.rows.map(toPublicFarm) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/farmer/farms", authenticate, authorizeFarmer, async (req, res, next) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const crop = typeof body.crop === "string" ? body.crop.trim() : "";
    const areaAcres = Number(body.areaAcres);
    if (!name || name.length > 100 || !location || location.length > 120 ||
        !crop || crop.length > 80 || !Number.isFinite(areaAcres) ||
        areaAcres <= 0 || areaAcres > 100000) {
      return res.status(400).json({ message: "Enter a valid farm name, location, crop, and area." });
    }
    try {
      const result = await database.query(
        `INSERT INTO public.farms (owner_user_id, name, location, crop, area_acres)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text AS id, name, location, crop, area_acres::float8 AS area_acres`,
        [req.user.id, name, location, crop, areaAcres]
      );
      return res.status(201).json({ farm: toPublicFarm(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/operator/drone-uploads",
    authenticate,
    authorizeOperator,
    uploadLimiter,
    (req, res, next) => {
      upload.array("images", MAX_IMAGE_COUNT)(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError) {
          const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
          const message = error.code === "LIMIT_FILE_SIZE"
            ? "Each drone image must be 15 MB or smaller."
            : "Select up to eight JPEG or PNG images.";
          return res.status(status).json({ message });
        }
        if (error.message === "Unsupported image type.") {
          return res.status(415).json({ message: "Only JPEG and PNG drone images are supported." });
        }
        return next(error);
      });
    },
    async (req, res, next) => {
      const { farmerId, farmId, batchId, imageIds, expectedImageCount } = req.body || {};
      const normalizedFarmerId = typeof farmerId === "string" ? farmerId.trim().toUpperCase() : "";
      const expectedCount = Number(expectedImageCount);
      const files = Array.isArray(req.files) ? req.files : [];
      const ids = Array.isArray(imageIds) ? imageIds : typeof imageIds === "string" ? [imageIds] : [];
      if (!FARMER_ID_PATTERN.test(normalizedFarmerId) || !UUID_PATTERN.test(farmId || "") ||
          !UUID_PATTERN.test(batchId || "") || files.length < 1 || files.length > MAX_IMAGE_COUNT ||
          !Number.isInteger(expectedCount) || expectedCount < files.length ||
          expectedCount > MAX_IMAGE_COUNT || ids.length !== files.length ||
          ids.some((id) => !UUID_PATTERN.test(id))) {
        return res.status(400).json({ message: "Farmer, field, batch, and image details are required." });
      }

      try {
        const farmerResult = await database.query(
          `SELECT id::text AS id, farmer_id, full_name, village
           FROM public.app_users
           WHERE farmer_id = $1 AND role = 'FARMER' AND account_status = 'ACTIVE'`,
          [normalizedFarmerId]
        );
        if (!farmerResult.rowCount) return res.status(404).json({ message: "No active farmer was found for that Farmer ID." });
        const farmer = farmerResult.rows[0];
        const farmResult = await database.query(
          `SELECT id::text AS id, name FROM public.farms
           WHERE id = $1 AND owner_user_id = $2`,
          [farmId, farmer.id]
        );
        if (!farmResult.rowCount) return res.status(404).json({ message: "The selected field does not belong to this farmer." });
        storage.getStorageConfiguration();

        await database.query(
          `INSERT INTO public.drone_upload_batches
             (id, farmer_user_id, farm_id, operator_user_id, expected_image_count)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [batchId, farmer.id, farmId, req.user.id, expectedCount]
        );
        const batchResult = await database.query(
          `SELECT id, farmer_user_id::text AS farmer_user_id, farm_id::text AS farm_id,
                  operator_user_id::text AS operator_user_id, expected_image_count
           FROM public.drone_upload_batches WHERE id = $1`,
          [batchId]
        );
        const batch = batchResult.rows[0];
        if (!batch || batch.farmer_user_id !== String(farmer.id) ||
            batch.farm_id !== farmId || batch.operator_user_id !== String(req.user.id) ||
            Number(batch.expected_image_count) !== expectedCount) {
          return res.status(409).json({ message: "This upload batch ID is already assigned to a different operation." });
        }

        const results = [];
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const clientImageId = ids[index];
          try {
            const image = await inspectDroneImage(file);
            const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
            const existing = await database.query(
              `SELECT id::text AS id, sha256 FROM public.drone_images
               WHERE batch_id = $1 AND client_image_id = $2`,
              [batchId, clientImageId]
            );
            if (existing.rowCount) {
              if (existing.rows[0].sha256 !== sha256) {
                results.push({ clientImageId, filename: safeFilename(file.originalname), status: "failed", message: "This retry does not match the original image." });
              } else {
                results.push({ clientImageId, imageId: existing.rows[0].id, filename: safeFilename(file.originalname), status: "uploaded" });
              }
              continue;
            }

            const extension = image.format === "jpeg" ? "jpg" : "png";
            const storageKey = `farmer/${farmer.farmer_id}/${farmId}/${batchId}/${clientImageId}.${extension}`;
            await storage.uploadPrivateImage({ storageKey, buffer: file.buffer, contentType: image.mimeType });
            try {
              const saved = await database.query(
                `INSERT INTO public.drone_images
                   (batch_id, client_image_id, farmer_user_id, farm_id, operator_user_id,
                    storage_key, original_filename, file_size_bytes, mime_type, sha256, width, height,
                    captured_at, gps_latitude, gps_longitude)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 ON CONFLICT (batch_id, client_image_id) DO NOTHING
                 RETURNING id::text AS id`,
                [
                  batchId, clientImageId, farmer.id, farmId, req.user.id, storageKey,
                  safeFilename(file.originalname), file.size, image.mimeType, sha256,
                  image.width, image.height, image.capturedAt, image.gps?.latitude ?? null,
                  image.gps?.longitude ?? null,
                ]
              );
              if (!saved.rowCount) {
                await storage.deletePrivateImage(storageKey);
                const duplicate = await database.query(
                  `SELECT id::text AS id FROM public.drone_images
                   WHERE batch_id = $1 AND client_image_id = $2 AND sha256 = $3`,
                  [batchId, clientImageId, sha256]
                );
                if (!duplicate.rowCount) throw new Error("An upload conflict could not be verified.");
                results.push({ clientImageId, imageId: duplicate.rows[0].id, filename: safeFilename(file.originalname), status: "uploaded" });
              } else {
                results.push({ clientImageId, imageId: saved.rows[0].id, filename: safeFilename(file.originalname), status: "uploaded" });
              }
            } catch (error) {
              await storage.deletePrivateImage(storageKey).catch((cleanupError) => {
                console.error("Drone image cleanup failed.", {
                  requestId: req.requestId,
                  stage: "storage-cleanup",
                  code: safeCode(cleanupError),
                });
              });
              throw error;
            }
          } catch (error) {
            if (error.statusCode === 415 || error.statusCode === 400) {
              results.push({ clientImageId, filename: safeFilename(file.originalname), status: "failed", message: error.message });
            } else {
              console.error("Drone image upload failed.", {
                requestId: req.requestId,
                stage: "image-upload",
                code: safeCode(error),
              });
              results.push({ clientImageId, filename: safeFilename(file.originalname), status: "failed", message: "This image could not be stored. Check the connection and retry it." });
            }
          }
        }

        const counts = await database.query(
          `SELECT COUNT(*)::int AS uploaded_count FROM public.drone_images WHERE batch_id = $1`,
          [batchId]
        );
        const uploadedCount = Number(counts.rows[0].uploaded_count);
        const failedCount = results.filter((result) => result.status === "failed").length;
        const status = uploadedCount >= expectedCount
          ? "COMPLETED"
          : failedCount ? "PARTIAL" : "UPLOADING";
        await database.query(
          `UPDATE public.drone_upload_batches
           SET status = $1, completed_at = CASE WHEN $1 IN ('COMPLETED', 'PARTIAL') THEN NOW() ELSE NULL END
           WHERE id = $2`,
          [status, batchId]
        );
        return res.status(200).json({
          batchId,
          farmer: { farmerId: farmer.farmer_id, fullName: farmer.full_name, village: farmer.village },
          farm: { id: farmResult.rows[0].id, name: farmResult.rows[0].name },
          uploadedCount,
          expectedCount,
          status,
          results,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.get(
    "/operator/drone-uploads",
    authenticate,
    authorizeOperator,
    async (req, res, next) => {
      const farmerId = typeof req.query.farmerId === "string" ? req.query.farmerId.trim().toUpperCase() : "";
      if (farmerId && !FARMER_ID_PATTERN.test(farmerId)) {
        return res.status(400).json({ message: "Enter a valid Farmer ID filter." });
      }
      try {
        const result = await database.query(
          `SELECT b.id::text AS id, b.status, b.expected_image_count,
                  b.created_at, b.completed_at, f.name AS farm_name, f.location, f.crop,
                  u.farmer_id, u.full_name,
                  COUNT(i.id)::int AS uploaded_count
           FROM public.drone_upload_batches b
           JOIN public.app_users u ON u.id = b.farmer_user_id
           JOIN public.farms f ON f.id = b.farm_id
           LEFT JOIN public.drone_images i ON i.batch_id = b.id
           WHERE ($1::boolean OR b.operator_user_id = $2)
             AND ($3 = '' OR u.farmer_id = $3)
           GROUP BY b.id, f.id, u.id
           ORDER BY b.created_at DESC LIMIT 100`,
          [req.user.role === "ADMIN", req.user.id, farmerId]
        );
        return res.json({ uploads: result.rows.map(toPublicBatch) });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.get(
    "/farmer/drone-images",
    authenticate,
    authorizeFarmer,
    async (req, res, next) => {
      try {
        const result = await database.query(
          `SELECT i.id::text AS id, i.original_filename, i.file_size_bytes,
                  i.mime_type, i.width, i.height,
                  to_char(i.captured_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS captured_at,
                  i.gps_latitude,
                  i.gps_longitude, i.analysis_status, i.uploaded_at,
                  f.id::text AS farm_id, f.name AS farm_name, f.location,
                  f.crop, b.id::text AS batch_id
           FROM public.drone_images i
           JOIN public.farms f ON f.id = i.farm_id
           JOIN public.drone_upload_batches b ON b.id = i.batch_id
           WHERE i.farmer_user_id = $1
           ORDER BY i.uploaded_at DESC LIMIT 200`,
          [req.user.id]
        );
        return res.json({ images: result.rows.map(toPublicImage) });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.get(
    "/farmer/drone-images/:imageId/url",
    authenticate,
    authorizeFarmer,
    async (req, res, next) => {
      if (!UUID_PATTERN.test(req.params.imageId)) return res.status(400).json({ message: "Invalid image identifier." });
      try {
        const result = await database.query(
          "SELECT storage_key FROM public.drone_images WHERE id = $1 AND farmer_user_id = $2",
          [req.params.imageId, req.user.id]
        );
        if (!result.rowCount) return res.status(404).json({ message: "Image not found." });
        const url = await storage.createPrivateImageUrl(result.rows[0].storage_key);
        return res.json({ url, expiresInSeconds: 300 });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.get(
    "/operator/drone-images/:imageId/url",
    authenticate,
    authorizeOperator,
    async (req, res, next) => {
      if (!UUID_PATTERN.test(req.params.imageId)) return res.status(400).json({ message: "Invalid image identifier." });
      try {
        const result = await database.query(
          `SELECT storage_key FROM public.drone_images
           WHERE id = $1 AND ($2::boolean OR operator_user_id = $3)`,
          [req.params.imageId, req.user.role === "ADMIN", req.user.id]
        );
        if (!result.rowCount) return res.status(404).json({ message: "Image not found." });
        const url = await storage.createPrivateImageUrl(result.rows[0].storage_key);
        return res.json({ url, expiresInSeconds: 300 });
      } catch (error) {
        return next(error);
      }
    }
  );

  return router;
}

async function inspectDroneImage(file) {
  let metadata;
  try {
    metadata = await sharp(file.buffer, { limitInputPixels: 50_000_000, failOn: "error" }).metadata();
  } catch {
    const error = new Error("This file is not a readable image.");
    error.statusCode = 400;
    throw error;
  }
  if (!["jpeg", "png"].includes(metadata.format)) {
    const error = new Error("Only JPEG and PNG drone images are supported.");
    error.statusCode = 415;
    throw error;
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 50_000_000) {
    const error = new Error("Image dimensions are missing or exceed the supported limit.");
    error.statusCode = 400;
    throw error;
  }
  return {
    format: metadata.format,
    mimeType: metadata.format === "jpeg" ? "image/jpeg" : "image/png",
    width: metadata.width,
    height: metadata.height,
    ...extractExifMetadata(file.buffer, metadata.format),
  };
}

function extractExifMetadata(buffer, format) {
  if (format !== "jpeg") return { capturedAt: null, gps: null };
  try {
    const tags = ExifParser.create(buffer).enableSimpleValues(false).parse().tags;
    const captureTime = typeof tags.DateTimeOriginal === "string"
      ? tags.DateTimeOriginal
      : typeof tags.CreateDate === "string" ? tags.CreateDate : null;
    const capturedAt = captureTime && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(captureTime)
      ? captureTime.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3 ")
      : null;
    const latitude = parseExifCoordinate(tags.GPSLatitude, tags.GPSLatitudeRef, "N");
    const longitude = parseExifCoordinate(tags.GPSLongitude, tags.GPSLongitudeRef, "E");
    return {
      capturedAt,
      gps: latitude === null || longitude === null ? null : { latitude, longitude },
    };
  } catch {
    return { capturedAt: null, gps: null };
  }
}

function parseExifCoordinate(value, reference, positiveReference) {
  if (!Array.isArray(value) || value.length !== 3 ||
      ![positiveReference, positiveReference === "N" ? "S" : "W"].includes(reference)) return null;
  const parts = value.map((fraction) => Array.isArray(fraction) && fraction.length === 2
    ? Number(fraction[0]) / Number(fraction[1])
    : Number.NaN);
  if (parts.some((part) => !Number.isFinite(part) || part < 0) ||
      parts[1] >= 60 || parts[2] >= 60) return null;
  const degrees = parts[0] + parts[1] / 60 + parts[2] / 3600;
  const maxDegrees = positiveReference === "N" ? 90 : 180;
  if (degrees > maxDegrees) return null;
  return (reference === positiveReference ? 1 : -1) * degrees;
}

function safeFilename(filename) {
  const normalized = String(filename || "drone-image").replace(/\\/g, "/");
  const basename = path.posix.basename(normalized).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (basename || "drone-image").slice(0, 255);
}

function safeCode(error) {
  return error && typeof error.code === "string" && /^[a-z0-9_/-]{1,64}$/i.test(error.code)
    ? error.code
    : "unknown";
}

function toPublicFarm(farm) {
  return {
    id: farm.id,
    name: farm.name,
    location: farm.location,
    crop: farm.crop,
    areaAcres: Number(farm.area_acres),
  };
}

function toPublicBatch(batch) {
  return {
    id: batch.id,
    status: batch.status,
    expectedImageCount: Number(batch.expected_image_count),
    uploadedCount: Number(batch.uploaded_count),
    createdAt: batch.created_at,
    completedAt: batch.completed_at,
    farmerId: batch.farmer_id,
    farmerName: batch.full_name,
    farmName: batch.farm_name,
    location: batch.location,
    crop: batch.crop,
  };
}

function toPublicImage(image) {
  return {
    id: image.id,
    filename: image.original_filename,
    fileSizeBytes: Number(image.file_size_bytes),
    mimeType: image.mime_type,
    width: image.width,
    height: image.height,
    capturedAt: image.captured_at,
    gps: image.gps_latitude === null || image.gps_longitude === null
      ? null
      : { latitude: image.gps_latitude, longitude: image.gps_longitude },
    analysisStatus: image.analysis_status,
    uploadedAt: image.uploaded_at,
    farm: { id: image.farm_id, name: image.farm_name, location: image.location, crop: image.crop },
    batchId: image.batch_id,
  };
}

module.exports = {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  createDroneImageRouter,
  extractExifMetadata,
  inspectDroneImage,
  parseExifCoordinate,
  safeFilename,
};
