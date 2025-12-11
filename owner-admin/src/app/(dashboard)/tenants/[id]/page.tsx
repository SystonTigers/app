'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface TenantDetails {
    id: string;
    name: string;
    slug: string;
    email: string;
    plan: 'starter' | 'pro';
    status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'deactivated';
    created_at: number;
    updated_at: number;
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
}

const API_BASE = 'http://localhost:8787'; // Forced local for debugging

export default function TenantDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tenantId = params?.id as string;

    const [tenant, setTenant] = useState<TenantDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        plan: '',
        status: '',
    });

    const [promos, setPromos] = useState<any[]>([]);
    const [newPromoCode, setNewPromoCode] = useState('');

    useEffect(() => {
        if (tenantId) {
            fetchTenant();
            fetchPromos();
        }
    }, [tenantId]);

    const fetchPromos = async () => {
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}/promos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPromos(data.promos || []);
            }
        } catch (err) {
            console.error('Failed to fetch promos', err);
        }
    };

    const handleAddPromo = async () => {
        if (!newPromoCode) return;
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}/promos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: newPromoCode })
            });

            if (response.ok) {
                setNewPromoCode('');
                fetchPromos();
            } else {
                const data = await response.json();
                alert(data.error?.message || 'Failed to add promo');
            }
        } catch (err) {
            alert('Failed to add promo code');
        }
    };

    const handleRemovePromo = async (code: string) => {
        if (!confirm('Remove this promo code from tenant?')) return;
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}/promos/${code}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchPromos();
            } else {
                alert('Failed to remove promo');
            }
        } catch (err) {
            alert('Error removing promo code');
        }
    };

    const fetchTenant = async () => {
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to fetch tenant');
            }

            const data = await response.json();
            if (data.success && data.tenant) {
                setTenant(data.tenant);
                setEditForm({
                    name: data.tenant.name,
                    email: data.tenant.email,
                    plan: data.tenant.plan,
                    status: data.tenant.status,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load tenant');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!tenant) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/tenants/${tenantId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify(editForm),
            });

            if (!response.ok) throw new Error('Failed to update tenant');

            await fetchTenant();
            alert('Tenant updated successfully');
        } catch (err: any) {
            alert(`Failed to update: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="glass-card p-6 text-center">
                <div className="text-red-400 mb-4">{error || 'Tenant not found'}</div>
                <Link href="/tenants" className="btn-primary">
                    Back to Tenants
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <Link href="/tenants" className="text-gray-500 hover:text-white">
                    Tenants
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-white">{tenant.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                        style={{ backgroundColor: tenant.primary_color || '#3b82f6' }}
                    >
                        {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                        <p className="text-gray-500 font-mono">{tenant.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`badge ${tenant.status === 'active' ? 'badge-success' : tenant.status === 'trial' ? 'badge-info' : 'badge-warning'}`}>
                        {tenant.status}
                    </span>
                    <span className={`badge ${tenant.plan === 'pro' ? 'bg-gradient-to-r from-primary-500/30 to-accent/30 text-primary-300' : 'badge-neutral'}`}>
                        {tenant.plan}
                    </span>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6"
                    >
                        <h2 className="font-semibold text-white mb-4">Tenant Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Plan</label>
                                <select
                                    value={editForm.plan}
                                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                                    className="input"
                                >
                                    <option value="starter">Starter</option>
                                    <option value="pro">Pro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="input"
                                >
                                    <option value="trial">Trial</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="deactivated">Deactivated</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => router.back()} className="btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-4"
                    >
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Timeline</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Created</span>
                                <span className="text-white">{formatDate(tenant.created_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Updated</span>
                                <span className="text-white">{formatDate(tenant.updated_at)}</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-4"
                    >
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Links</h3>
                        <div className="space-y-2">
                            <a
                                href={`https://yourplatform.com/${tenant.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Public Site
                            </a>
                            <a
                                href={`https://yourplatform.com/${tenant.slug}/admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View Admin Panel
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-4"
                    >
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Promotions</h3>

                        <div className="space-y-3 mb-4">
                            {promos.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No active promotions</p>
                            ) : (
                                promos.map(promo => (
                                    <div key={promo.id} className="flex justify-between items-start text-sm group">
                                        <div>
                                            <div className="font-mono font-medium text-white">{promo.code}</div>
                                            <div className="text-xs text-gray-500">
                                                {promo.discount_percent}% off {promo.lifetime ? '(Lifetime)' : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemovePromo(promo.code)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remove promo"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPromoCode}
                                onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                                placeholder="PROMO-CODE"
                                className="input py-1 px-2 text-sm font-mono"
                            />
                            <button
                                onClick={handleAddPromo}
                                disabled={!newPromoCode}
                                className="btn-primary py-1 px-3 text-sm disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-card p-4"
                    >
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Usage Stats</h3>
                        <div className="text-center py-4 text-gray-500 text-sm">
                            Coming soon
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
