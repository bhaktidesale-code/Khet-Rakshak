require("dotenv").config();
const pool = require("../config/db");
const { getFirebaseAuth } = require("../services/firebaseAdmin");

async function provisionAdmin() {
  const uid = process.argv[2];
  if (!uid || process.argv[3] !== "--confirm") {
    throw new Error("Usage: npm run provision-admin -- <verified-firebase-uid> --confirm");
  }

  const identity = await getFirebaseAuth().getUser(uid);
  if (!identity.emailVerified && !identity.phoneNumber) {
    throw new Error("Admin identity must have a verified email address or phone number.");
  }

  const result = await pool.query(
    `INSERT INTO public.app_users AS app_user (firebase_uid, email, full_name, mobile_number, role)
     VALUES ($1, $2, $3, $4, 'ADMIN')
     ON CONFLICT (firebase_uid) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, app_user.email),
       role = 'ADMIN',
       account_status = 'ACTIVE',
       updated_at = NOW()
     RETURNING id`,
    [identity.uid, identity.email || null, identity.displayName || "", identity.phoneNumber || null]
  );

  console.log(`Provisioned administrator account ${result.rows[0].id}.`);
}

provisionAdmin()
  .catch((error) => {
    console.error(`Administrator provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
