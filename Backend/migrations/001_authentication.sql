CREATE TABLE IF NOT EXISTS public.app_users (
  id BIGSERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(320),
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  mobile_number VARCHAR(20),
  village VARCHAR(120) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'FARMER'
    CHECK (role IN ('FARMER', 'DRONE_PILOT', 'OUTLET_MANAGER', 'ADMIN')),
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_mobile_unique
  ON public.app_users (mobile_number) WHERE mobile_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.role_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  requested_role VARCHAR(20) NOT NULL
    CHECK (requested_role IN ('DRONE_PILOT', 'OUTLET_MANAGER')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by BIGINT REFERENCES public.app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (user_id, requested_role)
);
