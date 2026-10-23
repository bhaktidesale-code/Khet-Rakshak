const express = require("express");
const { getFirebaseAuth } = require("../services/firebaseAdmin");
const pool = require("../config/db");
const { createAuthenticationMiddleware, requireRole } = require("../middleware/auth");

const router = express.Router();
const authenticate = createAuthenticationMiddleware();

router.get("/me", authenticate, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.patch("/profile", authenticate, async (req, res, next) => {
  const { fullName, village } = req.body || {};
  if (
    typeof fullName !== "string" ||
    fullName.trim().length < 2 ||
    fullName.trim().length > 120 ||
    typeof village !== "string" ||
    village.trim().length > 120
  ) {
    return res.status(400).json({ message: "A valid name and village are required." });
  }

  try {
    const result = await pool.query(
      `UPDATE public.app_users SET full_name = $1, village = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, firebase_uid, farmer_id, email, full_name, mobile_number, village,
                 role, account_status`,
      [fullName.trim(), village.trim(), req.user.id]
    );
    return res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/role-requests/drone-pilot", authenticate, async (req, res, next) => {
  if (req.user.role === "DRONE_PILOT") {
    return res.status(200).json({ status: "APPROVED" });
  }

  try {
    await pool.query(
      `INSERT INTO public.role_requests AS role_request (user_id, requested_role)
       VALUES ($1, 'DRONE_PILOT')
       ON CONFLICT (user_id, requested_role) DO UPDATE SET
         status = 'PENDING',
         reviewed_by = NULL,
         reviewed_at = NULL,
         created_at = NOW()
       WHERE role_request.status IN ('REJECTED', 'APPROVED')`,
      [req.user.id]
    );
    return res.status(202).json({ status: "PENDING" });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await getFirebaseAuth().revokeRefreshTokens(req.user.firebase_uid);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/users", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id::text AS id, farmer_id, email, full_name, mobile_number, village, role, account_status, created_at
       FROM public.app_users ORDER BY created_at DESC LIMIT 200`
    );
    return res.json({ users: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/role-requests", authenticate, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id::text AS id, r.requested_role, r.status, r.created_at,
              u.id::text AS user_id, u.full_name, u.email, u.mobile_number, u.village
       FROM public.role_requests r
       JOIN public.app_users u ON u.id = r.user_id
       WHERE r.status = 'PENDING'
       ORDER BY r.created_at ASC
       LIMIT 200`
    );
    return res.json({ requests: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.patch(
  "/admin/role-requests/:requestId",
  authenticate,
  requireRole("ADMIN"),
  async (req, res, next) => {
    const requestId = req.params.requestId;
    const { status } = req.body || {};
    if (!/^[1-9]\d{0,18}$/.test(requestId) ||
        !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "A valid request ID and decision are required." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const request = await client.query(
        `SELECT id, user_id, requested_role FROM public.role_requests
         WHERE id = $1 AND status = 'PENDING' FOR UPDATE`,
        [requestId]
      );
      if (!request.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Pending role request was not found." });
      }
      const roleRequest = request.rows[0];
      await client.query(
        `UPDATE public.role_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $3`,
        [status, req.user.id, requestId]
      );
      if (status === "APPROVED") {
        await client.query(
          `UPDATE public.app_users SET role = $1, updated_at = NOW() WHERE id = $2`,
          [roleRequest.requested_role, roleRequest.user_id]
        );
      }
      await client.query("COMMIT");
      return res.json({ success: true, status });
    } catch (error) {
      await client.query("ROLLBACK");
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/admin/users/:userId/role",
  authenticate,
  requireRole("ADMIN"),
  async (req, res, next) => {
    const allowedRoles = ["FARMER", "DRONE_PILOT", "OUTLET_MANAGER", "ADMIN"];
    const { role } = req.body || {};
    const userId = req.params.userId;
    if (!/^[1-9]\d{0,18}$/.test(userId) || !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid application role." });
    }
    if (userId === req.user.id && role !== "ADMIN") {
      return res.status(409).json({ message: "Administrators cannot remove their own administrator role." });
    }

    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const updated = await client.query(
          `UPDATE public.app_users SET role = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id`,
          [role, userId]
        );
        if (!updated.rowCount) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "User was not found." });
        }
        await client.query(
          `UPDATE public.role_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW()
           WHERE user_id = $3 AND requested_role = 'DRONE_PILOT' AND status = 'PENDING'`,
          [role === "DRONE_PILOT" ? "APPROVED" : "REJECTED", req.user.id, userId]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  }
);

function toPublicUser(user) {
  return {
    id: String(user.id),
    farmerId: user.farmer_id || null,
    email: user.email,
    fullName: user.full_name,
    mobileNumber: user.mobile_number,
    village: user.village,
    role: user.role,
    accountStatus: user.account_status,
  };
}

module.exports = router;
