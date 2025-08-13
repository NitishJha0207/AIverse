/*
  # Fix Admin Portal Schema
  
  1. Changes
    - Update NULL values to defaults
    - Add NOT NULL constraints and defaults
    - Fix foreign key relationships
*/

-- First update any NULL values in app_submissions
UPDATE app_submissions 
SET price = 0 
WHERE price IS NULL;

-- Then update NULL values in app_listings
UPDATE app_listings 
SET 
  price = 0 
WHERE price IS NULL;

UPDATE app_listings 
SET 
  rating = 0 
WHERE rating IS NULL;

UPDATE app_listings 
SET 
  reviews_count = 0 
WHERE reviews_count IS NULL;

-- Now add NOT NULL constraints and defaults to app_submissions
ALTER TABLE app_submissions
ALTER COLUMN price SET DEFAULT 0,
ALTER COLUMN price SET NOT NULL;

-- Add NOT NULL constraints and defaults to app_listings
ALTER TABLE app_listings
ALTER COLUMN price SET DEFAULT 0,
ALTER COLUMN price SET NOT NULL,
ALTER COLUMN rating SET DEFAULT 0,
ALTER COLUMN rating SET NOT NULL,
ALTER COLUMN reviews_count SET DEFAULT 0,
ALTER COLUMN reviews_count SET NOT NULL;

-- Fix developer profile relationships
DO $$ BEGIN
  ALTER TABLE developer_profiles
  ADD CONSTRAINT developer_profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;