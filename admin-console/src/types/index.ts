export interface Tenant {
  id: string;
  name: string;
  email: string;
  slug: string;
  plan: 'starter' | 'pro' | 'enterprise';
  status: 'PROVISIONING' | 'READY' | 'SUSPENDED' | 'DELETED';
  created_at: string;
  updated_at: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  webhook_url?: string;
}

export interface TenantOverview extends Tenant {
  posts_count: number;
  events_count: number;
  users_count: number;
  storage_bytes: number;
  last_post_at?: string;
  last_login_at?: string;
}

export interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_posts: number;
  total_events: number;
  mrr: number;
  recent_signups: Tenant[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    release: string;
    total?: number;
    page?: number;
    limit?: number;
  };
}
