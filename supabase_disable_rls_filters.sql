-- =====================================================================
-- TASSINA JEWELS — DISABLE RLS FOR DYNAMIC FILTERS
-- Run this script in your Supabase SQL Editor to allow the admin panel
-- to add, edit, and assign filters directly from the client.
-- =====================================================================

-- 1. Disable Row Level Security (RLS) on filter and mapping tables
ALTER TABLE filter_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE filter_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_filters DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_filter_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing RLS policies to prevent any conflicts
DROP POLICY IF EXISTS "Public read filter_groups" ON filter_groups;
DROP POLICY IF EXISTS "Service full access filter_groups" ON filter_groups;

DROP POLICY IF EXISTS "Public read filter_values" ON filter_values;
DROP POLICY IF EXISTS "Service full access filter_values" ON filter_values;

DROP POLICY IF EXISTS "Public read category_filters" ON category_filters;
DROP POLICY IF EXISTS "Service full access category_filters" ON category_filters;

DROP POLICY IF EXISTS "Public read product_filter_values" ON product_filter_values;
DROP POLICY IF EXISTS "Service full access product_filter_values" ON product_filter_values;

DROP POLICY IF EXISTS "Public read product_categories" ON product_categories;
DROP POLICY IF EXISTS "Service full access product_categories" ON product_categories;
