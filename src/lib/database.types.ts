export interface Database {
  public: {
    Tables: {
      app_listings: {
        Row: {
          id: string;
          name: string;
          description: string;
          short_description: string;
          developer_name: string;
          original_store: string | null;
          store_url: string | null;
          price: number;
          currency: string;
          category: string;
          tags: string[];
          rating: number;
          reviews_count: number;
          reviews: Record<string, any>[];
          icon_url: string;
          screenshots: string[];
          features: string[];
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          date_of_birth: string | null;
          country: string | null;
          hobbies: string[] | null;
          preferences: Record<string, any> | null;
          privacy_settings: Record<string, boolean> | null;
          created_at: string;
          updated_at: string;
        };
      };
      developer_profiles: {
        Row: {
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
        };
      };
      app_submissions: {
        Row: {
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
          status: 'draft' | 'pending' | 'approved' | 'rejected';
          submission_date: string;
          last_updated: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}