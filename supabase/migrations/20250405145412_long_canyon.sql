/*
  # Enterprise Features Schema
  
  1. New Tables
    - `organizations`: Stores enterprise organization data
    - `licenses`: Manages license tiers and features
    - `organization_users`: Links users to organizations with roles
    - `teams`: Manages team structures within organizations
    - `team_members`: Tracks team membership
    - `enterprise_settings`: Stores organization-specific settings
    - `audit_logs`: Tracks all actions for compliance
    - `support_tickets`: Manages enterprise support requests
    
  2. Security
    - Enable RLS on all tables
    - Add policies for organization-based access control
    - Implement role-based permissions
*/

-- Create license_tiers enum
DO $$ BEGIN
  CREATE TYPE license_tier AS ENUM ('basic', 'enterprise_standard', 'enterprise_premium');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE,
  logo_url text,
  admin_user_id uuid REFERENCES auth.users(id),
  sso_enabled boolean DEFAULT false,
  sso_provider text,
  sso_config jsonb DEFAULT '{}'::jsonb,
  custom_branding jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('basic', 'enterprise_standard', 'enterprise_premium')),
  max_users integer NOT NULL,
  current_users integer DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add license_id to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS license_id uuid REFERENCES licenses(id);

-- Create organization_users table
CREATE TABLE IF NOT EXISTS organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  department text,
  job_title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create app_containers table
CREATE TABLE IF NOT EXISTS app_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES app_listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('running', 'stopped', 'failed')),
  resource_usage jsonb DEFAULT '{
    "cpu_percent": 0,
    "memory_mb": 0,
    "storage_mb": 0
  }'::jsonb,
  network_isolation jsonb DEFAULT '{
    "allowed_domains": [],
    "blocked_domains": []
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enterprise_settings table
CREATE TABLE IF NOT EXISTS enterprise_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  security_policy jsonb DEFAULT '{
    "password_policy": {
      "min_length": 8,
      "require_uppercase": true,
      "require_lowercase": true,
      "require_numbers": true,
      "require_special_chars": true,
      "max_age_days": 90
    },
    "mfa_required": false,
    "session_timeout_minutes": 60,
    "ip_restrictions": []
  }'::jsonb,
  compliance_settings jsonb DEFAULT '{
    "data_retention_days": 365,
    "audit_log_enabled": true,
    "dlp_enabled": false,
    "dlp_rules": []
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for organizations
CREATE POLICY "Organization admins can manage their organization"
  ON organizations
  FOR ALL
  TO authenticated
  USING (
    admin_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    admin_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
    )
  );

-- Create policies for licenses
CREATE POLICY "Organization admins can view licenses"
  ON licenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE o.id = licenses.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage licenses"
  ON licenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Create policies for organization_users
CREATE POLICY "Organization admins can manage users"
  ON organization_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
  );

CREATE POLICY "Users can view their organization membership"
  ON organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for teams
CREATE POLICY "Organization members can view teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = teams.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins and managers can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = teams.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = teams.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Create policies for team_members
CREATE POLICY "Team members can view their teams"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_users ou ON t.organization_id = ou.organization_id
      WHERE t.id = team_members.team_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_users ou ON t.organization_id = ou.organization_id
      WHERE t.id = team_members.team_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_users ou ON t.organization_id = ou.organization_id
      WHERE t.id = team_members.team_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
    )
  );

-- Create policies for app_containers
CREATE POLICY "Users can manage their app containers"
  ON app_containers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization admins can view all containers"
  ON app_containers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = app_containers.organization_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies for enterprise_settings
CREATE POLICY "Organization admins can manage settings"
  ON enterprise_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = enterprise_settings.organization_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = enterprise_settings.organization_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization users can view settings"
  ON enterprise_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = enterprise_settings.organization_id
      AND user_id = auth.uid()
    )
  );

-- Create policies for audit_logs
CREATE POLICY "Organization admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = audit_logs.organization_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for support_tickets
CREATE POLICY "Organization users can create and view their tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = support_tickets.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Organization users can create tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = support_tickets.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Ticket owners and admins can update tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = support_tickets.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
    ) OR
    assigned_to = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = support_tickets.organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
    ) OR
    assigned_to = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_app_containers_user_id ON app_containers(user_id);
CREATE INDEX IF NOT EXISTS idx_app_containers_org_id ON app_containers(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_organization_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_organization_id,
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    current_setting('request.headers')::json->>'x-forwarded-for',
    current_setting('request.headers')::json->>'user-agent'
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has enterprise access
CREATE OR REPLACE FUNCTION has_enterprise_access(
  p_user_id uuid,
  p_required_tier text DEFAULT 'enterprise_standard'
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_users ou
    JOIN organizations o ON ou.organization_id = o.id
    JOIN licenses l ON o.license_id = l.id
    WHERE ou.user_id = p_user_id
    AND l.tier = p_required_tier
    AND l.is_active = true
    AND l.expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(
  p_user_id uuid
) RETURNS uuid AS $$
DECLARE
  v_organization_id uuid;
BEGIN
  SELECT organization_id INTO v_organization_id
  FROM organization_users
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(
  p_user_id uuid,
  p_organization_id uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_users
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_enterprise_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_organizations_timestamp
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_licenses_timestamp
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_organization_users_timestamp
  BEFORE UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_teams_timestamp
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_team_members_timestamp
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_app_containers_timestamp
  BEFORE UPDATE ON app_containers
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_enterprise_settings_timestamp
  BEFORE UPDATE ON enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();

CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_timestamp();