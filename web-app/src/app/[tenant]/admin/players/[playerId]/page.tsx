'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK } from '@/lib/sdk';
import Link from 'next/link';

const CONTACT_RELATIONSHIPS = [
    { value: 'mum', label: 'Mum' },
    { value: 'dad', label: 'Dad' },
    { value: 'step-mum', label: 'Step-Mum' },
    { value: 'step-dad', label: 'Step-Dad' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'other', label: 'Other' },
];

interface PageProps {
    params: Promise<{ tenant: string; playerId: string }>;
}

interface Contact {
    relationship: string;
    name: string;
    phone: string;
    email: string;
}

interface PlayerDetails {
    id: string;
    name: string;
    number?: number;
    position?: string;
    dob?: string;
    login_code?: string;
    contact1_relationship?: string;
    contact1_name?: string;
    contact1_phone?: string;
    contact1_email?: string;
    contact2_relationship?: string;
    contact2_name?: string;
    contact2_phone?: string;
    contact2_email?: string;
    contact3_relationship?: string;
    contact3_name?: string;
    contact3_phone?: string;
    contact3_email?: string;
}

export default function PlayerDetailsPage({ params }: PageProps) {
    const { tenant, playerId } = use(params);
    const [player, setPlayer] = useState<PlayerDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        loadPlayer();
    }, [tenant, playerId]);

    async function loadPlayer() {
        try {
            const sdk = createClientSDK(tenant);
            const data = await sdk.getPlayer(playerId);
            if (data) {
                setPlayer(data as unknown as PlayerDetails);
            }
        } catch (err) {
            console.error('Failed to load player', err);
        } finally {
            setLoading(false);
        }
    }

    function updateField(field: keyof PlayerDetails, value: any) {
        if (!player) return;
        setPlayer({ ...player, [field]: value });
    }

    async function handleSave() {
        if (!player) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE}/api/v1/players/${playerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(player),
            });
            if (!response.ok) throw new Error('Failed to save');
            alert('Player saved successfully!');
        } catch (err) {
            console.error('Failed to save player', err);
            alert('Failed to save player');
        } finally {
            setSaving(false);
        }
    }

    async function regenerateCode() {
        setRegenerating(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE}/api/v1/players/${playerId}/regenerate-code`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });
            if (!response.ok) throw new Error('Failed to regenerate code');
            const data = await response.json();
            setPlayer(prev => prev ? { ...prev, login_code: data.code } : null);
        } catch (err) {
            console.error('Failed to regenerate code', err);
            alert('Failed to regenerate code');
        } finally {
            setRegenerating(false);
        }
    }

    function copyCode() {
        if (player?.login_code) {
            navigator.clipboard.writeText(player.login_code);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    }

    if (loading) {
        return <div className="container mx-auto py-8 px-4">Loading...</div>;
    }

    if (!player) {
        return <div className="container mx-auto py-8 px-4">Player not found</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/${tenant}/admin/squad`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{player.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400">Player Details</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="space-y-8">
                {/* Login Code Section */}
                <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
                    <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Login Code
                    </h2>
                    <p className="text-blue-100 text-sm mb-4">
                        Share this code with the player and their parents to allow them to log in and manage attendance.
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl font-mono text-2xl tracking-widest">
                            {player.login_code || 'No code generated'}
                        </div>
                        <button
                            onClick={copyCode}
                            className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                            title="Copy code"
                        >
                            {codeCopied ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={regenerateCode}
                            disabled={regenerating}
                            className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50"
                            title="Regenerate code"
                        >
                            <svg className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </section>

                {/* Basic Info */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input
                                type="text"
                                value={player.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Squad Number</label>
                            <input
                                type="number"
                                value={player.number || ''}
                                onChange={(e) => updateField('number', parseInt(e.target.value) || undefined)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="#"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                            <select
                                value={player.position || ''}
                                onChange={(e) => updateField('position', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select position</option>
                                <option value="Goalkeeper">Goalkeeper</option>
                                <option value="Defender">Defender</option>
                                <option value="Midfielder">Midfielder</option>
                                <option value="Forward">Forward</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                value={player.dob ? new Date(player.dob).toISOString().split('T')[0] : ''}
                                onChange={(e) => updateField('dob', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Contacts Section */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contacts</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        Add up to 3 emergency contacts for this player.
                    </p>

                    <div className="space-y-6">
                        {/* Contact 1 */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                                <select
                                    value={player.contact1_relationship || ''}
                                    onChange={(e) => updateField('contact1_relationship', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select relationship</option>
                                    {CONTACT_RELATIONSHIPS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={player.contact1_name || ''}
                                    onChange={(e) => updateField('contact1_name', e.target.value)}
                                    placeholder="Name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="tel"
                                    value={player.contact1_phone || ''}
                                    onChange={(e) => updateField('contact1_phone', e.target.value)}
                                    placeholder="Phone number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="email"
                                    value={player.contact1_email || ''}
                                    onChange={(e) => updateField('contact1_email', e.target.value)}
                                    placeholder="Email address"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Contact 2 */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                                <select
                                    value={player.contact2_relationship || ''}
                                    onChange={(e) => updateField('contact2_relationship', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select relationship</option>
                                    {CONTACT_RELATIONSHIPS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={player.contact2_name || ''}
                                    onChange={(e) => updateField('contact2_name', e.target.value)}
                                    placeholder="Name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="tel"
                                    value={player.contact2_phone || ''}
                                    onChange={(e) => updateField('contact2_phone', e.target.value)}
                                    placeholder="Phone number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="email"
                                    value={player.contact2_email || ''}
                                    onChange={(e) => updateField('contact2_email', e.target.value)}
                                    placeholder="Email address"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Contact 3 */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                                <select
                                    value={player.contact3_relationship || ''}
                                    onChange={(e) => updateField('contact3_relationship', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select relationship</option>
                                    {CONTACT_RELATIONSHIPS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={player.contact3_name || ''}
                                    onChange={(e) => updateField('contact3_name', e.target.value)}
                                    placeholder="Name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="tel"
                                    value={player.contact3_phone || ''}
                                    onChange={(e) => updateField('contact3_phone', e.target.value)}
                                    placeholder="Phone number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="email"
                                    value={player.contact3_email || ''}
                                    onChange={(e) => updateField('contact3_email', e.target.value)}
                                    placeholder="Email address"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
