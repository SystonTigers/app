import axios from 'axios';
import type { ApiResponse, Tenant, TenantOverview, PlatformStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app-preview.team-platform-2025.workers.dev';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Platform Admin API
export const platformApi = {
  // Auth
  async login(email: string): Promise<string> {
    const response = await api.post<ApiResponse<{ token: string }>>('/internal/dev/admin-token', {
      tenant: 'platform',
      email,
      reason: 'Platform admin login',
    });
    return response.data.data!.token;
  },

  // Dashboard Stats
  async getStats(): Promise<PlatformStats> {
    // For now, we'll aggregate from tenant list
    // TODO: Add dedicated stats endpoint to backend
    const tenants = await this.listTenants();

    return {
      total_tenants: tenants.length,
      active_tenants: tenants.filter(t => t.status === 'READY').length,
      suspended_tenants: tenants.filter(t => t.status === 'SUSPENDED').length,
      total_users: 0, // TODO: Aggregate from backend
      total_posts: 0,
      total_events: 0,
      mrr: tenants.filter(t => t.plan === 'pro').length * 15 + tenants.filter(t => t.plan === 'enterprise').length * 50,
      recent_signups: tenants.slice(0, 5),
    };
  },

  // Tenants
  async listTenants(): Promise<Tenant[]> {
    const response = await api.get<ApiResponse<Tenant[]>>('/api/v1/admin/tenants');
    return response.data.data || [];
  },

  async getTenant(id: string): Promise<Tenant> {
    const response = await api.get<ApiResponse<Tenant>>(`/api/v1/admin/tenants/${id}`);
    return response.data.data!;
  },

  async getTenantOverview(id: string): Promise<TenantOverview> {
    const response = await api.get<ApiResponse<TenantOverview>>(`/api/v1/tenants/${id}/overview`);
    return response.data.data!;
  },

  async createTenant(data: {
    clubName: string;
    clubSlug: string;
    email: string;
    plan: 'starter' | 'pro' | 'enterprise';
  }): Promise<Tenant> {
    const response = await api.post<ApiResponse<Tenant>>('/public/signup/start', data);
    return response.data.data!;
  },

  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const response = await api.put<ApiResponse<Tenant>>(`/api/v1/admin/tenants/${id}`, data);
    return response.data.data!;
  },

  async deactivateTenant(id: string): Promise<void> {
    await api.post(`/api/v1/admin/tenants/${id}/deactivate`);
  },

  async deleteTenant(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/tenants/${id}`);
  },
};

export default api;
