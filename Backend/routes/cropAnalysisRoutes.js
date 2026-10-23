const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { createAuthenticationMiddleware, requireRole } = require("../middleware/auth");
const {
  CropImageError,
  MAX_IMAGE_BYTES,
  createAnalysis,
  getAnalysis,
  listCropImages,
} = require("../services/cropAnalysis");

function createCropAnalysisRouter({
  authenticate = createAuthenticationMiddleware(),
  authorizeFarmer = requireRole("FARMER"),
  analyze = createAnalysis,
  findAnalysis = getAnalysis,
  listImages = listCropImages,
} = {}) {
  const router = express.Router();
  const analysisRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_IMAGE_BYTES,
      files: 1,
      fields: 2,
      fieldSize: 64,
      parts: 3,
    },
  });

  router.get("/crop-images", (_req, res) => {
    return res.json({ samples: listImages() });
  });

  router.post(
    "/crop-analysis",
    authenticate,
    authorizeFarmer,
    analysisRateLimit,
    (req, res, next) => {
      upload.single("image")(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError) {
          if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Image files must be 8 MB or smaller." });
          }
          return res.status(400).json({ message: "Upload one image file using the image field." });
        }
        return next(error);
      });
    },
    async (req, res, next) => {
      try {
        const analysis = await analyze({
          file: req.file,
          cropType: req.body && req.body.cropType,
          cropTypeSource: req.body && req.body.cropTypeSource,
          userId: req.user.id,
        });
        return res.status(200).json({ analysis });
      } catch (error) {
        if (error instanceof CropImageError) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        return next(error);
      }
    }
  );

  router.get("/crop-analysis/:analysisId", authenticate, authorizeFarmer, (req, res) => {
    const analysis = findAnalysis(req.params.analysisId, req.user.id);
    if (!analysis) {
      return res.status(404).json({ message: "Analysis result was not found or has expired." });
    }
    return res.json({ analysis });
  });

  return router;
}

module.exports = { createCropAnalysisRouter };
