ALTER TABLE newwash_services
  ADD COLUMN IF NOT EXISTS icon_key text NOT NULL DEFAULT 'basket-sparkles';

UPDATE newwash_services
SET icon_key = CASE code
  WHEN 'standard' THEN 'washer-lightning'
  WHEN 'express' THEN 'washer-clock'
  WHEN 'priority' THEN 'basket-crown'
  WHEN 'special' THEN 'basket-sparkles'
  WHEN 'bedding' THEN 'basket-sparkles'
  WHEN 'dry-clean' THEN 'hangers'
  ELSE icon_key
END
WHERE icon_key = 'basket-sparkles';
