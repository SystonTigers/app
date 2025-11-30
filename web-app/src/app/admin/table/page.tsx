'use client';

import { useState, useEffect } from 'react';
import { createClientSDK, updateTable } from '@/lib/sdk';

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

export default function TableAdminPage() {
    const [rows, setRows] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTable();
    }, []);

    async function loadTable() {
        try {
            const sdk = createClientSDK();
            const data = await sdk.getLeagueTable();
            if (data.length > 0) {
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Table Manager</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand text-white px-6 py-2 rounded hover:bg-brand/90 transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
