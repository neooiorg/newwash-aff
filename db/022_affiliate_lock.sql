ALTER TABLE newwash_affiliates
  DROP CONSTRAINT IF EXISTS newwash_affiliates_status_check;

ALTER TABLE newwash_affiliates
  ADD CONSTRAINT newwash_affiliates_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'locked'));
