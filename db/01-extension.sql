-- =============================================================
-- 01-extension.sql
-- Enable required PostgreSQL extensions
-- =============================================================

-- UUID generation (gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Optional: pg_trgm for future full-text search on names
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";