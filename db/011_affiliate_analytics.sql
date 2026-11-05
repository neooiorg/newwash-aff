ALTER TABLE newwash_affiliates
  ADD COLUMN IF NOT EXISTS commission_rate_bps integer NOT NULL DEFAULT 650;

ALTER TABLE newwash_affiliates
  DROP CONSTRAINT IF EXISTS newwash_affiliates_commission_rate_check;

ALTER TABLE newwash_affiliates
  ADD CONSTRAINT newwash_affiliates_commission_rate_check
  CHECK (commission_rate_bps BETWEEN 0 AND 10000);

CREATE TABLE IF NOT EXISTS newwash_affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  affiliate_id uuid NOT NULL REFERENCES newwash_affiliates(id) ON DELETE CASCADE,
  landing_url text NOT NULL DEFAULT '',
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newwash_affiliate_clicks_affiliate_date_idx
  ON newwash_affiliate_clicks (affiliate_id, clicked_at DESC);

CREATE OR REPLACE FUNCTION newwash_notify_change() RETURNS trigger AS $$
DECLARE
  row_data jsonb;
  affiliate_id_value text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  affiliate_id_value := CASE
    WHEN TG_TABLE_NAME = 'newwash_affiliates' THEN row_data->>'id'
    ELSE row_data->>'affiliate_id'
  END;
  PERFORM pg_notify(
    'newwash_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'affiliateId', affiliate_id_value
    )::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newwash_affiliate_clicks_realtime ON newwash_affiliate_clicks;
CREATE TRIGGER newwash_affiliate_clicks_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();
