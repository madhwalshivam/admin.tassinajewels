-- =====================================================================
-- TASSINA JEWELS — COMPLETE SUPABASE DATABASE SETUP
-- Run these commands in your Supabase SQL Editor (SQL Query panel).
-- This will create all tables, linkages, and populate default settings.
-- =====================================================================

-- 1. DROP EXISTING TABLES IF THEY EXIST (To start fresh)
DROP TABLE IF EXISTS storefront_settings CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. CREATE CATEGORIES TABLE
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  image_url text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. CREATE SUBCATEGORIES TABLE
CREATE TABLE subcategories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. CREATE PRODUCTS TABLE
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  compare_price decimal(10,2),
  image_url text,
  images jsonb DEFAULT '[]',
  category text, -- stores category slug for storefront queries
  subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  tags text[],
  sku text,
  moq integer DEFAULT 10,
  available boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. CREATE INQUIRIES TABLE
CREATE TABLE inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_title text,
  name text NOT NULL,
  company text,
  email text NOT NULL,
  whatsapp text,
  quantity integer,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 6. CREATE STOREFRONT SETTINGS TABLE
CREATE TABLE storefront_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 7. DISABLE ROW LEVEL SECURITY (RLS) & CREATE PERMISSIVE POLICIES FOR DEVELOPMENT
-- This ensures the client-side admin panel can write directly using public keys.
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_settings DISABLE ROW LEVEL SECURITY;

-- Fallback permissive policies in case RLS is forced enabled by Supabase
DROP POLICY IF EXISTS "Allow public categories" ON categories;
CREATE POLICY "Allow public categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public subcategories" ON subcategories;
CREATE POLICY "Allow public subcategories" ON subcategories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public products" ON products;
CREATE POLICY "Allow public products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public inquiries" ON inquiries;
CREATE POLICY "Allow public inquiries" ON inquiries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public storefront_settings" ON storefront_settings;
CREATE POLICY "Allow public storefront_settings" ON storefront_settings FOR ALL USING (true) WITH CHECK (true);

-- 8. SEED INITIAL DATA

-- A. Insert Default Storefront Settings
INSERT INTO storefront_settings (key, value) VALUES
  ('hero_video_url', 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-sparkling-gold-chains-and-rings-44224-large.mp4'),
  ('hero_title', 'Tassina Jewels B2B Portal'),
  ('hero_subtitle', 'Explore our curated collections manufactured directly at our boutique facilities. Certified premium purity, tailored designs, and streamlined wholesale pricing for global jewelry leaders.'),
  ('whatsapp_number', '+919999999999')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- B. Insert Default Categories & Subcategories
WITH inserted_cats AS (
  INSERT INTO categories (name, slug, display_order) VALUES
    ('Rings', 'rings', 1),
    ('Necklaces', 'necklaces', 2),
    ('Bracelets', 'bracelets', 3),
    ('Earrings', 'earrings', 4)
  RETURNING id, name
)
INSERT INTO subcategories (category_id, name, slug, display_order)
SELECT id, name || ' - Premium', lower(name) || '-premium', 1 FROM inserted_cats;
