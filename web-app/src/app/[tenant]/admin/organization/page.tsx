'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Team {
    id: string;
    slug: string;
    name: string;
    createdAt: number;
}

interface Organization {
    id: string;
    name: string;
    plan: string;
    status: string;
    billingInterval: string;
    maxTeams: number;
    teamCount: number;
    role: string;
    trialEndsAt: number | null;
    teams: Team[];
}

export default function OrganizationPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', slug: '' });
    const [addingTeam, setAddingTeam] = useState(false);
    const [settings, setSettings] = useState({ passFeesToPayer: false });

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchOrganization();
    }, []);

    const fetchOrganization = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/organization`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setOrg(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch organization:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeam = async () => {
        if (!newTeam.name || !newTeam.slug) return;
        setAddingTeam(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/organization/teams`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamName: newTeam.name, teamSlug: newTeam.slug }),
            });
            const data = await res.json();
            if (data.success) {
                setShowAddModal(false);
                setNewTeam({ name: '', slug: '' });
                fetchOrganization();
            } else {
                alert(data.error?.message || 'Failed to add team');
            }
        } catch (error) {
            console.error('Failed to add team:', error);
        } finally {
            setAddingTeam(false);
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!org) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="text-5xl mb-4">🏢</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization</h2>
                    <p className="text-gray-600 mb-6">
                        Organizations are available on Club and Club Pro plans.
                        Upgrade to manage multiple teams under one subscription.
                    </p>
                    <Link
                        href={`/${tenant}/admin/billing`}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                        View Plans
                    </Link>
                </div>
            </div>
        );
    }

    const planNames: Record<string, string> = {
        essentials: 'Essentials',
        team: 'Team',
        club: 'Club',
        club_pro: 'Club Pro',
    };

    const canAddTeams = org.teamCount < org.maxTeams;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                    <p className="text-gray-600 mt-1">
                        {planNames[org.plan] || org.plan} Plan • {org.teamCount} of {org.maxTeams === 999 ? '∞' : org.maxTeams} teams
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/${tenant}/admin/billing`}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Manage Billing
                    </Link>
                    {canAddTeams && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <span>+</span>
                            <span>Add Team</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Teams */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Teams</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {org.teams.map((team) => (
                        <div key={team.id} className="p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900">{team.name}</h3>
                                <p className="text-sm text-gray-500">/{team.slug}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={`/${team.slug}`}
                                    target="_blank"
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    Open Dashboard
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
                {!canAddTeams && org.maxTeams !== 999 && (
                    <div className="p-4 bg-amber-50 border-t border-amber-100">
                        <p className="text-sm text-amber-800">
                            Team limit reached. <Link href={`/${tenant}/admin/billing`} className="underline">Upgrade</Link> to add more teams.
                        </p>
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Payment Settings</h2>
                </div>
                <div className="p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.passFeesToPayer}
                            onChange={(e) => setSettings(prev => ({ ...prev, passFeesToPayer: e.target.checked }))}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <span className="font-medium text-gray-900">Pass transaction fees to payer</span>
                            <p className="text-sm text-gray-500">
                                When enabled, a small fee is added to payments so your club receives the full amount.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Add Team Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Team</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Team Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTeam.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setNewTeam(prev => ({
                                            ...prev,
                                            name,
                                            slug: prev.slug || generateSlug(name)
                                        }));
                                    }}
                                    placeholder="e.g., Under 12s"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    URL Slug <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTeam.slug}
                                    onChange={(e) => setNewTeam(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="e.g., syston-tigers-u12"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will be the team's URL: app.syston.co/{newTeam.slug || 'team-slug'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTeam}
                                disabled={addingTeam || !newTeam.name || !newTeam.slug}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addingTeam ? 'Creating...' : 'Add Team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
