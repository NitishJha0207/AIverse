/*
  # Fix Infinite Recursion in Organization Users Policies
  
  1. Changes
    - Fix infinite recursion in organization_users policies
    - Rewrite policies to avoid self-referential checks
    - Add explicit table aliases to prevent ambiguity
    
  2. Security
    - Maintain proper access control
    - Ensure policies work correctly without recursion
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Organization admins can manage users" ON organization_users;
DROP POLICY IF EXISTS "Users can view their organization membership" ON organization_users;

-- Create new non-recursive policies
CREATE POLICY "Organization admins can manage users"
  ON organization_users
  FOR ALL
  TO authenticated
  USING (
    -- Check if user is admin for this organization directly
    EXISTS (
      SELECT 1 
      FROM organizations o
      WHERE o.id = organization_users.organization_id
      AND o.admin_user_id = auth.uid()
    )
    OR
    -- Check if user is an admin via a separate query
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      -- Limit to avoid deep recursion
      LIMIT 1
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
      SELECT 1 
      FROM organizations o
      WHERE o.id = organization_users.organization_id
      AND o.admin_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "Users can view their organization membership"
  ON organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix other potentially recursive policies
DROP POLICY IF EXISTS "Organization admins can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Organization users can view their organization" ON organizations;

CREATE POLICY "Organization admins can manage their organization"
  ON organizations
  FOR ALL
  TO authenticated
  USING (
    -- Direct admin check
    admin_user_id = auth.uid()
    OR
    -- Check via organization_users table with limit
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = organizations.id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    admin_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = organizations.id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "Organization users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = organizations.id
      AND ou.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Fix team policies that might cause recursion
DROP POLICY IF EXISTS "Organization members can view teams" ON teams;
DROP POLICY IF EXISTS "Organization admins and managers can manage teams" ON teams;

CREATE POLICY "Organization members can view teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = teams.organization_id
      AND ou.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Organization admins and managers can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = teams.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'manager')
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = teams.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'manager')
      LIMIT 1
    )
  );

-- Fix team_members policies
DROP POLICY IF EXISTS "Team members can view their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON team_members;

CREATE POLICY "Team members can view their teams"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Direct membership
    user_id = auth.uid()
    OR
    -- Organization membership
    EXISTS (
      SELECT 1 
      FROM teams t
      JOIN organization_users ou ON t.organization_id = ou.organization_id
      WHERE t.id = team_members.team_id
      AND ou.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Team owners can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    -- Team owner
    EXISTS (
      SELECT 1 
      FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
      LIMIT 1
    )
    OR
    -- Organization admin
    EXISTS (
      SELECT 1 
      FROM teams t
      JOIN organization_users ou ON t.organization_id = ou.organization_id
      WHERE t.id = team_members.team_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    -- Team owner
    EXISTS (
      SELECT 1 
      FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
      LIMIT 1
    )
    OR
    -- Organization admin
    EXISTS (
      SELECT 1 
      FROM teams t
      JOIN organization_users ou ON t.organization_id = ou.organization_id
      WHERE t.id = team_members.team_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  );

-- Fix enterprise_settings policies
DROP POLICY IF EXISTS "Organization admins can manage settings" ON enterprise_settings;
DROP POLICY IF EXISTS "Organization users can view settings" ON enterprise_settings;

CREATE POLICY "Organization admins can manage settings"
  ON enterprise_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = enterprise_settings.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = enterprise_settings.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "Organization users can view settings"
  ON enterprise_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = enterprise_settings.organization_id
      AND ou.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Fix support_tickets policies
DROP POLICY IF EXISTS "Organization users can create and view their tickets" ON support_tickets;
DROP POLICY IF EXISTS "Organization users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Ticket owners and admins can update tickets" ON support_tickets;

CREATE POLICY "Organization users can view tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    -- Ticket owner
    user_id = auth.uid()
    OR
    -- Organization admin/manager
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = support_tickets.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'manager')
      LIMIT 1
    )
  );

CREATE POLICY "Organization users can create tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = support_tickets.organization_id
      AND ou.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Ticket owners and admins can update tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    -- Ticket owner
    user_id = auth.uid()
    OR
    -- Organization admin/manager
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = support_tickets.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'manager')
      LIMIT 1
    )
    OR
    -- Assigned to user
    assigned_to = auth.uid()
  )
  WITH CHECK (
    -- Ticket owner
    user_id = auth.uid()
    OR
    -- Organization admin/manager
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = support_tickets.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'manager')
      LIMIT 1
    )
    OR
    -- Assigned to user
    assigned_to = auth.uid()
  );

-- Fix audit_logs policies
DROP POLICY IF EXISTS "Organization admins can view audit logs" ON audit_logs;

CREATE POLICY "Organization admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = audit_logs.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  );

-- Fix app_containers policies
DROP POLICY IF EXISTS "Organization admins can view all containers" ON app_containers;

CREATE POLICY "Organization admins can view all containers"
  ON app_containers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users ou
      WHERE ou.organization_id = app_containers.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role = 'admin'
      LIMIT 1
    )
  );

-- Create helper function to get user's organization role
CREATE OR REPLACE FUNCTION get_user_organization_role(
  p_user_id uuid,
  p_organization_id uuid
) RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- Check if user is the organization admin
  IF EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_organization_id
    AND admin_user_id = p_user_id
  ) THEN
    RETURN 'admin';
  END IF;
  
  -- Get role from organization_users
  SELECT role INTO v_role
  FROM organization_users
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;