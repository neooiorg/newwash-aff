CREATE TABLE IF NOT EXISTS newwash_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  storefront_url text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO newwash_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE newwash_orders
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
