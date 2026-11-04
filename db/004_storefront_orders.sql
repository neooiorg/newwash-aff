ALTER TABLE newwash_orders
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'legacy';

CREATE UNIQUE INDEX IF NOT EXISTS newwash_orders_external_order_id_idx
  ON newwash_orders (external_order_id) WHERE external_order_id IS NOT NULL;
