ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS farmer_id VARCHAR(19);

UPDATE public.app_users
SET farmer_id = 'KR-' || UPPER(SUBSTRING(MD5(firebase_uid) FROM 1 FOR 16))
WHERE farmer_id IS NULL;

ALTER TABLE public.app_users
  ALTER COLUMN farmer_id SET DEFAULT (
    'KR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 16))
  ),
  ALTER COLUMN farmer_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_farmer_id_unique
  ON public.app_users (farmer_id);

DO $migration$
DECLARE
  relation_name TEXT;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['farms', 'drone_upload_batches', 'drone_images']
  LOOP
    IF to_regclass('public.' || relation_name) IS NULL AND EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = relation_name
        AND n.nspname <> 'public'
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    ) THEN
      RAISE EXCEPTION 'A drone workflow table exists outside public; refusing to create a second table';
    END IF;
  END LOOP;
END
$migration$;

CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(120) NOT NULL,
  crop VARCHAR(80) NOT NULL,
  area_acres NUMERIC(10, 2) NOT NULL CHECK (area_acres > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id, id)
);

CREATE INDEX IF NOT EXISTS farms_owner_created_idx
  ON public.farms (owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.drone_upload_batches (
  id UUID PRIMARY KEY,
  farmer_user_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  farm_id UUID NOT NULL,
  operator_user_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  expected_image_count INTEGER NOT NULL CHECK (expected_image_count BETWEEN 1 AND 8),
  status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING'
    CHECK (status IN ('UPLOADING', 'COMPLETED', 'PARTIAL', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT drone_upload_batches_farm_owner_fkey
    FOREIGN KEY (farmer_user_id, farm_id)
    REFERENCES public.farms (owner_user_id, id) ON DELETE RESTRICT,
  UNIQUE (id, farmer_user_id, farm_id, operator_user_id)
);

CREATE INDEX IF NOT EXISTS drone_upload_batches_operator_created_idx
  ON public.drone_upload_batches (operator_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS drone_upload_batches_farmer_created_idx
  ON public.drone_upload_batches (farmer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.drone_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  client_image_id UUID NOT NULL,
  farmer_user_id BIGINT NOT NULL,
  farm_id UUID NOT NULL,
  operator_user_id BIGINT NOT NULL,
  storage_key VARCHAR(512) NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type VARCHAR(64) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  sha256 CHAR(64) NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  captured_at TIMESTAMP WITHOUT TIME ZONE,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  analysis_status VARCHAR(24) NOT NULL DEFAULT 'unavailable'
    CHECK (analysis_status IN ('uploaded', 'pending_analysis', 'processing', 'processed', 'failed', 'unavailable')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT drone_images_batch_owner_fkey
    FOREIGN KEY (batch_id, farmer_user_id, farm_id, operator_user_id)
    REFERENCES public.drone_upload_batches (id, farmer_user_id, farm_id, operator_user_id)
    ON DELETE CASCADE,
  UNIQUE (batch_id, client_image_id)
);

CREATE INDEX IF NOT EXISTS drone_images_farmer_uploaded_idx
  ON public.drone_images (farmer_user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS drone_images_farm_uploaded_idx
  ON public.drone_images (farm_id, uploaded_at DESC);
