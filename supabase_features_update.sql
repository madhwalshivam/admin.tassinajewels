-- =====================================================================
-- TASSINA JEWELS — DATABASE SCHEMA UPDATE
-- Run this script in your Supabase SQL Editor to support:
-- 1. Category visibility (visible column)
-- 2. Many-to-many product assignment (product_categories)
-- 3. Dynamic product filter system (filter_groups, filter_values, category_filters, product_filter_values)
-- 4. Initial categories seeding & migration of existing data
-- =====================================================================

-- Remove subcategories tables completely
DROP TABLE IF EXISTS product_subcategories CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;

-- 1. Add visibility flags to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true;

-- 2. Create Product-Category Junction Table
CREATE TABLE IF NOT EXISTS product_categories (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product_categories" ON product_categories;
DROP POLICY IF EXISTS "Service full access product_categories" ON product_categories;
CREATE POLICY "Public read product_categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Service full access product_categories" ON product_categories USING (auth.role() = 'service_role');

-- 3. Create Filter Groups Table
CREATE TABLE IF NOT EXISTS filter_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE filter_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read filter_groups" ON filter_groups;
DROP POLICY IF EXISTS "Service full access filter_groups" ON filter_groups;
CREATE POLICY "Public read filter_groups" ON filter_groups FOR SELECT USING (true);
CREATE POLICY "Service full access filter_groups" ON filter_groups USING (auth.role() = 'service_role');

-- 4. Create Filter Values Table
CREATE TABLE IF NOT EXISTS filter_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filter_group_id uuid REFERENCES filter_groups(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (filter_group_id, value)
);

ALTER TABLE filter_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read filter_values" ON filter_values;
DROP POLICY IF EXISTS "Service full access filter_values" ON filter_values;
CREATE POLICY "Public read filter_values" ON filter_values FOR SELECT USING (true);
CREATE POLICY "Service full access filter_values" ON filter_values USING (auth.role() = 'service_role');

-- 5. Create Category-Filter Junction Table (independent category filter settings)
CREATE TABLE IF NOT EXISTS category_filters (
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  filter_group_id uuid REFERENCES filter_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, filter_group_id)
);

ALTER TABLE category_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read category_filters" ON category_filters;
DROP POLICY IF EXISTS "Service full access category_filters" ON category_filters;
CREATE POLICY "Public read category_filters" ON category_filters FOR SELECT USING (true);
CREATE POLICY "Service full access category_filters" ON category_filters USING (auth.role() = 'service_role');

-- 6. Create Product-Filter Value Junction Table
CREATE TABLE IF NOT EXISTS product_filter_values (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  filter_value_id uuid REFERENCES filter_values(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, filter_value_id)
);

ALTER TABLE product_filter_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product_filter_values" ON product_filter_values;
DROP POLICY IF EXISTS "Service full access product_filter_values" ON product_filter_values;
CREATE POLICY "Public read product_filter_values" ON product_filter_values FOR SELECT USING (true);
CREATE POLICY "Service full access product_filter_values" ON product_filter_values USING (auth.role() = 'service_role');

-- 7. Seed Default Filter Groups
INSERT INTO filter_groups (name, slug, display_order) VALUES
  ('Gender', 'gender', 1),
  ('Plating', 'plating', 2),
  ('Material', 'material', 3),
  ('Color', 'color', 4),
  ('Stone Type', 'stone-type', 5)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;

-- 8. Seed Default Filter Values
DO $$
DECLARE
  gender_id uuid;
  plating_id uuid;
  material_id uuid;
  color_id uuid;
  stone_id uuid;
