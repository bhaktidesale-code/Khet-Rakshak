const admin = require("firebase-admin");

function createFirebaseAdmin({ adminSdk = admin, env = process.env } = {}) {
  let configuredCredential;

  function getFirebaseAdminCredentialSource() {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) return "FIREBASE_SERVICE_ACCOUNT_JSON";
    if (env.GOOGLE_APPLICATION_CREDENTIALS) return "GOOGLE_APPLICATION_CREDENTIALS";
    return "Application Default Credentials";
  }

  function getFirebaseAuth() {
    const projectId = typeof env.FIREBASE_PROJECT_ID === "string"
      ? env.FIREBASE_PROJECT_ID.trim()
      : "";
    if (!projectId) {
      throw firebaseAdminError(
        "FIREBASE_PROJECT_ID is required for Firebase Admin authentication.",
        "firebase-admin/configuration-error",
        { missingVariables: ["FIREBASE_PROJECT_ID"] }
      );
    }

    if (adminSdk.apps.length) {
      try {
        const app = adminSdk.app();
        if (app.options.projectId !== projectId) {
          throw firebaseAdminError(
            "The initialized Firebase Admin project does not match FIREBASE_PROJECT_ID.",
            "firebase-admin/project-mismatch",
            { mismatchedFields: ["FIREBASE_PROJECT_ID", "initialized Firebase Admin projectId"] }
          );
        }
        return adminSdk.auth(app);
      } catch (error) {
        if (error && typeof error.code === "string" && error.code.startsWith("firebase-admin/")) throw error;
        throw firebaseAdminError(
          "The existing Firebase Admin app could not be reused. Check FIREBASE_PROJECT_ID and the Admin SDK setup.",
          "firebase-admin/initialization-error"
        );
      }
    }

    try {
      const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        const serviceAccount = parseServiceAccount(serviceAccountJson);
        if (serviceAccount.project_id !== projectId) {
          throw firebaseAdminError(
            "FIREBASE_SERVICE_ACCOUNT_JSON project_id must match FIREBASE_PROJECT_ID.",
            "firebase-admin/project-mismatch",
            { mismatchedFields: ["FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON.project_id"] }
          );
        }
        configuredCredential = adminSdk.credential.cert(serviceAccount);
      } else {
        configuredCredential = adminSdk.credential.applicationDefault();
      }
    } catch (error) {
      if (error && typeof error.code === "string" && error.code.startsWith("firebase-admin/")) throw error;
      throw firebaseAdminError(
        "Firebase Admin credentials could not be created. Check the configured credential source and Firebase project ID.",
        "firebase-admin/credential-error"
      );
    }

    try {
      const app = adminSdk.initializeApp({ credential: configuredCredential, projectId });
      return adminSdk.auth(app);
    } catch (_error) {
      throw firebaseAdminError(
        "Firebase Admin could not initialize. Check the credential source and ensure it belongs to FIREBASE_PROJECT_ID.",
        "firebase-admin/initialization-error"
      );
    }
  }

  async function verifyFirebaseAdminCredentials() {
    getFirebaseAuth();
    if (!configuredCredential) return;
    try {
      await configuredCredential.getAccessToken();
    } catch (_error) {
      throw firebaseAdminError(
        "Firebase Admin could not obtain an access token. Check that the credential source is available and belongs to FIREBASE_PROJECT_ID.",
        "firebase-admin/credential-check-failed"
      );
    }
  }

  return {
    getFirebaseAuth,
    getFirebaseAdminCredentialSource,
    verifyFirebaseAdminCredentials,
  };
}

function parseServiceAccount(value) {
  let parsed;
  try {
    parsed = JSON.parse(value);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch (_error) {
    throw firebaseAdminError(
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.",
      "firebase-admin/malformed-credentials",
      { invalidFields: ["FIREBASE_SERVICE_ACCOUNT_JSON"] }
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw firebaseAdminError(
      "FIREBASE_SERVICE_ACCOUNT_JSON must be a service-account JSON object.",
      "firebase-admin/malformed-credentials",
      { invalidFields: ["FIREBASE_SERVICE_ACCOUNT_JSON"] }
    );
  }

  const requiredFields = ["project_id", "client_email", "private_key"];
  const missingFields = requiredFields.filter(
    (field) => typeof parsed[field] !== "string" || !parsed[field].trim()
  );
  if (parsed.type !== "service_account") missingFields.unshift("type");
  if (missingFields.length) {
    throw firebaseAdminError(
      `FIREBASE_SERVICE_ACCOUNT_JSON is missing or has invalid required fields: ${missingFields.join(", ")}.`,
      "firebase-admin/malformed-credentials",
      { invalidFields: missingFields }
    );
  }

  return {
    ...parsed,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

function firebaseAdminError(message, code, diagnostics = {}) {
  return Object.assign(new Error(message), { code, ...diagnostics });
}

const defaultFirebaseAdmin = createFirebaseAdmin();

module.exports = {
  createFirebaseAdmin,
  getFirebaseAuth: defaultFirebaseAdmin.getFirebaseAuth,
  getFirebaseAdminCredentialSource: defaultFirebaseAdmin.getFirebaseAdminCredentialSource,
  verifyFirebaseAdminCredentials: defaultFirebaseAdmin.verifyFirebaseAdminCredentials,
};
