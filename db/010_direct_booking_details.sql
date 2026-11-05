ALTER TABLE newwash_orders
  ADD COLUMN IF NOT EXISTS booking_details jsonb NOT NULL DEFAULT '{}'::jsonb;