BEGIN
  SELECT id INTO gender_id FROM filter_groups WHERE slug = 'gender';
  SELECT id INTO plating_id FROM filter_groups WHERE slug = 'plating';
  SELECT id INTO material_id FROM filter_groups WHERE slug = 'material';
  SELECT id INTO color_id FROM filter_groups WHERE slug = 'color';
  SELECT id INTO stone_id FROM filter_groups WHERE slug = 'stone-type';

  IF gender_id IS NOT NULL THEN
    INSERT INTO filter_values (filter_group_id, value) VALUES (gender_id, 'Men'), (gender_id, 'Women') ON CONFLICT DO NOTHING;
  END IF;

  IF plating_id IS NOT NULL THEN
    INSERT INTO filter_values (filter_group_id, value) VALUES (plating_id, 'Gold'), (plating_id, 'Silver'), (plating_id, 'Rose Gold'), (plating_id, 'Black') ON CONFLICT DO NOTHING;
  END IF;

  IF material_id IS NOT NULL THEN
    INSERT INTO filter_values (filter_group_id, value) VALUES (material_id, 'Stainless Steel 304'), (material_id, 'Stainless Steel 316'), (material_id, 'Stainless Steel 204') ON CONFLICT DO NOTHING;
  END IF;

  IF color_id IS NOT NULL THEN
    INSERT INTO filter_values (filter_group_id, value) VALUES (color_id, 'Single Color'), (color_id, 'Multi Color') ON CONFLICT DO NOTHING;
  END IF;

  IF stone_id IS NOT NULL THEN
    INSERT INTO filter_values (filter_group_id, value) VALUES (stone_id, 'Zircon'), (stone_id, 'Crystal'), (stone_id, 'Natural Stone') ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 9. Seed Main Categories
