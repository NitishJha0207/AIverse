/*
  # Enhanced Security Framework
  
  1. Permission Granularity
    - Add temporal permissions
    - Add permission inheritance
    - Add permission scopes
    
  2. Shared Memory Security  
    - Add encryption support
    - Add data versioning
    - Add access auditing
    
  3. Enhanced Sandboxing
    - Add network isolation
    - Add resource quotas
    - Add monitoring
*/

-- Add temporal permissions support
ALTER TABLE app_permissions
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS inherited_from uuid REFERENCES app_permissions(id),
ADD COLUMN IF NOT EXISTS permission_scope jsonb DEFAULT '{}'::jsonb;

-- Add data versioning for shared memory
CREATE TABLE IF NOT EXISTS shared_memory_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES shared_memory_actions(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  data jsonb NOT NULL,
  encrypted_data bytea,
  encryption_key_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE shared_memory_versions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can access their data versions"
  ON shared_memory_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_memory_actions a
      WHERE a.id = shared_memory_versions.action_id
      AND a.user_id = auth.uid()
    )
  );

-- Add enhanced sandbox controls
ALTER TABLE app_sandboxes
ADD COLUMN IF NOT EXISTS network_rules jsonb DEFAULT '{
  "allowed_domains": [],
  "blocked_domains": [],
  "max_connections": 100,
  "bandwidth_limit_mb": 1000
}'::jsonb,
ADD COLUMN IF NOT EXISTS storage_quotas jsonb DEFAULT '{
  "total_mb": 100,
  "per_type_mb": {
    "documents": 50,
    "media": 30,
    "other": 20
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS monitoring_config jsonb DEFAULT '{
  "metrics_enabled": true,
  "log_level": "info",
  "alert_thresholds": {
    "cpu_percent": 90,
    "memory_percent": 85,
    "storage_percent": 90
  }
}'::jsonb;

-- Create monitoring table
CREATE TABLE IF NOT EXISTS app_monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES app_listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'resource_limit',
      'security_violation',
      'performance_issue',
      'error'
    )
  ),
  severity text NOT NULL CHECK (
    severity IN (
      'info',
      'warning',
      'error',
      'critical'
    )
  ),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_monitoring_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their app events"
  ON app_monitoring_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all events"
  ON app_monitoring_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Create function to check temporal permissions
CREATE OR REPLACE FUNCTION check_temporal_permission(
  p_user_id uuid,
  p_app_id uuid,
  p_permission_type text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_permissions
    WHERE user_id = p_user_id
    AND app_id = p_app_id
    AND permission_type = p_permission_type
    AND is_granted = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to monitor app resource usage
CREATE OR REPLACE FUNCTION monitor_app_resources(
  p_app_id uuid,
  p_user_id uuid,
  p_resource_type text,
  p_value numeric
) RETURNS void AS $$
DECLARE
  v_sandbox_config jsonb;
  v_threshold numeric;
BEGIN
  -- Get sandbox configuration
  SELECT monitoring_config->'alert_thresholds'
  INTO v_sandbox_config
  FROM app_sandboxes
  WHERE app_id = p_app_id AND user_id = p_user_id;

  -- Get threshold for resource type
  v_threshold := (v_sandbox_config->>p_resource_type)::numeric;

  -- Check if threshold is exceeded
  IF p_value > v_threshold THEN
    INSERT INTO app_monitoring_events (
      app_id,
      user_id,
      event_type,
      severity,
      details
    ) VALUES (
      p_app_id,
      p_user_id,
      'resource_limit',
      CASE
        WHEN p_value > v_threshold * 1.2 THEN 'critical'
        WHEN p_value > v_threshold * 1.1 THEN 'error'
        ELSE 'warning'
      END,
      jsonb_build_object(
        'resource_type', p_resource_type,
        'current_value', p_value,
        'threshold', v_threshold
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect anomalies
CREATE OR REPLACE FUNCTION detect_anomalies(
  p_app_id uuid,
  p_user_id uuid,
  p_metric_type text,
  p_value numeric
) RETURNS void AS $$
DECLARE
  v_avg numeric;
  v_stddev numeric;
BEGIN
  -- Calculate average and standard deviation
  SELECT 
    avg(value::numeric),
    stddev(value::numeric)
  INTO v_avg, v_stddev
  FROM app_metrics
  WHERE app_id = p_app_id
  AND metric_type = p_metric_type
  AND recorded_at > now() - interval '24 hours';

  -- Check for anomaly (value outside 2 standard deviations)
  IF abs(p_value - v_avg) > (2 * v_stddev) THEN
    INSERT INTO app_monitoring_events (
      app_id,
      user_id,
      event_type,
      severity,
      details
    ) VALUES (
      p_app_id,
      p_user_id,
      'performance_issue',
      'warning',
      jsonb_build_object(
        'metric_type', p_metric_type,
        'current_value', p_value,
        'average', v_avg,
        'standard_deviation', v_stddev
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_permissions_temporal 
  ON app_permissions(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_memory_versions_action 
  ON shared_memory_versions(action_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_app_monitoring_events_app_user 
  ON app_monitoring_events(app_id, user_id);

CREATE INDEX IF NOT EXISTS idx_app_monitoring_events_type_severity 
  ON app_monitoring_events(event_type, severity);