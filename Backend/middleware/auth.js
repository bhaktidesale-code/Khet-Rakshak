const pool = require("../config/db");
const { getFirebaseAuth } = require("../services/firebaseAdmin");

function createAuthenticationMiddleware({
  database = pool,
  firebaseAuth = getFirebaseAuth,
} = {}) {
  return async function authenticate(req, res, next) {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      return res.status(401).json({ message: "Authentication is required." });
    }

    let authClient;
    try {
      req.authFailureStage = "firebase-admin-initialization";
      authClient = firebaseAuth();
    } catch (error) {
      return next(error);
    }

    let decoded;
    try {
      req.authFailureStage = "firebase-token-verification";
      decoded = await authClient.verifyIdToken(match[1], true);
    } catch (error) {
      const invalidTokenCodes = [
        "auth/argument-error",
        "auth/id-token-expired",
        "auth/id-token-revoked",
        "auth/invalid-id-token",
        "auth/user-disabled",
      ];
      if (error && invalidTokenCodes.includes(error.code)) {
        return res.status(401).json({ message: "Authentication failed." });
      }
      return next(error);
    }

    try {
      req.authFailureStage = "app-user-upsert";
      const result = await database.query(
        `INSERT INTO public.app_users AS app_user (firebase_uid, email, full_name, mobile_number)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (firebase_uid) DO UPDATE SET
           email = COALESCE(EXCLUDED.email, app_user.email),
           full_name = CASE WHEN app_user.full_name = ''
             THEN EXCLUDED.full_name ELSE app_user.full_name END,
           mobile_number = COALESCE(EXCLUDED.mobile_number, app_user.mobile_number),
           updated_at = NOW()
         RETURNING id, firebase_uid, email, full_name, mobile_number, village,
                   role, account_status`,
        [
          decoded.uid,
          decoded.email || null,
          decoded.name || "",
          decoded.phone_number || null,
        ]
      );
      const user = result.rows[0];

      if (user.account_status !== "ACTIVE") {
        return res.status(403).json({ message: "This account is not active." });
      }

      req.user = user;
      req.firebaseToken = decoded;
      req.authFailureStage = undefined;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function requireRole(...allowedRoles) {
  return function authorize(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication is required." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You are not authorized for this resource." });
    }
    return next();
  };
}

module.exports = { createAuthenticationMiddleware, requireRole };
