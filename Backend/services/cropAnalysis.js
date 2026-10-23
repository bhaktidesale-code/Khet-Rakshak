const { randomUUID } = require("node:crypto");
const path = require("node:path");
const sharp = require("sharp");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 16_000_000;
const RESULT_TTL_MS = 15 * 60 * 1000;
const MAX_RESULTS = 500;
const SUPPORTED_FORMATS = new Set(["jpeg", "png", "webp"]);
const SAMPLE_FILENAMES = [
  "C.jpeg",
  "Cotton_1.jpeg",
  "Cotton_2.jpeg",
  "Cotton_3.jpeg",
  "Cotton_4.jpeg",
  "Cotton_5.jpeg",
  "Cotton_7.jpeg",
  "Cotton_8.jpeg",
  "Cotton_9.jpeg",
  "Cotton_10.jpeg",
  "Cotton_11.jpeg",
  "Tur.jpeg",
  "Turmeric_1.jpeg",
  "Turmeric_2.jpeg",
  "Turmeric_3.jpeg",
  "Turmeric_4.jpeg",
  "Turmeric_5.jpeg",
  "Turmeric_6.jpeg",
  "Turmeric_7.jpeg",
  "Turmeric_8.jpeg",
  "Turmeric_9.jpeg",
];

const results = new Map();

class CropImageError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "CropImageError";
    this.statusCode = statusCode;
  }
}

function getCropHint(filename) {
  if (/^cotton[_\-.]/i.test(filename)) return "cotton";
  if (/^turmeric[_\-.]/i.test(filename)) return "turmeric";
  return null;
}

function listCropImages() {
  return SAMPLE_FILENAMES.map((filename) => {
    const cropHint = getCropHint(filename);
    return {
      filename,
      cropType: null,
      cropHint,
      imagePath: `/crop-demo/${encodeURIComponent(filename)}`,
      labelStatus: cropHint ? "filename-only" : "unclassified",
    };
  });
}

function validateCropMetadata(cropType, cropTypeSource) {
  if (!["cotton", "turmeric", "other", "unknown"].includes(cropType)) {
    throw new CropImageError("Choose Cotton, Turmeric, Other, or Unknown for the submitted crop type.");
  }
  if (!["user_selected", "filename_hint", "unknown"].includes(cropTypeSource)) {
    throw new CropImageError("The crop type source is invalid.");
  }
  if (cropType === "unknown" && cropTypeSource !== "unknown") {
    throw new CropImageError("Unknown crop types must use the unknown source.");
  }
  if (cropType !== "unknown" && cropTypeSource === "unknown") {
    throw new CropImageError("Select the source for the crop type.");
  }
}

async function inspectImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new CropImageError("Select an image to analyse.");
  }
  if (file.buffer.length > MAX_IMAGE_BYTES) {
    throw new CropImageError("Image files must be 8 MB or smaller.", 413);
  }

  let metadata;
  try {
    metadata = await sharp(file.buffer, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();
    if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format)) {
      throw new CropImageError("Use a JPEG, PNG, or WebP image.", 415);
    }
    if (!metadata.width || !metadata.height) {
      throw new CropImageError("The image dimensions could not be read.");
    }
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new CropImageError("Image dimensions exceed the supported 16-megapixel limit.", 413);
    }
    await sharp(file.buffer, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).stats();
  } catch (error) {
    if (error instanceof CropImageError) throw error;
    if (error && typeof error.message === "string" && error.message.toLowerCase().includes("pixel limit")) {
      throw new CropImageError("Image dimensions exceed the supported 16-megapixel limit.", 413);
    }
    throw new CropImageError("The selected file is not a readable image.", 400);
  }

  const warnings = [];
  if (Math.min(metadata.width, metadata.height) < 256) {
    warnings.push("The image has low pixel dimensions; visual assessment may be unsuitable.");
  }

  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    qualityStatus: warnings.length ? "warning" : "readable",
    warnings,
  };
}

function purgeExpiredResults(now = Date.now()) {
  for (const [id, entry] of results) {
    if (entry.expiresAt <= now) results.delete(id);
  }
}

async function createAnalysis({ file, cropType, cropTypeSource, userId, now = new Date() }) {
  validateCropMetadata(cropType, cropTypeSource);
  const image = await inspectImage(file);
  const analysisId = randomUUID();
  const createdAt = now.toISOString();
  const safeFilename = path.basename(String(file.originalname || "crop-image").replace(/\\/g, "/")).slice(0, 255);
  const analysis = {
    id: analysisId,
    createdAt,
    filename: safeFilename,
    fileSizeBytes: file.buffer.length,
    cropType,
    cropTypeSource,
    image,
    analysisStatus: cropType === "other" ? "unsupported_crop" : "model_unavailable",
    resultType: "image_quality_only",
    prediction: null,
    confidence: null,
    model: null,
    warnings: [
      ...image.warnings,
      "Blur and scene suitability are not assessed automatically.",
      cropType === "other"
        ? "The selected crop is not supported by this prototype; no disease prediction was made."
        : "No validated cotton or turmeric disease model is configured; no disease prediction was made.",
    ],
  };

  purgeExpiredResults(now.getTime());
  while (results.size >= MAX_RESULTS) results.delete(results.keys().next().value);
  results.set(analysisId, {
    ownerId: String(userId),
    analysis,
    expiresAt: now.getTime() + RESULT_TTL_MS,
  });
  return analysis;
}

function getAnalysis(analysisId, userId, now = Date.now()) {
  purgeExpiredResults(now);
  const entry = results.get(analysisId);
  if (!entry || entry.ownerId !== String(userId)) return null;
  return entry.analysis;
}

module.exports = {
  CropImageError,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  RESULT_TTL_MS,
  createAnalysis,
  getAnalysis,
  inspectImage,
  listCropImages,
  validateCropMetadata,
};
