-- =============================================================
-- 02-schema.sql
-- Full schema: CREATE TABLE + INDEX
-- Conventions:
--   - snake_case naming
--   - UUID primary keys
--   - Money in integer VND
--   - Carbon in kg CO2, distance in km
--   - All timestamps as TIMESTAMPTZ
-- =============================================================


-- -------------------------------------------------------------
-- 2.1  companies
-- -------------------------------------------------------------
CREATE TABLE companies (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  name                        TEXT        NOT NULL,

  target_monthly_emission_kg  NUMERIC(12, 3)  DEFAULT 0,
  target_weekly_emission_kg   NUMERIC(12, 3)  DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.2  departments
-- -------------------------------------------------------------
CREATE TABLE departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name        TEXT        NOT NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, name)
);


-- -------------------------------------------------------------
-- 2.3  users
-- -------------------------------------------------------------
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id      UUID        NOT NULL REFERENCES companies(id)    ON DELETE CASCADE,
  department_id   UUID                 REFERENCES departments(id)  ON DELETE SET NULL,

  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT        NOT NULL,

  role            TEXT        NOT NULL
                    CHECK (role IN ('EMPLOYEE', 'COMPANY_ADMIN')),

  green_points    INTEGER     NOT NULL DEFAULT 0,
  green_score     INTEGER     NOT NULL DEFAULT 0,

  status          TEXT        NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.4  refresh_tokens
