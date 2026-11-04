CREATE OR REPLACE FUNCTION newwash_notify_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'newwash_changes',
    json_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newwash_affiliates_realtime ON newwash_affiliates;
CREATE TRIGGER newwash_affiliates_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_affiliates
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();

DROP TRIGGER IF EXISTS newwash_orders_realtime ON newwash_orders;
CREATE TRIGGER newwash_orders_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_orders
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();

DROP TRIGGER IF EXISTS newwash_settings_realtime ON newwash_settings;
CREATE TRIGGER newwash_settings_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_settings
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();
