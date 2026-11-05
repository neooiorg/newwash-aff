CREATE TABLE IF NOT EXISTS newwash_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES newwash_affiliates(id) ON DELETE RESTRICT,
  amount bigint NOT NULL CHECK (amount >= 10000),
  bank_name text NOT NULL CHECK (length(bank_name) BETWEEN 2 AND 80),
  account_number text NOT NULL CHECK (length(account_number) BETWEEN 4 AND 40),
  account_holder text NOT NULL CHECK (length(account_holder) BETWEEN 2 AND 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS newwash_withdrawals_affiliate_date_idx
  ON newwash_withdrawals (affiliate_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS newwash_withdrawals_status_date_idx
  ON newwash_withdrawals (status, requested_at DESC);

DROP TRIGGER IF EXISTS newwash_withdrawals_realtime ON newwash_withdrawals;
CREATE TRIGGER newwash_withdrawals_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_withdrawals
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();
