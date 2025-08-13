-- Safe table creation with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS developer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  team_size text CHECK (team_size IN ('solo', 'team')),
  profession text NOT NULL,
  specialization text[] DEFAULT '{}',
  country text NOT NULL,
  phone_number text,
  is_verified boolean DEFAULT false,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'active', 'suspended')),
  registration_date timestamptz DEFAULT now(),
  subscription_ends timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Safe RLS enable
DO $$ BEGIN
  ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Safe policy creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Developers can view own profile" ON developer_profiles;
  CREATE POLICY "Developers can view own profile"
    ON developer_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "Developers can update own profile" ON developer_profiles;
  CREATE POLICY "Developers can update own profile"
    ON developer_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  DROP POLICY IF EXISTS "Developers can insert own profile" ON developer_profiles;
  CREATE POLICY "Developers can insert own profile"
    ON developer_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
END $$;

-- App Submissions
CREATE TABLE IF NOT EXISTS app_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES developer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  short_description text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  price numeric(10,2) DEFAULT 0,
  icon_url text,
  screenshots text[] DEFAULT '{}',
  features text[] DEFAULT '{}',
  required_permissions jsonb DEFAULT '[]',
  binary_url text,
  binary_type text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  submission_date timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE app_submissions ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Developers can manage own submissions" ON app_submissions;
  CREATE POLICY "Developers can manage own submissions"
    ON app_submissions
    FOR ALL
    TO authenticated
    USING (developer_id IN (
      SELECT id FROM developer_profiles WHERE user_id = auth.uid()
    ))
    WITH CHECK (developer_id IN (
      SELECT id FROM developer_profiles WHERE user_id = auth.uid()
    ));
END $$;

-- Developer Payouts
CREATE TABLE IF NOT EXISTS developer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES developer_profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE developer_payouts ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Developers can view own payouts" ON developer_payouts;
  CREATE POLICY "Developers can view own payouts"
    ON developer_payouts
    FOR SELECT
    TO authenticated
    USING (developer_id IN (
      SELECT id FROM developer_profiles WHERE user_id = auth.uid()
    ));
END $$;

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe trigger creation
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_developer_profiles_updated_at ON developer_profiles;
  CREATE TRIGGER update_developer_profiles_updated_at
    BEFORE UPDATE ON developer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_app_submissions_updated_at ON app_submissions;
  CREATE TRIGGER update_app_submissions_updated_at
    BEFORE UPDATE ON app_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_developer_payouts_updated_at ON developer_payouts;
  CREATE TRIGGER update_developer_payouts_updated_at
    BEFORE UPDATE ON developer_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- Function to sync app submissions with app listings
CREATE OR REPLACE FUNCTION sync_app_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO app_listings (
      id,
      name,
      description,
      short_description,
      developer_name,
      price,
      category,
      tags,
      icon_url,
      screenshots,
      features,
      is_available
    )
    VALUES (
      NEW.id,
      NEW.name,
      NEW.description,
      NEW.short_description,
      (SELECT company_name FROM developer_profiles WHERE id = NEW.developer_id),
      NEW.price,
      NEW.category,
      NEW.tags,
      NEW.icon_url,
      NEW.screenshots,
      NEW.features,
      true
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      short_description = EXCLUDED.short_description,
      developer_name = EXCLUDED.developer_name,
      price = EXCLUDED.price,
      category = EXCLUDED.category,
      tags = EXCLUDED.tags,
      icon_url = EXCLUDED.icon_url,
      screenshots = EXCLUDED.screenshots,
      features = EXCLUDED.features,
      is_available = true,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS sync_app_listing_on_approval ON app_submissions;
  CREATE TRIGGER sync_app_listing_on_approval
    AFTER UPDATE ON app_submissions
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION sync_app_listing();
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;