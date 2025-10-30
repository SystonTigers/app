import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle, XCircle, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { platformApi } from '../api/client';
import type { PlatformStats } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await platformApi.getStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load platform stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Tenants',
      value: stats.total_tenants,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Active Tenants',
      value: stats.active_tenants,
      icon: CheckCircle,
      color: 'green',
    },
    {
      label: 'Suspended',
      value: stats.suspended_tenants,
      icon: XCircle,
      color: 'red',
    },
    {
      label: 'Monthly Revenue',
      value: `$${stats.mrr.toLocaleString()}`,
      icon: DollarSign,
      color: 'purple',
    },
    {
      label: 'Total Users',
      value: stats.total_users,
      icon: Activity,
      color: 'indigo',
    },
    {
      label: 'Total Posts',
      value: stats.total_posts,
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <Icon className={`text-${stat.color}-600`} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Signups */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Signups</h2>
        </div>
        <div className="p-6">
          {stats.recent_signups.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent signups</p>
          ) : (
            <div className="space-y-4">
              {stats.recent_signups.map((tenant) => (
                <Link
                  key={tenant.id}
                  to={`/tenants/${tenant.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-gray-500">{tenant.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        tenant.status === 'READY'
                          ? 'bg-green-100 text-green-800'
                          : tenant.status === 'PROVISIONING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tenant.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
