ALTER TABLE newwash_settings
  ADD COLUMN IF NOT EXISTS embed_offset_x integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS embed_offset_y integer NOT NULL DEFAULT 24;

