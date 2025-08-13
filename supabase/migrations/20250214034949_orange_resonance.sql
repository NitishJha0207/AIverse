/*
  # AI App Store Schema

  1. New Tables
    - `user_profiles`
      - Extended user information and preferences
      - Privacy settings for data sharing
    - `app_listings`
      - Classified listings from various app stores
      - Reviews and ratings aggregation
    - `app_recommendations`
      - User-specific app recommendations
    - `app_interest_notifications`
      - Track user interest in unavailable apps
      - Notification management for developers

  2. Security
    - Enable RLS on all tables
    - Policies for public/private data access
    - Data sharing controls
*/

-- User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  full_name text,
  date_of_birth date,
  country text,
  hobbies text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  privacy_settings jsonb DEFAULT '{
    "share_location": false,
    "share_phone": false,
    "share_preferences": false,
    "share_hobbies": false,
    "share_name": false,
    "share_country": false,
    "share_dob": false
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- App Listings table (for classifieds)
CREATE TABLE IF NOT EXISTS app_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  short_description text,
  developer_name text,
  original_store text,
  store_url text,
  price numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  category text,
  tags text[],
  rating numeric(3,2),
  reviews_count integer DEFAULT 0,
  reviews jsonb DEFAULT '[]'::jsonb,
  icon_url text,
  screenshots text[],
  features text[],
  is_available boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app listings"
  ON app_listings
  FOR SELECT
  USING (true);

-- App Recommendations table
CREATE TABLE IF NOT EXISTS app_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  app_id uuid REFERENCES app_listings(id),
  score numeric(5,4),
  reason jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recommendations"
  ON app_recommendations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- App Interest Notifications table
CREATE TABLE IF NOT EXISTS app_interest_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES app_listings(id),
  user_id uuid REFERENCES user_profiles(id),
  developer_email text,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_interest_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON app_interest_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION notify_developer_of_interest()
RETURNS TRIGGER AS $$
BEGIN
  -- This would typically integrate with an email service
  -- For now, we'll just mark it as sent
  UPDATE app_interest_notifications
  SET 
    notification_sent = true,
    notification_sent_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_app_interest
  AFTER INSERT ON app_interest_notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_developer_of_interest();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_listings_updated_at
  BEFORE UPDATE ON app_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();