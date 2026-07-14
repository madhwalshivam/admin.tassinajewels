-- =====================================================================
-- TASSINA JEWELS — PRODUCT VARIATIONS & IMAGE GALLERY MIGRATION
-- Run this in your Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- 1. CREATE PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS product_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  alt_text text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast product lookups
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);

-- Disable RLS (consistent with rest of schema)
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public product_images" ON product_images;
CREATE POLICY "Allow public product_images" ON product_images FOR ALL USING (true) WITH CHECK (true);

-- 2. CREATE PRODUCT VARIATIONS TABLE
-- Flexible schema: variation_name = "Size", option_value = "Small"
-- This allows unlimited variation types without schema changes.
CREATE TABLE IF NOT EXISTS product_variations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variation_name text NOT NULL,       -- e.g. "Size", "Color", "Material", "Weight"
  option_value text NOT NULL,          -- e.g. "Small", "Red", "18K Gold", "5g"
  price decimal(10,2),                 -- variation-specific price (overrides base price)
  sale_price decimal(10,2),            -- optional sale/discounted price
  sku text,                            -- optional variation SKU
  stock_quantity integer DEFAULT 0,
  stock_status text DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_order ON product_variations(product_id, display_order);

-- Disable RLS
ALTER TABLE product_variations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public product_variations" ON product_variations;
CREATE POLICY "Allow public product_variations" ON product_variations FOR ALL USING (true) WITH CHECK (true);

-- 3. MIGRATE EXISTING product.image_url → product_images TABLE
-- Only migrate if the product doesn't already have images in the table
INSERT INTO product_images (product_id, image_url, is_primary, display_order)
SELECT 
  p.id,
  p.image_url,
  true,
  0
FROM products p
WHERE p.image_url IS NOT NULL
  AND p.image_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
  )
ON CONFLICT DO NOTHING;

-- 4. ADD stock_quantity & stock_status to products table (base product level)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status text DEFAULT 'in_stock';

-- Done! All new data goes into product_images and product_variations tables.
-- The existing products.image_url and products.images fields are kept for backward compatibility.
