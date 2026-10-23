# Khet Rakshak API

The API is an Express 5 service backed by PostgreSQL. The application requires PostgreSQL; it has no in-memory or SQLite fallback. Firebase Authentication issues browser ID tokens, and Firebase Admin verifies each token before API middleware loads that user's role and account status from PostgreSQL.

## Run locally

1. Copy `.env.example` to `.env` and set a real PostgreSQL `DATABASE_URL`, `FIREBASE_PROJECT_ID`, and Firebase Admin credentials. `FIREBASE_PROJECT_ID` must match the Firebase project used by the frontend. For local development, choose one Admin credential method:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete Firebase Admin service-account JSON object as a JSON string. Required JSON fields are `type` (`service_account`), `project_id`, `client_email`, and `private_key`. Its `project_id` must equal `FIREBASE_PROJECT_ID`. Newline escapes in `private_key` are converted to PEM line breaks.
   - `GOOGLE_APPLICATION_CREDENTIALS`: alternatively, an absolute path to a service-account JSON file readable by the backend process. Firebase Admin reads this through Google Application Default Credentials (ADC).
   - Or configure ADC with `gcloud auth application-default login` and leave the two credential-source variables unset.

   Keep service-account JSON and database credentials private. Do not prefix them with `VITE_` or commit them. On startup, the API checks that Firebase Admin can obtain an access token and logs only the project ID, credential source, and a safe error code (never the credential value or token).
2. From this directory, inspect migrations. For a production database, use the confirmation-gated command instead of the non-interactive `db:migrate` command:

   ```powershell
   $env:DATABASE_SSL = 'true'
   npm run db:migrate:confirmed
   ```

   The confirmation command checks and displays migration status before and after running the migration runner. The runner creates `public.app_schema_migrations`, applies each pending SQL file in its own transaction, records only successful migrations, and takes a PostgreSQL advisory lock. It is safe to repeat. `db:status` is read-only but requires `DATABASE_URL` to already be set; do not run it against a different local `.env` target and mistake that result for production. User identities stay in Firebase Authentication; the PostgreSQL provider is selected by `DATABASE_URL`. The local configuration in this workspace points to Supabase, but the production provider cannot be inferred from repository code and must be checked in Render settings.

   `db:migrate:confirmed` asks whether to use the existing `DATABASE_URL` or securely prompts for it with input hidden. It first reads the database name, schema, migration history, and schema readiness without changing tables. It displays only the detected provider category, database name, schema, and a one-way target fingerprint (never the URL or hostname), then requires the exact target confirmation before calling the existing migration runner. Unknown providers, unknown applied migration versions, invalid schema with no pending migrations, missing SSL configuration, and unconfirmed targets stop without applying migrations.

   For a Render free service without Shell access, run the migration from Windows against the exact PostgreSQL database configured by the Render service. In Render settings, identify whether `DATABASE_URL` points to Supabase or Render PostgreSQL. Provide its externally reachable connection URL only in the hidden prompt (or a secure local environment); do not use a Render internal-only URL from a local computer. Before running the confirmed workflow, set `DATABASE_SSL=true` in `Backend/.env` or in the current PowerShell process, and keep `DATABASE_SSL_REJECT_UNAUTHORIZED=true`. The workflow refuses to connect unless TLS is enabled and certificate checks remain enabled.

   ```powershell
   Set-Location .\Backend
   $env:DATABASE_SSL = 'true'
   npm run db:migrate:confirmed
   ```

   Before confirming, compare the displayed provider/database/schema with the intended production target and ensure the URL was taken from the Render service configuration. Migration `002_ensure_auth_tables.sql` safely creates `public.app_users`, `public.role_requests`, and the required mobile index when absent; `CREATE ... IF NOT EXISTS` preserves existing rows and definitions. The command verifies no migrations remain pending and validates the schema after it runs. Then check `GET /api/health` returns `200`. Do not run this on production if the target identity or migration history is unclear.

3. Install dependencies and start the API:

   ```powershell
   npm ci
   npm start
   ```

The local default port is 5000. The service listens on `0.0.0.0` and uses the platform supplied `PORT` when present. Development CORS permits Vite origins on ports 3000, 3001, and 5173 for both `localhost` and `127.0.0.1`.

