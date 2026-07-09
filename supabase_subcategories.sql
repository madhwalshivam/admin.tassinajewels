-- =======================================================
-- TASSINA JEWELS — DATABASE SCHEMA UPDATE (SUBCATEGORIES & SETTINGS)
-- Run these commands in your Supabase SQL Editor:
-- =======================================================

-- 1. Create Subcategories Table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Alter products table to link to subcategories
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL;

-- 3. Enable Row Level Security (RLS) on Subcategories
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies for Subcategories
CREATE POLICY "Public read subcategories" ON subcategories FOR SELECT USING (true);
CREATE POLICY "Service full access subcategories" ON subcategories USING (auth.role() = 'service_role');

-- 5. Create Storefront Settings Table
CREATE TABLE IF NOT EXISTS storefront_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. Enable RLS on Storefront Settings
ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;

-- 7. Set RLS Policies for Storefront Settings
CREATE POLICY "Public read settings" ON storefront_settings FOR SELECT USING (true);
CREATE POLICY "Service full access settings" ON storefront_settings USING (auth.role() = 'service_role');

-- 8. Insert Default Settings
INSERT INTO storefront_settings (key, value) VALUES
  ('hero_video_url', 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-sparkling-gold-chains-and-rings-44224-large.mp4'),
  ('hero_title', 'Tassina Jewels B2B Portal'),
  ('hero_subtitle', 'Explore our curated collections manufactured directly at our boutique facilities. Certified premium purity, tailored designs, and streamlined wholesale pricing for global jewelry leaders.'),
  ('whatsapp_number', '+1234567890')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
