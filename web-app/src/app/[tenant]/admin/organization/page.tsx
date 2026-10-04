'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/session';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { Dialog, LoadingBlock, Notice, bodyError } from '@/components/admin/AdminUi';

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

const PLAN_NAMES: Record<string, string> = { essentials: 'Essentials', team: 'Team', club: 'Club', club_pro: 'Club Pro' };

const slugFrom = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Several teams (e.g. age groups) under one club account. Most clubs don't have one yet. */
export default function OrganizationPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', slug: '' });
    const [addingTeam, setAddingTeam] = useState(false);
    const [addError, setAddError] = useState('');
    const [message, setMessage] = useState('');
    const [origin, setOrigin] = useState('');

    const fetchOrganization = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v1/organization');
            const data = await res.json().catch(() => null);
            setOrg(data?.success ? (data.data as Organization) : null);
        } catch {
            setOrg(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setOrigin(window.location.origin);
        fetchOrganization();
    }, [fetchOrganization]);

    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeam.name.trim() || !newTeam.slug.trim()) {
            setAddError('Enter the team name and its web address.');
            return;
        }
        setAddingTeam(true);
        setAddError('');
        try {
            const res = await apiFetch('/api/v1/organization/teams', { method: 'POST', body: JSON.stringify({ teamName: newTeam.name.trim(), teamSlug: newTeam.slug.trim() }) });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "The team wasn't added. Please try again."));
            setShowAdd(false);
            setMessage(`${newTeam.name.trim()} added.`);
            setNewTeam({ name: '', slug: '' });
            fetchOrganization();
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "The team wasn't added. Please try again.");
        } finally {
            setAddingTeam(false);
        }
    };

    if (loading) return <div className="container py-8 md:py-10 max-w-4xl"><LoadingBlock label="Loading" /></div>;

    if (!org) {
        return (
            <div className="container py-8 md:py-10 max-w-4xl">
                <PageHeader eyebrow="Club admin" title="Teams" />
                <EmptyNote icon="users" title="One team for now" action={<Link href={`/${tenant}/admin/billing`} className="btn btn-secondary">See plans</Link>}>
                    Running several teams (such as age groups) under one club account isn&apos;t set up for your club yet.
                </EmptyNote>
            </div>
        );
    }

    const canAddTeams = org.teamCount < org.maxTeams;

    return (
        <div className="container py-8 md:py-10 max-w-4xl">
            <PageHeader
                eyebrow="Club admin"
                title={org.name}
                subtitle={`${PLAN_NAMES[org.plan] ?? org.plan} plan · ${org.teamCount} of ${org.maxTeams === 999 ? 'unlimited' : org.maxTeams} teams`}
                actions={canAddTeams ? <button type="button" onClick={() => setShowAdd(true)} className="btn btn-primary"><Icon name="plus" className="w-4 h-4" /> Add a team</button> : undefined}
            />
            {message && <div className="mb-6"><Notice tone="success">{message}</Notice></div>}

            <section className="card" aria-labelledby="teams-title">
                <h2 id="teams-title" className="text-2xl mb-4">Teams</h2>
                <ul className="divide-y divide-border">
                    {org.teams.map((team) => (
                        <li key={team.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold">{team.name}</p>
                                <p className="text-sm text-muted">/{team.slug}</p>
                            </div>
                            <Link href={`/${team.slug}/admin`} className="btn btn-sm btn-secondary">Open</Link>
                        </li>
                    ))}
                </ul>
                {!canAddTeams && org.maxTeams !== 999 && (
                    <p className="text-sm text-muted mt-4">You&apos;ve reached your plan&apos;s team limit. <Link href={`/${tenant}/admin/billing`} className="text-brand underline">Change plan</Link> to add more.</p>
                )}
            </section>

            {showAdd && (
                <Dialog title="Add a team" onClose={() => setShowAdd(false)}>
                    <form onSubmit={handleAddTeam} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="team-name" className="label">Team name</label>
                            <input id="team-name" type="text" value={newTeam.name} placeholder="e.g. Under 12s"
                                onChange={(e) => { const name = e.target.value; setNewTeam((prev) => ({ name, slug: prev.slug && prev.slug !== slugFrom(prev.name) ? prev.slug : slugFrom(name) })); }}
                                className="field" />
                        </div>
                        <div>
                            <label htmlFor="team-slug" className="label">Web address</label>
                            <input id="team-slug" type="text" value={newTeam.slug} onChange={(e) => setNewTeam({ ...newTeam, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="field" />
                            <p className="text-xs text-muted mt-1 break-all">{origin}/{newTeam.slug || 'team-name'}</p>
                        </div>
                        {addError && <Notice tone="error">{addError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={addingTeam} className="btn btn-primary">{addingTeam ? 'Adding…' : 'Add team'}</button>
                        </div>
                    </form>
                </Dialog>
            )}
        </div>
    );
}
