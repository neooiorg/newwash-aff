ALTER TABLE newwash_affiliates ADD COLUMN IF NOT EXISTS status text;

UPDATE newwash_affiliates SET status = 'approved' WHERE status IS NULL;

ALTER TABLE newwash_affiliates
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN code DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newwash_affiliates_status_check'
  ) THEN
    ALTER TABLE newwash_affiliates
      ADD CONSTRAINT newwash_affiliates_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS newwash_affiliates_status_created_at_idx
  ON newwash_affiliates (status, created_at DESC);
