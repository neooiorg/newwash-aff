DROP INDEX IF EXISTS newwash_orders_kiotviet_order_code_idx;

ALTER TABLE newwash_orders
  DROP COLUMN IF EXISTS kiotviet_order_code,
  DROP COLUMN IF EXISTS kiotviet_invoice_code,
  DROP COLUMN IF EXISTS kiotviet_status;
