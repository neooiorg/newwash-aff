CREATE TABLE IF NOT EXISTS newwash_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('laundry', 'other')),
  label text NOT NULL,
  english text NOT NULL DEFAULT '',
  duration_label text NOT NULL,
  duration_hours integer NOT NULL CHECK (duration_hours BETWEEN 1 AND 720),
  price_per_kg integer CHECK (price_per_kg IS NULL OR price_per_kg >= 0),
  min_kg integer NOT NULL DEFAULT 0 CHECK (min_kg BETWEEN 0 AND 1000),
  note text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO newwash_services
  (code, category, label, english, duration_label, duration_hours, price_per_kg, min_kg, note, sort_order)
VALUES
  ('standard', 'laundry', 'Giặt siêu tốc', 'Standard wash & dry', '24 giờ', 24, 30000, 1, '', 10),
  ('express', 'laundry', 'Giặt hỏa tốc', 'Express wash & dry', '4 giờ', 4, 50000, 5, '', 20),
  ('priority', 'laundry', 'Giặt ưu tiên', 'Priority wash', '2 giờ', 2, 150000, 1, 'Chỉ áp dụng Quận 1, 3, 5', 30),
  ('special', 'laundry', 'Yêu cầu đặc biệt', 'Special request', '24–48 giờ', 48, NULL, 0, '', 40),
  ('bedding', 'other', 'Giặt chăn ga', 'Bedding service', '24–48 giờ', 48, NULL, 0, '', 50),
  ('dry-clean', 'other', 'Giặt hấp', 'Dry cleaning', '24–48 giờ', 48, NULL, 0, '', 60)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE newwash_settings
  ADD COLUMN IF NOT EXISTS white_wash_fee integer NOT NULL DEFAULT 80000;

DROP TRIGGER IF EXISTS newwash_services_realtime ON newwash_services;
CREATE TRIGGER newwash_services_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_services
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();
