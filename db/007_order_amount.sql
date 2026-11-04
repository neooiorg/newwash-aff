ALTER TABLE newwash_orders
  ADD COLUMN IF NOT EXISTS order_amount bigint;

ALTER TABLE newwash_orders
  DROP CONSTRAINT IF EXISTS newwash_orders_order_amount_check;

ALTER TABLE newwash_orders
  ADD CONSTRAINT newwash_orders_order_amount_check
  CHECK (order_amount IS NULL OR order_amount >= 0);
