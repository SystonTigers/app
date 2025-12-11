'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PromoCode {
    code: string;
    discount_percent: number;
    plan?: 'starter' | 'pro';
    lifetime: boolean;
    max_uses?: number;
    current_uses: number;
    is_active: boolean;
    expires_at?: string;
    created_at: string;
    whitelist?: string[];
}

const API_BASE = 'http://localhost:8787'; // Forced local for debugging

export default function PromoCodesPage() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [error, setError] = useState('');

    const [newCode, setNewCode] = useState({
        code: '',
        discount_percent: 10,
        plan: '',
        lifetime: false,
        max_uses: '',
        expires_at: '',
        whitelist: '',
    });

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const fetchPromoCodes = async () => {
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/promo-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to fetch promo codes');
            }

            const data = await response.json();
            if (data.success) {
                setPromoCodes(data.promoCodes || []);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load promo codes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setError('');

        try {
            const payload: any = {
                code: newCode.code.toUpperCase(),
                discount_percent: newCode.discount_percent,
                lifetime: newCode.lifetime,
            };

            if (newCode.plan) payload.plan = newCode.plan;
            if (newCode.max_uses) payload.max_uses = parseInt(newCode.max_uses);
            if (newCode.expires_at) payload.expires_at = newCode.expires_at;
            if (newCode.whitelist) {
                payload.whitelist = newCode.whitelist.split(',').map((s) => s.trim());
            }

            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/promo/upsert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to create promo code');

            await fetchPromoCodes();
            setShowCreate(false);
            setNewCode({
                code: '',
                discount_percent: 10,
                plan: '',
                lifetime: false,
                max_uses: '',
                expires_at: '',
                whitelist: '',
            });
        } catch (err: any) {
            setError(err.message || 'Failed to create promo code');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleToggle = async (code: string) => {
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/promo-codes/${code}/toggle`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPromoCodes((prev) =>
                    prev.map((p) => (p.code === code ? { ...p, is_active: data.active } : p))
                );
            }
        } catch (err) {
            alert('Failed to toggle promo code');
        }
    };

    const handleDelete = async (code: string) => {
        if (!confirm(`Are you sure you want to delete promo code "${code}"? This action cannot be undone.`)) return;

        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/promo-codes/${code}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setPromoCodes((prev) => prev.filter((p) => p.code !== code));
            } else {
                throw new Error('Failed to delete promo code');
            }
        } catch (err) {
            alert('Failed to delete promo code');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 animate-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
                        <p className="text-gray-500 mt-1">Manage discount codes and promotions</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Code
                    </button>
                </div>

                {error && (
                    <div className="glass-card p-4 border-red-500/30 bg-red-500/10 text-red-400">
                        {error}
                    </div>
                )}

                {/* Promo Codes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {promoCodes.map((promo, i) => (
                        <motion.div
                            key={promo.code}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`glass-card p-5 ${!promo.is_active ? 'opacity-60 border-dashed' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-mono text-lg font-bold text-white">{promo.code}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => handleToggle(promo.code)}
                                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${promo.is_active
                                                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                                }`}
                                        >
                                            {promo.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                        {promo.lifetime && (
                                            <span className="badge bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-300">
                                                Lifetime
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-primary-400">{promo.discount_percent}%</div>
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="text-xs text-gray-500">off</div>
                                        <button
                                            onClick={() => handleDelete(promo.code)}
                                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                                            title="Delete Code"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                {promo.plan && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Plan</span>
                                        <span className="text-gray-300 capitalize">{promo.plan} only</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Uses</span>
                                    <span className="text-gray-300">
                                        {promo.current_uses} / {promo.max_uses || '∞'}
                                    </span>
                                </div>
                                {promo.expires_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Expires</span>
                                        <span className="text-gray-300">
                                            {new Date(promo.expires_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {promoCodes.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <p className="text-gray-500">No promo codes yet</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
                            Create Your First Code
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal - Outside animate-in container to fix z-index stacking context */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 max-w-md w-full"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Create Promo Code</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Code</label>
                                <input
                                    type="text"
                                    value={newCode.code}
                                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                    className="input font-mono"
                                    placeholder="SUMMER2024"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Discount %</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={newCode.discount_percent}
                                        onChange={(e) => setNewCode({ ...newCode, discount_percent: parseInt(e.target.value) })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Plan Lock</label>
                                    <select
                                        value={newCode.plan}
                                        onChange={(e) => setNewCode({ ...newCode, plan: e.target.value })}
                                        className="input"
                                    >
                                        <option value="">Any Plan</option>
                                        <option value="starter">Starter Only</option>
                                        <option value="pro">Pro Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max Uses</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newCode.max_uses}
                                        onChange={(e) => setNewCode({ ...newCode, max_uses: e.target.value })}
                                        className="input"
                                        placeholder="Unlimited"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Expires</label>
                                    <input
                                        type="date"
                                        value={newCode.expires_at}
                                        onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Whitelist (comma separated slugs)</label>
                                <input
                                    type="text"
                                    value={newCode.whitelist}
                                    onChange={(e) => setNewCode({ ...newCode, whitelist: e.target.value })}
                                    className="input"
                                    placeholder="team-a, team-b"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="lifetime"
                                    checked={newCode.lifetime}
                                    onChange={(e) => setNewCode({ ...newCode, lifetime: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                                />
                                <label htmlFor="lifetime" className="text-sm text-gray-300">
                                    Lifetime access (100% off forever)
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={createLoading} className="btn-primary flex-1">
                                    {createLoading ? 'Creating...' : 'Create Code'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </>
    );
}
