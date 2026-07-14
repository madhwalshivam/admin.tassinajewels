-- =====================================================================
-- TASSINA JEWELS — VARIATIONS V2 MIGRATION
-- Adds: image_url, barcode, description per variation
--       variation_images table for gallery-per-variation
-- Safe to run multiple times (idempotent). Run in Supabase SQL Editor.
-- =====================================================================

-- 1. Extend product_variations with new columns
ALTER TABLE product_variations
  ADD COLUMN IF NOT EXISTS image_url       text,
  ADD COLUMN IF NOT EXISTS barcode         text,
  ADD COLUMN IF NOT EXISTS description     text,
  ADD COLUMN IF NOT EXISTS specifications  text;   -- JSON string or plain text

-- 2. CREATE variation_images table (gallery per variation)
CREATE TABLE IF NOT EXISTS variation_images (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  variation_id   uuid REFERENCES product_variations(id) ON DELETE CASCADE NOT NULL,
  product_id     uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url      text NOT NULL,
  display_order  integer DEFAULT 0,
  alt_text       text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variation_images_variation_id ON variation_images(variation_id);
CREATE INDEX IF NOT EXISTS idx_variation_images_product_id  ON variation_images(product_id);

-- Disable RLS (consistent with rest of schema)
ALTER TABLE variation_images DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public variation_images" ON variation_images;
CREATE POLICY "Allow public variation_images" ON variation_images FOR ALL USING (true) WITH CHECK (true);

-- 3. Ensure product_images table has RLS disabled (idempotent)
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- 4. Ensure product_variations also still has RLS disabled
ALTER TABLE product_variations DISABLE ROW LEVEL SECURITY;

-- Done!
-- product_variations now has: image_url, barcode, description, specifications
-- variation_images holds multiple gallery images per variation
