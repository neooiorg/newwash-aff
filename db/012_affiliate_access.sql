ALTER TABLE newwash_affiliates
  ADD COLUMN IF NOT EXISTS access_secret_hash text;

CREATE TABLE IF NOT EXISTS newwash_affiliate_login_attempts (
  identifier_hash varchar(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
