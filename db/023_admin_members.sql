CREATE TABLE IF NOT EXISTS newwash_admin_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newwash_admin_members_email_unique
  ON newwash_admin_members (lower(email));

CREATE INDEX IF NOT EXISTS newwash_admin_members_status_idx
  ON newwash_admin_members (status, created_at DESC);
