'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClientSDK, updateTable } from '@/lib/sdk';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface TableRow {
    position: number;
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
}

type NumberField = Exclude<keyof TableRow, 'team' | 'position'>;

const NUMBER_COLUMNS: Array<{ key: NumberField; short: string; long: string }> = [
    { key: 'played', short: 'P', long: 'Played' },
    { key: 'won', short: 'W', long: 'Won' },
    { key: 'drawn', short: 'D', long: 'Drawn' },
    { key: 'lost', short: 'L', long: 'Lost' },
    { key: 'goalsFor', short: 'GF', long: 'Goals for' },
    { key: 'goalsAgainst', short: 'GA', long: 'Goals against' },
    { key: 'points', short: 'Pts', long: 'Points' },
];

const blankRow = (position: number): TableRow => ({ position, team: '', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

export default function TableAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [rows, setRows] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const loadTable = useCallback(async () => {
        setLoadError('');
        try {
            const data: unknown = await createClientSDK(tenant).getLeagueTable();
            const list = Array.isArray(data) ? (data as TableRow[]) : [];
            // No table yet: give ten empty rows to fill in
            setRows(list.length ? list : Array.from({ length: 10 }, (_, i) => blankRow(i + 1)));
        } catch (err) {
            setLoadError(sdkErrorMessage(err, "We couldn't load the league table. Check your connection and try again."));
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        loadTable();
    }, [loadTable]);

    async function handleAutoCalculate() {
        setCalculating(true);
        setMessage(null);
        try {
            const result = await createClientSDK(tenant).autoCalculateTable();
            if (!result.success) throw new Error();
            setMessage({ tone: 'success', text: `${result.message || 'Table worked out from your results.'}${result.teams ? ` (${result.teams} teams)` : ''}` });
            loadTable();
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, "We couldn't work out the table. Add some results first, then try again.") });
        } finally {
            setCalculating(false);
        }
    }

    function updateRow(index: number, field: keyof TableRow, value: string) {
        setMessage(null);
        const next = [...rows];
        next[index] = { ...next[index], [field]: field === 'team' ? value : Math.max(0, parseInt(value, 10) || 0) };
        setRows(next);
    }

    async function handleSave() {
        setSaving(true);
        setMessage(null);
        try {
            await updateTable(rows.filter((r) => r.team.trim() !== ''));
            setMessage({ tone: 'success', text: 'Table saved.' });
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, "The table didn't save. Please try again.") });
        } finally {
            setSaving(false);
        }
    }

    async function resign(team: string) {
        if (!confirm(`Has ${team} resigned from the league? Their fixtures and results will be deleted and the table worked out again.`)) return;
        setMessage(null);
        try {
            await createClientSDK(tenant).resignTeam(team);
            setMessage({ tone: 'success', text: `${team} removed from the league.` });
            loadTable();
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, `${team} wasn't removed. Please try again.`) });
        }
    }

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="League table"
                subtitle={<>The table usually looks after itself from your results and the league results you paste in <Link href={`/${tenant}/admin/settings/fa-sync`} className="text-brand underline">Settings</Link>. Change it by hand here if you need to.</>}
                actions={
                    <>
                        <button type="button" onClick={handleAutoCalculate} disabled={calculating} className="btn btn-secondary">
                            <Icon name="refresh" className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
                            {calculating ? 'Working it out…' : 'Work out from results'}
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving || loading} className="btn btn-primary">
                            {saving ? 'Saving…' : 'Save table'}
                        </button>
                    </>
                }
            />

            {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading the table" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadTable(); }} />
            ) : (
                <div className="card p-0">
                    <div className="table-scroll relative">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                                    <th scope="col" className="px-3 py-3 text-center w-12">Pos</th>
                                    <th scope="col" className="px-2 py-3 text-left">Team</th>
                                    {NUMBER_COLUMNS.map((c) => <th key={c.key} scope="col" className="px-1 py-3 text-center w-16"><abbr title={c.long} className="no-underline">{c.short}</abbr></th>)}
                                    <th scope="col" className="px-3 py-3 text-right"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {rows.map((row, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 text-center font-display text-lg font-bold">{row.position}</td>
                                        <td className="px-2 py-2">
                                            <input type="text" aria-label={`Team in position ${row.position}`} value={row.team} onChange={(e) => updateRow(i, 'team', e.target.value)} className="field py-2 px-3" placeholder="Team name" />
                                        </td>
                                        {NUMBER_COLUMNS.map((c) => (
                                            <td key={c.key} className="px-1 py-2">
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={0}
                                                    aria-label={`${c.long} for ${row.team || `position ${row.position}`}`}
                                                    value={row[c.key]}
                                                    onChange={(e) => updateRow(i, c.key, e.target.value)}
                                                    className={`field py-2 px-1 text-center ${c.key === 'points' ? 'font-bold text-brand' : ''}`}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-right">
                                            {row.team && (
                                                <button type="button" onClick={() => resign(row.team)} className="btn btn-sm btn-ghost hover:text-red-400" title="The team has left the league">
                                                    Resigned
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