-- (skip for hackathon if using mock JWT; include for completeness)
-- -------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.5  vehicle_profiles
-- Carbon emission constants per vehicle type & powertrain
-- -------------------------------------------------------------
CREATE TABLE vehicle_profiles (
  id                    TEXT        PRIMARY KEY,

  display_name          TEXT        NOT NULL,

  vehicle_class         TEXT        NOT NULL
                          CHECK (vehicle_class IN ('MOTORBIKE', 'CAR_4', 'SUV_7')),

  powertrain            TEXT        NOT NULL
                          CHECK (powertrain IN ('PETRO', 'ELECTRIC')),

  energy_usage_value    NUMERIC(12, 4)  NOT NULL,
  energy_usage_unit     TEXT        NOT NULL
                          CHECK (energy_usage_unit IN ('L_PER_100KM', 'WH_PER_KM')),

  co2_kg_per_km         NUMERIC(12, 6)  NOT NULL,

  -- For PETRO profiles: self-referencing.  For ELECTRIC: points to the PETRO baseline.
  baseline_profile_id   TEXT        REFERENCES vehicle_profiles(id),

  source_note           TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.6  rides
-- Core fact table — all analytics derive from here
-- -------------------------------------------------------------
CREATE TABLE rides (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id                   UUID        NOT NULL REFERENCES users(id)             ON DELETE CASCADE,
  company_id                UUID        NOT NULL REFERENCES companies(id)          ON DELETE CASCADE,
  department_id             UUID                 REFERENCES departments(id)        ON DELETE SET NULL,

  origin_name               TEXT        NOT NULL,
  destination_name          TEXT        NOT NULL,

  distance_km               NUMERIC(10, 3)  NOT NULL CHECK (distance_km > 0),

  vehicle_profile_id        TEXT        NOT NULL REFERENCES vehicle_profiles(id),
  baseline_profile_id       TEXT        NOT NULL REFERENCES vehicle_profiles(id),

  purpose                   TEXT        NOT NULL
                              CHECK (purpose IN ('COMMUTE', 'BUSINESS', 'OTHER')),

  status                    TEXT        NOT NULL DEFAULT 'BOOKED'
                              CHECK (status IN ('BOOKED', 'COMPLETED', 'CANCELLED')),

  estimated_duration_minutes  INTEGER,
  actual_duration_minutes     INTEGER,

  price_vnd                 INTEGER     NOT NULL DEFAULT 0,
  actual_price_vnd          INTEGER,

  -- Pre-computed by backend service layer (see Section 4)
  baseline_co2_kg           NUMERIC(12, 3)  NOT NULL DEFAULT 0,
  actual_co2_kg             NUMERIC(12, 3)  NOT NULL DEFAULT 0,
  co2_saved_kg              NUMERIC(12, 3)  NOT NULL DEFAULT 0,

  fuel_saved_liters         NUMERIC(12, 3)  NOT NULL DEFAULT 0,
  tree_equivalent           NUMERIC(12, 3)  NOT NULL DEFAULT 0,

  green_score_added         INTEGER     NOT NULL DEFAULT 0,
  green_points_added        INTEGER     NOT NULL DEFAULT 0,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at              TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.7  rewards
-- Reward catalog
-- -------------------------------------------------------------
CREATE TABLE rewards (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  name                    TEXT        NOT NULL,
  description             TEXT,

  required_green_points   INTEGER     NOT NULL CHECK (required_green_points >= 0),
  value_vnd               INTEGER     NOT NULL DEFAULT 0,

  status                  TEXT        NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE')),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.8  reward_redemptions
-- -------------------------------------------------------------
CREATE TABLE reward_redemptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id               UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  reward_id             UUID        NOT NULL REFERENCES rewards(id)   ON DELETE RESTRICT,

  green_points_spent    INTEGER     NOT NULL CHECK (green_points_spent >= 0),
  voucher_code          TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.9  prediction_logs
-- Optional: store ML/statistical emission predictions
-- -------------------------------------------------------------
CREATE TABLE prediction_logs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id              UUID        NOT NULL REFERENCES companies(id)    ON DELETE CASCADE,
  user_id                 UUID                 REFERENCES users(id)        ON DELETE CASCADE,
  department_id           UUID                 REFERENCES departments(id)  ON DELETE SET NULL,

  scope                   TEXT        NOT NULL
                            CHECK (scope IN ('EMPLOYEE', 'DEPARTMENT', 'COMPANY')),

  period_from             DATE        NOT NULL,
  period_to               DATE        NOT NULL,

  predicted_period_from   DATE        NOT NULL,
  predicted_period_to     DATE        NOT NULL,

  current_emission_kg     NUMERIC(12, 3)  NOT NULL DEFAULT 0,
  predicted_emission_kg   NUMERIC(12, 3)  NOT NULL DEFAULT 0,

  current_saved_kg        NUMERIC(12, 3)  NOT NULL DEFAULT 0,
  predicted_saved_kg      NUMERIC(12, 3)  NOT NULL DEFAULT 0,

  predicted_ev_rate       NUMERIC(6, 2)   NOT NULL DEFAULT 0,

  confidence              NUMERIC(5, 2)   NOT NULL DEFAULT 0,

  model_id                TEXT        NOT NULL,
  model_type              TEXT        NOT NULL,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- 2.10  recommendation_logs
-- Stores AI (OpenAI / Claude / Mock) behavior recommendations
-- -------------------------------------------------------------
CREATE TABLE recommendation_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id      UUID        NOT NULL REFERENCES companies(id)    ON DELETE CASCADE,
  user_id         UUID                 REFERENCES users(id)        ON DELETE CASCADE,
  department_id   UUID                 REFERENCES departments(id)  ON DELETE SET NULL,

  scope           TEXT        NOT NULL
                    CHECK (scope IN ('EMPLOYEE', 'DEPARTMENT', 'COMPANY')),

  period_from     DATE        NOT NULL,
  period_to       DATE        NOT NULL,

  -- Snapshot of aggregated metrics sent to the AI
  input_summary   JSONB       NOT NULL,

  -- AI response (summary + recommendations array + nextBestAction)
  output_json     JSONB       NOT NULL,

  provider        TEXT        NOT NULL
                    CHECK (provider IN ('OPENAI', 'CLAUDE', 'MOCK')),

  model           TEXT        NOT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- INDEXES
-- =============================================================

-- users
CREATE INDEX idx_users_company_id    ON users(company_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role          ON users(role);

-- rides  (most queries hit this table)
CREATE INDEX idx_rides_user_created_at       ON rides(user_id,       created_at DESC);
CREATE INDEX idx_rides_company_created_at    ON rides(company_id,    created_at DESC);
CREATE INDEX idx_rides_department_created_at ON rides(department_id, created_at DESC);
CREATE INDEX idx_rides_vehicle_profile       ON rides(vehicle_profile_id);
CREATE INDEX idx_rides_status                ON rides(status);

-- reward_redemptions
CREATE INDEX idx_reward_redemptions_user_id  ON reward_redemptions(user_id);

-- AI logs
CREATE INDEX idx_prediction_logs_company_created_at    ON prediction_logs(company_id,   created_at DESC);
CREATE INDEX idx_recommendation_logs_user_created_at   ON recommendation_logs(user_id,  created_at DESC);