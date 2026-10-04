'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/session';
import { PageHeader } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, Pill } from '@/components/admin/AdminUi';

interface SubscriptionPlan {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    status: string;
    subscriberCount: number;
}

interface RegistrationFee {
    id: string;
    name: string;
    amount: number;
    season: string | null;
    isMandatory: boolean;
    paidCount: number;
}

interface ClubDocument {
    id: string;
    title: string;
    requiresSignature: boolean;
    requiredForRegistration: boolean;
    signatureCount: number;
}

interface Discount {
    id: string;
    name: string;
    discountType: string;
    discountValue: number;
    appliesTo: string;
}

interface StaffChild {
    id: string;
    playerName: string;
    relationship: string;
}

interface Data {
    plans: SubscriptionPlan[];
    fees: RegistrationFee[];
    documents: ClubDocument[];
    discounts: Discount[];
    staffChildren: StaffChild[];
}

const pounds = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

function Section({ icon, title, note, empty, children }: { icon: IconName; title: string; note: string; empty: boolean; children: ReactNode }) {
    return (
        <section className="card">
            <h2 className="text-2xl flex items-center gap-2"><Icon name={icon} className="w-5 h-5 text-brand" /> {title}</h2>
            <p className="text-sm text-muted mt-1 mb-4">{note}</p>
            {empty ? <p className="text-sm text-muted border border-dashed border-border p-4 text-center">None yet.</p> : <ul className="divide-y divide-border">{children}</ul>}
        </section>
    );
}

/**
 * Signing-on: subs plans, fees, documents and discounts. The server can list
 * them but there's no way to set them up from the website yet, so the page
 * shows what's there and says so.
 */
export default function RegistrationSettingsPage() {
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAll = useCallback(async () => {
        setError('');
        try {
            const paths = ['plans', 'fees', 'documents', 'discounts', 'staff-children'];
            const bodies = await Promise.all(paths.map((p) => apiFetch(`/api/v1/registration/${p}`).then((r) => r.json()).catch(() => null)));
            const list = <T,>(b: unknown): T[] => {
                const d = (b as { success?: boolean; data?: unknown } | null);
                return d?.success && Array.isArray(d.data) ? (d.data as T[]) : [];
            };
            if (bodies.every((b) => !b?.success)) throw new Error();
            setData({
                plans: list<SubscriptionPlan>(bodies[0]),
                fees: list<RegistrationFee>(bodies[1]),
                documents: list<ClubDocument>(bodies[2]),
                discounts: list<Discount>(bodies[3]),
                staffChildren: list<StaffChild>(bodies[4]),
            });
        } catch {
            setError("We couldn't load your signing-on settings. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return (
        <div className="container py-8 md:py-10 max-w-4xl">
            <PageHeader eyebrow="Club admin" title="Signing on" subtitle="Subs plans, signing-on fees, club documents and discounts." />
            <div className="mb-6">
                <Notice tone="info">Setting these up from the website isn&apos;t switched on yet. Anything already set up for your club is listed below.</Notice>
            </div>

            {loading ? (
                <LoadingBlock label="Loading" />
            ) : error || !data ? (
                <ErrorNote message={error || "We couldn't load your signing-on settings."} onRetry={() => { setLoading(true); fetchAll(); }} />
            ) : (
                <div className="space-y-6">
                    <Section icon="refresh" title="Subs plans" note="Regular payments, such as monthly subs." empty={!data.plans.length}>
                        {data.plans.map((plan) => (
                            <li key={plan.id} className="py-3 flex items-center justify-between gap-3">
                                <span><strong>{plan.name}</strong> <span className="text-muted">· {pounds(plan.amount)} {plan.frequency} · {plan.subscriberCount} paying</span></span>
                                <Pill tone={plan.status === 'active' ? 'success' : 'neutral'}>{plan.status}</Pill>
                            </li>
                        ))}
                    </Section>
                    <Section icon="money" title="Signing-on fees" note="One-off fees for the season." empty={!data.fees.length}>
                        {data.fees.map((fee) => (
                            <li key={fee.id} className="py-3 flex items-center justify-between gap-3">
                                <span><strong>{fee.name}</strong> <span className="text-muted">· {pounds(fee.amount)} · {fee.paidCount} paid{fee.season ? ` · ${fee.season}` : ''}</span></span>
                                {fee.isMandatory && <Pill tone="warning">Required</Pill>}
                            </li>
                        ))}
                    </Section>
                    <Section icon="file" title="Club documents" note="Club rules, code of conduct and policies." empty={!data.documents.length}>
                        {data.documents.map((doc) => (
                            <li key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                                <span><strong>{doc.title}</strong> <span className="text-muted">· {doc.signatureCount} signed</span></span>
                                <span className="flex gap-2">
                                    {doc.requiresSignature && <Pill tone="brand">Needs signing</Pill>}
                                    {doc.requiredForRegistration && <Pill tone="warning">Needed to sign on</Pill>}
                                </span>
                            </li>
                        ))}
                    </Section>
                    <Section icon="tag" title="Discounts" note="For coaches' children, volunteers and brothers and sisters." empty={!data.discounts.length && !data.staffChildren.length}>
                        {data.discounts.map((d) => (
                            <li key={d.id} className="py-3">
                                <strong>{d.name}</strong>{' '}
                                <span className="text-muted">· {d.discountType === 'free' ? 'Free' : d.discountType === 'percentage' ? `${d.discountValue}% off` : `${pounds(d.discountValue)} off`} · for {d.appliesTo.replace(/_/g, ' ')}</span>
                            </li>
                        ))}
                        {data.staffChildren.map((link) => (
                            <li key={link.id} className="py-3"><strong>{link.playerName}</strong> <span className="text-muted">· {link.relationship} of a member of staff</span></li>
                        ))}
                    </Section>
                </div>
            )}
        </div>
    );
}
