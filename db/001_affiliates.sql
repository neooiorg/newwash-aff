CREATE TABLE IF NOT EXISTS newwash_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  contact text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'Trực tiếp',
  code varchar(20) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newwash_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer text NOT NULL CHECK (length(customer) BETWEEN 1 AND 80),
  phone varchar(20) NOT NULL,
  service text NOT NULL,
  address text NOT NULL CHECK (length(address) BETWEEN 1 AND 240),
  affiliate_id uuid REFERENCES newwash_affiliates(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'Mới' CHECK (status IN ('Mới', 'Đang xử lý', 'Hoàn tất')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newwash_orders_created_at_idx ON newwash_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS newwash_orders_affiliate_id_idx ON newwash_orders (affiliate_id);
