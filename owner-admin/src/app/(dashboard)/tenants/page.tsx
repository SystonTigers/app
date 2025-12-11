'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    email: string;
    plan: 'starter' | 'pro';
    status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'deactivated';
    manager_name?: string;
    created_at: number;
}

const API_BASE = 'http://localhost:8787'; // Forced local for debugging
const PROTECTED_SLUGS = ['syston-town-tigers', 'syston', 'syston-tigers'];

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<{ status?: string; plan?: string; search?: string }>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Promo Modal State
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [tenantPromos, setTenantPromos] = useState<any[]>([]);
    const [promoLoading, setPromoLoading] = useState(false);
    const [newPromoCode, setNewPromoCode] = useState('');
    const [addPromoError, setAddPromoError] = useState('');

    useEffect(() => {
        fetchTenants();
    }, [filter.status, filter.plan]);

    const fetchTenants = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.status) params.set('status', filter.status);
            if (filter.plan) params.set('plan', filter.plan);
            params.set('limit', '100');

            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setLoading(false);
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to fetch tenants');
            }

            const data = await response.json();
            if (data.success) {
                setTenants(data.tenants || []);
            }
            setLoading(false);
        } catch (err: any) {
            if (err.message?.includes('NEXT_REDIRECT')) return;
            setError(err.message || 'Failed to load tenants');
            setLoading(false);
        }
    };

    const fetchTenantPromos = async (tenantId: string) => {
        setPromoLoading(true);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}/promos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setTenantPromos(data.promos || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPromoLoading(false);
        }
    };

    const handleOpenPromos = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setTenantPromos([]);
        setNewPromoCode('');
        setAddPromoError('');
        fetchTenantPromos(tenant.id);
    };

    const handleAddPromo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenant || !newPromoCode.trim()) return;

        setAddPromoError('');
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${selectedTenant.id}/promos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: newPromoCode.trim().toUpperCase() })
            });
            const data = await response.json();

            if (data.success) {
                setNewPromoCode('');
                fetchTenantPromos(selectedTenant.id);
            } else {
                setAddPromoError(data.error?.message || 'Failed to add promo');
            }
        } catch (err) {
            setAddPromoError('Failed to add promo');
        }
    };

    const handleRemovePromo = async (code: string) => {
        if (!selectedTenant || !confirm(`Remove promo "${code}" from this tenant?`)) return;

        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${selectedTenant.id}/promos/${code}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchTenantPromos(selectedTenant.id);
            }
        } catch (err) {
            alert('Failed to remove promo');
        }
    };

    const handleDeactivate = async (tenant: Tenant) => {
        if (PROTECTED_SLUGS.includes(tenant.slug)) {
            alert('Cannot deactivate protected tenant');
            return;
        }

        if (!confirm(`Deactivate "${tenant.name}"? They will lose access.`)) return;

        setActionLoading(tenant.id);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenant.id}/deactivate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setTenants((prev) =>
                    prev.map((t) => (t.id === tenant.id ? { ...t, status: 'deactivated' as const } : t))
                );
            }
        } catch (err) {
            alert('Failed to deactivate tenant');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (tenant: Tenant) => {
        if (PROTECTED_SLUGS.includes(tenant.slug)) {
            alert('Cannot delete protected tenant');
            return;
        }

        if (!confirm(`DELETE "${tenant.name}"? This is PERMANENT.`)) return;
        if (prompt('Type "DELETE" to confirm:') !== 'DELETE') return;

        setActionLoading(tenant.id);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenant.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
            }
        } catch (err) {
            alert('Failed to delete tenant');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const filteredTenants = tenants.filter((t) => {
        if (filter.search) {
            const search = filter.search.toLowerCase();
            return (
                t.name.toLowerCase().includes(search) ||
                t.slug.toLowerCase().includes(search) ||
                t.email.toLowerCase().includes(search)
            );
        }
        return true;
    });

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'badge-success',
            trial: 'badge-info',
            suspended: 'badge-warning',
            cancelled: 'badge-neutral',
            deactivated: 'badge-danger',
        };
        return (
            <span className={styles[status] || 'badge-neutral'}>
                {status}
            </span>
        );
    };

    const planBadge = (plan: string) => {
        return plan === 'pro' ? (
            <span className="badge bg-gradient-to-r from-primary-500/30 to-accent/30 text-primary-300 border border-primary-500/30">
                PRO
            </span>
        ) : (
            <span className="badge-neutral">Starter</span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tenants</h1>
                    <p className="text-gray-500 mt-1">{tenants.length} total tenants</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search by name, slug, or email..."
                            value={filter.search || ''}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            className="input"
                        />
                    </div>
                    <select
                        value={filter.status || ''}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                        className="input w-auto"
                    >
                        <option value="">All Status</option>
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="deactivated">Deactivated</option>
                    </select>
                    <select
                        value={filter.plan || ''}
                        onChange={(e) => setFilter({ ...filter, plan: e.target.value || undefined })}
                        className="input w-auto"
                    >
                        <option value="">All Plans</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="glass-card p-4 border-red-500/30 bg-red-500/10 text-red-400">
                    {error}
                </div>
            )}

            {/* Tenants Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tenant
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Manager
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTenants.map((tenant, i) => (
                                <motion.tr
                                    key={tenant.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="table-row"
                                >
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {tenant.name}
                                                {PROTECTED_SLUGS.includes(tenant.slug) && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                                                        Protected
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 font-mono">{tenant.slug}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-white">{tenant.manager_name || '—'}</div>
                                        <div className="text-xs text-gray-500">{tenant.email}</div>
                                    </td>
                                    <td className="px-6 py-4">{planBadge(tenant.plan)}</td>
                                    <td className="px-6 py-4">{statusBadge(tenant.status)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(tenant.created_at)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenPromos(tenant)}
                                                className="px-3 py-1.5 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors"
                                            >
                                                Promos
                                            </button>
                                            <Link
                                                href={`/tenants/${tenant.id}`}
                                                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDeactivate(tenant)}
                                                disabled={PROTECTED_SLUGS.includes(tenant.slug) || actionLoading === tenant.id || tenant.status === 'deactivated'}
                                                className="px-3 py-1.5 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Deactivate
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tenant)}
                                                disabled={PROTECTED_SLUGS.includes(tenant.slug) || actionLoading === tenant.id}
                                                className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {actionLoading === tenant.id ? '...' : 'Del'}
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTenants.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No tenants found
                    </div>
                )}
            </div>

            {/* Manage Promos Modal */}
            {selectedTenant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 max-w-lg w-full"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Promos for {selectedTenant.name}</h2>
                            <button onClick={() => setSelectedTenant(null)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Add Promo Form */}
                        <form onSubmit={handleAddPromo} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newPromoCode}
                                onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                                placeholder="Enter promo code"
                                className="input flex-1"
                            />
                            <button type="submit" disabled={!newPromoCode.trim()} className="btn-primary whitespace-nowrap">
                                Apply
                            </button>
                        </form>
                        {addPromoError && (
                            <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded">
                                {addPromoError}
                            </div>
                        )}

                        {/* Promos List */}
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {promoLoading ? (
                                <div className="text-center py-4 text-gray-500">Loading...</div>
                            ) : tenantPromos.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 border border-dashed border-white/10 rounded-lg">
                                    No active promotions
                                </div>
                            ) : (
                                tenantPromos.map((promo: any) => (
                                    <div key={promo.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div>
                                            <div className="font-mono font-bold text-white text-lg">{promo.code}</div>
                                            <div className="text-xs text-gray-400">
                                                {promo.discount_percent}% off • {promo.lifetime ? 'Lifetime' : 'One-time'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemovePromo(promo.code)}
                                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