## Endpoints and security

- `GET /health` is a process liveness check and does not require database access.
- `GET /api/health` is a readiness check. It returns 200 when PostgreSQL is reachable, the known migrations are recorded, and required columns, types, nullability, defaults, constraints, and indexes match. It returns 503 when `DATABASE_URL` is missing, PostgreSQL is unavailable, migrations are pending, or schema validation fails. Its response does not contain database credentials or internal error details.
- Protected routes use `Authorization: Bearer <Firebase ID token>`. Firebase Admin verifies signature, project audience, expiry, and revocation. Application roles come from `app_users`, not request input.
- `FRONTEND_URL` is the exact allowed browser origin. Development additionally allows local Vite origins; production does not allow wildcard origins.

## Crop image workflow

- `GET /api/crop-images` lists the 21 public demo samples by filename and relative frontend asset path. Crop names are filename hints only; the API does not assign verified crop or disease labels.
- `POST /api/crop-analysis` accepts a multipart `image`, `cropType` (`cotton`, `turmeric`, `other`, or `unknown`), and `cropTypeSource`. It requires an active `FARMER` Firebase identity, accepts JPEG/PNG/WebP up to 8 MB and 16 megapixels, and is limited to 10 requests per IP per 15 minutes. Sharp validates and decodes the image for a readability/dimension check. It does not identify blur, crop species, disease, or severity.
- `GET /api/crop-analysis/:analysisId` retrieves the result for its owning farmer only. Results are kept in bounded process memory for at most 15 minutes; they are lost on restart and are not shared between API instances. The uploaded image is never written to disk or persisted in PostgreSQL.
- No validated cotton/turmeric disease model is included or configured. The current result is explicitly `image_quality_only` with `model_unavailable` (or `unsupported_crop` for “Other”), null prediction, and null confidence. This must not be presented as a disease diagnosis.
- No analysis history or farm schema exists. Persistent reports are intentionally not implemented and no database migration is required for this temporary workflow. Before saving farm reports, review a migration that adds a minimal `farms` table (`id`, `owner_user_id`, and required farm identity fields) and a `crop_analysis_runs` table (`id`, `owner_user_id`, `farm_id`, submitted crop/source, original filename, analysis status, nullable result/model metadata, and `created_at`). Enforce farm ownership with a composite foreign key from `(farm_id, owner_user_id)` to the farm owner key. Do not include an image URL or blob unless a separate authorized image-retention policy is approved. The current frontend farm records are session-only, so a report cannot yet be associated with a durable farm.

## Deploy on Render

Use this directory as the Render Web Service **Root Directory**, `npm ci` as **Build Command**, and `npm start` as **Start Command**. Configure these exact backend variables in Render's Environment settings:

| Variable | Required value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Firebase project ID used by the frontend. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Recommended for Render: the complete service-account JSON object, pasted as the value of a secret environment variable. Its `project_id` must match `FIREBASE_PROJECT_ID`. |
| `DATABASE_URL` | PostgreSQL connection URL. |
| `FRONTEND_URL` | Exact deployed frontend origin, e.g. `https://your-app.vercel.app`. |

Alternatively, omit `FIREBASE_SERVICE_ACCOUNT_JSON` only if ADC is configured for the Render service. `GOOGLE_APPLICATION_CREDENTIALS` is an absolute file path, not JSON content; it works only if the credential file exists at that path on the Render instance. Setting it does not upload a file. The service account must belong to the configured Firebase project and have permission to verify Firebase Authentication tokens. Never put Admin credentials in a `VITE_*` variable.

After saving environment variables, redeploy/restart the Render service. Check the startup logs for `Firebase Admin credentials verified.`; if setup fails, the diagnostic identifies the missing or invalid field without logging credential contents. To verify locally, configure the same project ID and one credential method in `Backend/.env`, then run `npm start` from `Backend` and confirm that startup success message. Do not paste credentials into a command line or commit `.env`.

Provision PostgreSQL, run `npm run db:migrate:confirmed` against the production database from a trusted local machine if Render Shell is unavailable, and use the service URL assigned by Render as the frontend's `VITE_API_URL` (base origin only, without `/api`). See the root README for the full deployment sequence and environment variable table.
