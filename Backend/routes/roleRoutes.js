const express = require("express");
const { createAuthenticationMiddleware, requireRole } = require("../middleware/auth");

const router = express.Router();
const authenticate = createAuthenticationMiddleware();

router.get("/farmer/profile", authenticate, requireRole("FARMER"), (req, res) => {
  res.json({ userId: req.user.id, fullName: req.user.full_name, village: req.user.village });
});

router.get(
  "/operator/assignments",
  authenticate,
  requireRole("DRONE_PILOT"),
  (_req, res) => {
    res.json({ assignments: [] });
  }
);

router.get("/admin/health", authenticate, requireRole("ADMIN"), (_req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
