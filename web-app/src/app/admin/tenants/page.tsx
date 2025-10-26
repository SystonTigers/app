'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listTenants, deactivateTenant, deleteTenant, type Tenant } from '@/lib/sdk';

const PROTECTED_SLUGS = ['syston-town-tigers', 'syston', 'syston-tigers'];

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<{ status?: string; plan?: string }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, [filter]);

  const fetchTenants = async () => {
    try {
      const data = await listTenants({ ...filter, limit: 100 });
      setTenants(data.tenants);
      setError('');
    } catch (err: any) {
      console.error('List tenants error:', err);
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        router.push('/admin/login');
      } else {
        setError(err?.message || 'Failed to fetch tenants');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (tenant: Tenant) => {
    if (PROTECTED_SLUGS.includes(tenant.slug)) {
      alert('Cannot deactivate protected tenant');
      return;
    }

    if (!confirm(`Are you sure you want to deactivate "${tenant.name}"? This will set their status to deactivated.`)) {
      return;
    }

    setActionLoading(tenant.id);
    try {
      await deactivateTenant(tenant.id);
      // Update local state
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: 'deactivated' as const } : t))
      );
      alert('Tenant deactivated successfully');
    } catch (err: any) {
      alert(`Failed to deactivate tenant: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (PROTECTED_SLUGS.includes(tenant.slug)) {
      alert('Cannot delete protected tenant');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to DELETE "${tenant.name}"? This action is PERMANENT and cannot be undone. All data will be removed.`
      )
    ) {
      return;
    }

    // Double confirmation for delete
    const confirmText = prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled');
      return;
    }

    setActionLoading(tenant.id);
    try {
      await deleteTenant(tenant.id);
      // Remove from local state
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
      alert('Tenant deleted successfully');
    } catch (err: any) {
      alert(`Failed to delete tenant: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isProtected = (slug: string) => PROTECTED_SLUGS.includes(slug);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading tenants...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          <Link
            href="/admin"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/admin" className="text-blue-600 hover:text-blue-700 text-sm mb-1 block">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Tenants</h1>
            </div>
            <div className="text-sm text-gray-600">{tenants.length} tenants</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filter.status || ''}
                onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={filter.plan || ''}
                onChange={(e) => setFilter({ ...filter, plan: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tenant.name}
                    {isProtected(tenant.slug) && (
                      <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Protected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.slug}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded ${
                        tenant.plan === 'pro'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded ${
                        tenant.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : tenant.status === 'trial'
                          ? 'bg-blue-100 text-blue-800'
                          : tenant.status === 'suspended'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(tenant.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleDeactivate(tenant)}
                      disabled={
                        isProtected(tenant.slug) ||
                        actionLoading === tenant.id ||
                        tenant.status === 'deactivated'
                      }
                      className="text-yellow-600 hover:text-yellow-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                      title={
                        isProtected(tenant.slug)
                          ? 'Protected tenant'
                          : tenant.status === 'deactivated'
                          ? 'Already deactivated'
                          : 'Deactivate tenant'
                      }
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => handleDelete(tenant)}
                      disabled={isProtected(tenant.slug) || actionLoading === tenant.id}
                      className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                      title={isProtected(tenant.slug) ? 'Protected tenant' : 'Delete tenant permanently'}
                    >
                      {actionLoading === tenant.id ? 'Working...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tenants.length === 0 && (
            <div className="text-center py-12 text-gray-500">No tenants found</div>
          )}
        </div>
      </div>
    </div>
  );
}
