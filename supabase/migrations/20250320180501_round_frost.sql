/*
  # Add AI Content Tables
  
  1. New Tables
    - ai_updates: Stores scraped AI news and updates
    - ai_launches: Stores new AI model launches
    
  2. Security
    - Enable RLS
    - Add policies for content access
*/

-- Create ai_updates table
CREATE TABLE IF NOT EXISTS ai_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  source_url text,
  category text,
  tags text[] DEFAULT '{}',
  published_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  engagement jsonb DEFAULT '{"likes": 0, "comments": 0, "shares": 0}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_launches table
CREATE TABLE IF NOT EXISTS ai_launches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  content text NOT NULL,
  provider text NOT NULL,
  source text NOT NULL,
  source_url text,
  category text,
  capabilities text[] DEFAULT '{}',
  use_cases text[] DEFAULT '{}',
  pricing text,
  api_url text,
  documentation_url text,
  tags text[] DEFAULT '{}',
  published_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_launches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read published updates"
  ON ai_updates
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Anyone can read published launches"
  ON ai_launches
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage updates"
  ON ai_updates
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage launches"
  ON ai_launches
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_ai_updates_published_at ON ai_updates(published_at DESC);
CREATE INDEX idx_ai_updates_category ON ai_updates(category);
CREATE INDEX idx_ai_updates_status ON ai_updates(status);
CREATE INDEX idx_ai_updates_tags ON ai_updates USING gin(tags);

CREATE INDEX idx_ai_launches_published_at ON ai_launches(published_at DESC);
CREATE INDEX idx_ai_launches_category ON ai_launches(category);
CREATE INDEX idx_ai_launches_status ON ai_launches(status);
CREATE INDEX idx_ai_launches_tags ON ai_launches USING gin(tags);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_ai_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_ai_updates_timestamp
  BEFORE UPDATE ON ai_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_content_timestamp();

CREATE TRIGGER update_ai_launches_timestamp
  BEFORE UPDATE ON ai_launches
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_content_timestamp();