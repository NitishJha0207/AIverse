import { Database } from '../lib/database.types';

export interface AppListing {
  id: string;
  name: string;
  description: string;
  short_description: string;
  developer_name: string;
  original_store: string;
  store_url: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  rating: number;
  reviews_count: number;
  reviews: Review[];
  icon_url: string;
  screenshots: string[];
  features: string[];
  is_available: boolean;
  is_native: boolean;
  version?: string;
  size?: number;
  binary_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  source: string;
  date: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  dateOfBirth: string;
  country: string;
  hobbies: string[];
  preferences: Record<string, any>;
  privacySettings: {
    shareLocation: boolean;
    sharePhone: boolean;
    sharePreferences: boolean;
    shareHobbies: boolean;
    shareName: boolean;
    shareCountry: boolean;
    shareDob: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AppInstallation {
  id: string;
  appId: string;
  userId: string;
  version: string;
  status: 'pending' | 'downloading' | 'installing' | 'installed' | 'failed' | 'uninstalled';
  progress: number;
  error?: string;
  permissions?: Permission[];
  installedAt?: string;
  updatedAt: string;
}

export interface InstallationProgress {
  status: 'pending' | 'downloading' | 'installing' | 'installed' | 'failed';
  progress: number;
  error?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  type: 'files' | 'camera' | 'microphone' | 'location' | 'contacts' | 'notifications';
  isGranted: boolean;
  dataCollection?: DataCollectionPolicy;
}

export interface DataCollectionPolicy {
  purpose: string;
  dataTypes: string[];
  retention: string;
  sharing: string[];
  required: boolean;
}

export interface AIApp {
  id: string;
  name: string;
  description: string;
  version: string;
  developer: string;
  icon: string;
  permissions?: Permission[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  preferences: Record<string, any>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface SharedMemorySettings {
  enabled: boolean;
  storageQuota: number;
  retentionPeriod: number;
  autoSync: boolean;
  syncInterval: number;
  dataCategories: {
    actions: boolean;
    preferences: boolean;
    history: boolean;
    userContent: boolean;
  };
  accessControl: {
    allowedApps: string[];
    blockedApps: string[];
    dataSharing: 'all' | 'selected' | 'none';
    requireConsent: boolean;
  };
}

export interface SharedMemoryAction {
  id: string;
  userId: string;
  appId?: string;
  category: string;
  action: string;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface AppMetrics {
  app_id: string;
  downloads: number;
  activeUsers: number;
  userGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userLoss: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface DeveloperProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  team_size: 'solo' | 'team';
  profession: string;
  specialization: string[];
  country: string;
  phone_number: string | null;
  is_verified: boolean;
  payment_status: 'pending' | 'active' | 'suspended';
  registration_date: string;
  subscription_ends: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSubmission {
  id: string;
  developer_id: string;
  name: string;
  description: string;
  short_description: string;
  category: string;
  tags: string[];
  price: number;
  icon_url: string | null;
  screenshots: string[];
  features: string[];
  required_permissions: Record<string, any>[];
  binary_url: string | null;
  binary_type: string | null;
  status: 'draft' | 'pending' | 'pending_review' | 'pending_processing' | 'processing' | 'automated_review' | 'approved' | 'rejected' | 'failed';
  submission_date: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
  version?: string;
  metadata?: {
    repository_url?: string;
    build_config?: {
      node_version: string;
      build_command: string;
      output_dir: string;
    };
  };
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  build_config?: {
    node_version: string;
    build_command: string;
    output_dir: string;
  };
  validation_results?: Record<string, any>;
  error_logs?: any[];
  processing_metadata?: Record<string, any>;
  developer?: {
    id: string;
    company_name: string;
    user?: {
      id: string;
      email: string;
    }
  };
}

export interface ProcessingJob {
  id: string;
  app_submission_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata: Record<string, any>;
  processing_steps: ProcessingStep[];
  created_at: string;
  updated_at: string;
}

export interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AppBinaryVersion {
  id: string;
  app_submission_id: string;
  processing_job_id: string;
  version: string;
  binary_type: string;
  file_size: number;
  checksum: string;
  storage_path: string;
  metadata: Record<string, any>;
  validation_results: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppAsset {
  id: string;
  app_submission_id: string;
  asset_type: 'icon' | 'screenshot' | 'preview';
  original_url: string;
  processed_url?: string;
  processing_metadata: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Enterprise License Types
export enum LicenseTier {
  BASIC = 'basic',
  ENTERPRISE_STANDARD = 'enterprise_standard',
  ENTERPRISE_PREMIUM = 'enterprise_premium'
}

export interface License {
  id: string;
  organization_id: string;
  tier: LicenseTier;
  max_users: number;
  current_users: number;
  features: string[];
  issued_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  logo_url?: string;
  admin_user_id: string;
  license_id?: string;
  sso_enabled: boolean;
  sso_provider?: 'azure' | 'google' | 'okta' | 'custom';
  sso_config?: Record<string, any>;
  custom_branding?: {
    primary_color: string;
    secondary_color: string;
    logo_url: string;
    favicon_url: string;
  };
  created_at: string;
  updated_at: string;
  license?: License;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
  job_title?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AppContainer {
  id: string;
  app_id: string;
  user_id: string;
  organization_id?: string;
  status: 'running' | 'stopped' | 'failed';
  resource_usage: {
    cpu_percent: number;
    memory_mb: number;
    storage_mb: number;
  };
  network_isolation: {
    allowed_domains: string[];
    blocked_domains: string[];
  };
  created_at: string;
  updated_at: string;
  network_rules?: {
    allowed_domains: string[];
    blocked_domains: string[];
    max_connections: number;
    bandwidth_limit_mb: number;
  };
  storage_quotas?: {
    total_mb: number;
    per_type_mb: {
      documents: number;
      media: number;
      other: number;
    };
  };
  monitoring_config?: {
    log_level: string;
    metrics_enabled: boolean;
    alert_thresholds: {
      cpu_percent: number;
      memory_percent: number;
      storage_percent: number;
    };
  };
}

export interface EnterpriseSettings {
  organization_id: string;
  security_policy: {
    password_policy: {
      min_length: number;
      require_uppercase: boolean;
      require_lowercase: boolean;
      require_numbers: boolean;
      require_special_chars: boolean;
      max_age_days: number;
    };
    mfa_required: boolean;
    session_timeout_minutes: number;
    ip_restrictions: string[];
  };
  compliance_settings: {
    data_retention_days: number;
    audit_log_enabled: boolean;
    dlp_enabled: boolean;
    dlp_rules: Record<string, any>[];
  };
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface SupportTicket {
  id: string;
  organization_id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  created_by?: {
    id: string;
    email: string;
    name: string;
  };
  assigned_to_user?: {
    id: string;
    email: string;
    name: string;
  };
}