INSERT INTO categories (name, slug, display_order, visible, image_url) VALUES
  ('Men''s', 'mens', 1, true, 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=600&auto=format&fit=cover'),
  ('Women''s', 'womens', 2, true, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=600&auto=format&fit=cover'),
  ('Vintage Jewellery', 'vintage-jewellery', 3, true, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=600&auto=format&fit=cover'),
  ('Stainless Steel Jewellery', 'stainless-steel-jewellery', 4, true, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=cover'),
  ('Natural Stone Jewellery', 'natural-stone-jewellery', 5, true, 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=600&auto=format&fit=cover'),
  ('Custom Jewellery', 'custom-jewellery', 6, true, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=600&auto=format&fit=cover')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order, visible = EXCLUDED.visible, image_url = COALESCE(categories.image_url, EXCLUDED.image_url);

-- 10. Assign Default Filters to Categories
DO $$
DECLARE
  cat_mens uuid;
  cat_womens uuid;
  cat_natural uuid;
  
  fg_gender uuid;
  fg_plating uuid;
  fg_material uuid;
  fg_color uuid;
  fg_stone uuid;
BEGIN
  SELECT id INTO cat_mens FROM categories WHERE slug = 'mens';
  SELECT id INTO cat_womens FROM categories WHERE slug = 'womens';
  SELECT id INTO cat_natural FROM categories WHERE slug = 'natural-stone-jewellery';

  SELECT id INTO fg_gender FROM filter_groups WHERE slug = 'gender';
  SELECT id INTO fg_plating FROM filter_groups WHERE slug = 'plating';
  SELECT id INTO fg_material FROM filter_groups WHERE slug = 'material';
  SELECT id INTO fg_color FROM filter_groups WHERE slug = 'color';
  SELECT id INTO fg_stone FROM filter_groups WHERE slug = 'stone-type';

  IF cat_mens IS NOT NULL AND fg_gender IS NOT NULL THEN
    INSERT INTO category_filters (category_id, filter_group_id) VALUES (cat_mens, fg_gender) ON CONFLICT DO NOTHING;
  END IF;

  IF cat_womens IS NOT NULL AND fg_gender IS NOT NULL THEN
    INSERT INTO category_filters (category_id, filter_group_id) VALUES (cat_womens, fg_gender) ON CONFLICT DO NOTHING;
  END IF;

  IF cat_natural IS NOT NULL THEN
    INSERT INTO category_filters (category_id, filter_group_id) VALUES 
      (cat_natural, fg_stone),
      (cat_natural, fg_color)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign remaining default filters to other categories by default
  -- (e.g. all categories get Plating and Material filters)
  INSERT INTO category_filters (category_id, filter_group_id)
  SELECT c.id, f.id
  FROM categories c, filter_groups f
  WHERE f.slug IN ('plating', 'material')
  ON CONFLICT DO NOTHING;
END $$;

-- 11. Migrate products category mappings based on current category string
DO $$
DECLARE
  v_jewellry_id uuid;
  ss_jewellry_id uuid;
  ns_jewellry_id uuid;
  custom_jewellry_id uuid;
BEGIN
  -- Get Parent Categories
  SELECT id INTO v_jewellry_id FROM categories WHERE slug = 'vintage-jewellery';
  SELECT id INTO ss_jewellry_id FROM categories WHERE slug = 'stainless-steel-jewellery';
  SELECT id INTO ns_jewellry_id FROM categories WHERE slug = 'natural-stone-jewellery';
  SELECT id INTO custom_jewellry_id FROM categories WHERE slug = 'custom-jewellery';

  -- Vintage Rings products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, v_jewellry_id FROM products WHERE category = 'vintage-rings'
  ON CONFLICT DO NOTHING;

  -- Vintage Earrings products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, v_jewellry_id FROM products WHERE category = 'vintage-earings'
  ON CONFLICT DO NOTHING;

  -- Vintage Necklace products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, v_jewellry_id FROM products WHERE category = 'vintage-necklace'
  ON CONFLICT DO NOTHING;

  -- Vintage Bracelet products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, v_jewellry_id FROM products WHERE category = 'vintage-bracelet'
  ON CONFLICT DO NOTHING;

  -- Vintage Jewelry Set products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, v_jewellry_id FROM products WHERE category = 'vintage-jewellry-set'
  ON CONFLICT DO NOTHING;

  -- Stainless Steel Bracelet products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, ss_jewellry_id FROM products WHERE category = 'stainless-steel-bracelet'
  ON CONFLICT DO NOTHING;

  -- Stainless Steel Rings products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, ss_jewellry_id FROM products WHERE category = 'stainless-steel-rings'
  ON CONFLICT DO NOTHING;

  -- Stainless Steel Necklace products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, ss_jewellry_id FROM products WHERE category = 'stainless-steel-necklace'
  ON CONFLICT DO NOTHING;

  -- Stainless Steel Earrings products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, ss_jewellry_id FROM products WHERE category = 'stainless-steel-earings'
  ON CONFLICT DO NOTHING;

  -- Natural Stones products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, ns_jewellry_id FROM products WHERE category = 'natural-stones-jewellry'
  ON CONFLICT DO NOTHING;

  -- Custom Jewellery products
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, custom_jewellry_id FROM products WHERE category = 'custom-jewellery'
  ON CONFLICT DO NOTHING;

  -- Legacy Rings products -> map to Custom Jewellery
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, custom_jewellry_id FROM products WHERE category = 'rings'
  ON CONFLICT DO NOTHING;
  
  -- Legacy Necklace products -> map to Custom Jewellery
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, custom_jewellry_id FROM products WHERE category = 'necklace'
  ON CONFLICT DO NOTHING;
  
  -- Legacy Bracelets products -> map to Custom Jewellery
  INSERT INTO product_categories (product_id, category_id)
  SELECT id, custom_jewellry_id FROM products WHERE category = 'bracelets' OR category = 'bracelet'
  ON CONFLICT DO NOTHING;

  -- Restore/keep all categories intact to preserve legacy data
  INSERT INTO categories (name, slug, display_order, visible, image_url) VALUES
    ('Vintage Rings', 'vintage-rings', 7, true, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=cover'),
    ('Vintage Earrings', 'vintage-earings', 8, true, 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?q=80&w=600&auto=format&fit=cover'),
    ('Vintage Necklaces', 'vintage-necklace', 9, true, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=cover'),
    ('Vintage Bracelets', 'vintage-bracelet', 10, true, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=600&auto=format&fit=cover'),
    ('Vintage Jewelry Sets', 'vintage-jewellry-set', 11, true, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=600&auto=format&fit=cover'),
    ('Stainless Steel Bracelets', 'stainless-steel-bracelet', 12, true, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=600&auto=format&fit=cover'),
    ('Stainless Steel Rings', 'stainless-steel-rings', 13, true, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=cover'),
    ('Stainless Steel Necklaces', 'stainless-steel-necklace', 14, true, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=cover'),
    ('Stainless Steel Earrings', 'stainless-steel-earings', 15, true, 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?q=80&w=600&auto=format&fit=cover'),
    ('Natural Stones', 'natural-stones-jewellry', 16, true, 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=600&auto=format&fit=cover'),
    ('Leather Jewellery', 'leather-jewellry', 17, true, 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=600&auto=format&fit=cover')
  ON CONFLICT (slug) DO UPDATE SET image_url = COALESCE(categories.image_url, EXCLUDED.image_url);
END $$;
