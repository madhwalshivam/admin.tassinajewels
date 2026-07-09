-- =====================================================================
-- TASSINA JEWELS — REVIEWS DATABASE SETUP
-- Run these commands in your Supabase SQL Editor (SQL Query panel).
-- This will create the reviews table, disable RLS, and add initial dummy reviews.
-- =====================================================================

-- 1. CREATE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. DISABLE ROW LEVEL SECURITY (RLS) FOR DEVELOPMENT
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- Fallback permissive policy in case RLS is forced enabled by Supabase
DROP POLICY IF EXISTS "Allow public reviews" ON reviews;
CREATE POLICY "Allow public reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- 3. SEED DUMMY REVIEWS
INSERT INTO reviews (name, rating, comment) VALUES
  ('Anya Sharma', 5, 'Absolutely stunning diamond eternity ring! The finish is extremely premium, and the gold shine is exactly what I was looking for. Highly recommend Tassina Jewels for wholesale purchases, their customer service is top notch.'),
  ('David Miller', 5, 'The Tiger Eye Stone Ring has a beautiful weight to it. Excellent craftsmanship and fast shipping. Our boutique customers have been loving the unique designs. Will definitely be ordering more in the next batch.'),
  ('Sophia Wang', 4, 'Very impressed with the Ruby Drop Earrings. The quality of the stones is superb and the packaging is very elegant. Excellent communication via WhatsApp throughout the booking process. Highly recommended.'),
  ('Rajesh Patel', 5, 'Exceptional quality jewelry. The gold bangles are solid, heavy, and polished to perfection. Superb B2B experience with direct manufacturing pricing. Easiest wholesale purchase I have done in years.')
ON CONFLICT DO NOTHING;
