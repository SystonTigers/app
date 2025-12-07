'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK, updateTable } from '@/lib/sdk';

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

export default function TableAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const sdk = createClientSDK(tenant);
    const [rows, setRows] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [calcMessage, setCalcMessage] = useState('');

    async function handleAutoCalculate() {
        setCalculating(true);
        setCalcMessage('');
        try {
            const result = await sdk.autoCalculateTable();
            if (result.success) {
                setCalcMessage(`✅ ${result.message || 'Calculated!'} (${result.teams || 0} teams)`);
                loadTable();
            } else {
                setCalcMessage(`❌ ${(result as any).error || 'Calculation failed'}`);
            }
        } catch (err: any) {
            setCalcMessage(`❌ ${err.message || 'Calculation failed'}`);
        } finally {
            setCalculating(false);
        }
    }

    useEffect(() => {
        loadTable();
    }, [tenant]);

    async function loadTable() {
        try {
            const sdk = createClientSDK(tenant);
            const data = await sdk.getLeagueTable();
            // API returns { success: true, data: [...] } usually for public endpoints
            // But getLeagueTable in ClientSDK calls /public/.../table
            // public.ts returns { success: true, data: [...] }
            if ((data as any).success && Array.isArray((data as any).data)) {
                setRows((data as any).data as TableRow[]);
            } else if (Array.isArray(data)) {
                setRows(data as unknown as TableRow[]);
            } else {
                // Default empty rows
                setRows(Array.from({ length: 10 }, (_, i) => ({
                    position: i + 1,
                    team: '',
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    points: 0
                })));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function updateRow(index: number, field: keyof TableRow, value: any) {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: value };
        setRows(newRows);
    }

    async function handleSave() {
        setSaving(true);
        try {
            // Filter out empty rows
            const validRows = rows.filter(r => r.team.trim() !== '');
            await updateTable(validRows);
            alert('Table saved successfully!');
        } catch (err) {
            alert('Failed to save table');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Table Manager</h1>
                <div className="flex items-center gap-4 flex-wrap">
                    {calcMessage && <span className="text-sm">{calcMessage}</span>}
                    <button
                        onClick={handleAutoCalculate}
                        disabled={calculating}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {calculating ? (
                            <><span className="animate-spin">⏳</span> Calculating...</>
                        ) : (
                            <>🔄 Auto-Calculate from Results</>
                        )}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand text-white px-6 py-2 rounded hover:bg-brand/90 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-2 text-center w-12">Pos</th>
                            <th className="px-4 py-2 text-left">Team</th>
                            <th className="px-2 py-2 text-center w-16">P</th>
                            <th className="px-2 py-2 text-center w-16">W</th>
                            <th className="px-2 py-2 text-center w-16">D</th>
                            <th className="px-2 py-2 text-center w-16">L</th>
                            <th className="px-2 py-2 text-center w-16">GF</th>
                            <th className="px-2 py-2 text-center w-16">GA</th>
                            <th className="px-2 py-2 text-center w-16">Pts</th>
                            <th className="px-2 py-2 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rows.map((row, i) => (
                            <tr key={i}>
                                <td className="px-2 py-2 text-center">{row.position}</td>
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        value={row.team}
                                        onChange={e => updateRow(i, 'team', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700"
                                        placeholder="Team Name"
                                    />
                                </td>
                                <td className="px-2 py-2"><input type="number" value={row.played} onChange={e => updateRow(i, 'played', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700" /></td>
                                <td className="px-2 py-2"><input type="number" value={row.won} onChange={e => updateRow(i, 'won', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700" /></td>
                                <td className="px-2 py-2"><input type="number" value={row.drawn} onChange={e => updateRow(i, 'drawn', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700" /></td>
                                <td className="px-2 py-2"><input type="number" value={row.lost} onChange={e => updateRow(i, 'lost', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700" /></td>
                                <td className="px-2 py-2"><input type="number" value={row.goalsFor} onChange={e => updateRow(i, 'goalsFor', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700" /></td>
                                <td className="px-2 py-2"><input type="number" value={row.goalsAgainst} onChange={e => updateRow(i, 'goalsAgainst', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700" /></td>
                                <td className="px-2 py-2"><input type="number" value={row.points} onChange={e => updateRow(i, 'points', parseInt(e.target.value))} className="w-full text-center p-1 border rounded dark:bg-gray-700 font-bold" /></td>
                                <td className="px-2 py-2 text-center">
                                    {row.team && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`Are you sure ${row.team} has resigned? This will delete all their fixtures and results.`)) {
                                                    const sdk = createClientSDK(tenant);
                                                    sdk.resignTeam(row.team).then(() => {
                                                        alert(`${row.team} resigned.`);
                                                        loadTable();
                                                    });
                                                }
                                            }}
                                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                                        >
                                            Resign
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
