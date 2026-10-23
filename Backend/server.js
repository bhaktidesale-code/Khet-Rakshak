require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("node:crypto");
const pool = require("./config/db");
const { getDatabaseReadiness } = require("./services/readiness");
const { getSafeDatabaseErrorDetails } = require("./services/databaseDiagnostics");
const authRoutes = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");
const { createCropAnalysisRouter } = require("./routes/cropAnalysisRoutes");

const app = express();
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "0.0.0.0";
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV === "development"
    ? [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ]
    : []),
].filter(Boolean);

app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use("/api/auth", authRoutes);
app.use("/api", createCropAnalysisRouter());
app.use("/api", roleRoutes);

app.get("/", (_req, res) => {
  res.json({ success: true, message: "Khet Rakshak backend is running" });
});

app.get("/health", (_req, res) => {
  res.json({ success: true, status: "alive" });
});

app.get("/api/health", async (_req, res) => {
  const readiness = await getDatabaseReadiness(pool);
  if (readiness.logCode) console.error("API readiness check failed.", { code: readiness.logCode });
  return res.status(readiness.httpStatus).json(readiness.body);
});

app.use((error, req, res, _next) => {
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ message: "Origin is not allowed." });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must contain valid JSON." });
  }
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: "Request could not be processed." });
  }
  const code = typeof error.code === "string" && /^[a-z0-9_/-]{1,64}$/i.test(error.code)
    ? error.code
    : "unknown";
  const logDetails = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    stage: req.authFailureStage || "request-handler",
    code,
  };
  Object.assign(logDetails, getSafeDatabaseErrorDetails(error));
  console.error("Unhandled request error.", logDetails);
  return res.status(500).json({
    message: "An unexpected server error occurred.",
    requestId: req.requestId,
  });
});

if (require.main === module) {
  const firebaseAdmin = require("./services/firebaseAdmin");
  const credentialSource = firebaseAdmin.getFirebaseAdminCredentialSource();
  void firebaseAdmin.verifyFirebaseAdminCredentials()
    .then(() => {
      console.info("Firebase Admin credentials verified.", {
        projectId: process.env.FIREBASE_PROJECT_ID,
        credentialSource,
      });
    })
    .catch((error) => {
      const code = typeof error.code === "string" && /^[a-z0-9_/-]{1,64}$/i.test(error.code)
        ? error.code
        : "unknown";
      console.error("Firebase Admin credential verification failed.", {
        projectId: process.env.FIREBASE_PROJECT_ID || "missing",
        credentialSource,
        code,
        diagnostic: error.message,
        missingVariables: Array.isArray(error.missingVariables) ? error.missingVariables : [],
        invalidFields: Array.isArray(error.invalidFields) ? error.invalidFields : [],
        mismatchedFields: Array.isArray(error.mismatchedFields) ? error.mismatchedFields : [],
        remediation: credentialSource === "Application Default Credentials"
          ? "Configure local ADC with gcloud auth application-default login or set GOOGLE_APPLICATION_CREDENTIALS."
          : credentialSource === "GOOGLE_APPLICATION_CREDENTIALS"
            ? "Ensure GOOGLE_APPLICATION_CREDENTIALS points to a readable credential file for FIREBASE_PROJECT_ID."
            : "Check that FIREBASE_SERVICE_ACCOUNT_JSON is valid and its project_id matches FIREBASE_PROJECT_ID."
      });
    });
  app.listen(port, host, () => console.log(`Backend listening on ${host}:${port}`));
}

module.exports = app;
