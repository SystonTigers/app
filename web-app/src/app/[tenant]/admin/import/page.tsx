'use client';

import { useState, useRef } from 'react';
import { createClientSDK } from '@/lib/sdk';

type ImportType = 'fixtures' | 'results' | 'players' | 'match-events';

interface ImportResult {
    success: boolean;
    imported?: number;
    total?: number;
    errors?: string[];
    error?: string;
}

export default function ImportPage({ params }: { params: { tenant: string } }) {
    const [importType, setImportType] = useState<ImportType>('players');
    const [csvContent, setCsvContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [counts, setCounts] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sdk = createClientSDK(params.tenant);

    // Load current data counts
    const loadCounts = async () => {
        try {
            const res = await fetch(`/api/v1/import/status`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setCounts(data.counts);
            }
        } catch (err) {
            console.error('Failed to load counts', err);
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            setCsvContent(event.target?.result as string);
        };
        reader.readAsText(file);
    };

    // Download template
    const downloadTemplate = async (type: ImportType) => {
        window.open(`/api/v1/import/template/${type}`, '_blank');
    };

    // Perform import
    const handleImport = async () => {
        if (!csvContent.trim()) {
            setResult({ success: false, error: 'No CSV content to import' });
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            const res = await fetch(`/api/v1/import/${importType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/csv',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: csvContent
            });
            const data = await res.json();
            setResult(data);

            if (data.success) {
                loadCounts();
            }
        } catch (err: any) {
            setResult({ success: false, error: err.message });
        } finally {
            setImporting(false);
        }
    };

    // Reset form
    const handleReset = () => {
        setCsvContent('');
        setFileName('');
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const typeOptions = [
        { value: 'players', label: 'Players/Squad', icon: '👥' },
        { value: 'fixtures', label: 'Fixtures', icon: '📅' },
        { value: 'results', label: 'Match Results', icon: '📊' },
        { value: 'match-events', label: 'Goals/Assists/Cards', icon: '⚽' }
    ];

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Import Data
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
                Upload CSV files to bulk import historical data
            </p>

            {/* Current Data Counts */}
            {counts && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-brand">{counts.players}</div>
                        <div className="text-sm text-gray-500">Players</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-brand">{counts.fixtures}</div>
                        <div className="text-sm text-gray-500">Fixtures</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-brand">{counts.matches}</div>
                        <div className="text-sm text-gray-500">Results</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-brand">{counts.match_events}</div>
                        <div className="text-sm text-gray-500">Events</div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {/* Step 1: Select Type */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3">1. Select Data Type</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {typeOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setImportType(opt.value as ImportType)}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${importType === opt.value
                                        ? 'border-brand bg-brand/5'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{opt.icon}</div>
                                <div className="font-medium text-sm">{opt.label}</div>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => downloadTemplate(importType)}
                        className="mt-3 text-sm text-brand hover:underline"
                    >
                        ⬇️ Download {importType} template
                    </button>
                </div>

                {/* Step 2: Upload File */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3">2. Upload CSV File</h3>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand transition-colors"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        {fileName ? (
                            <div>
                                <div className="text-4xl mb-2">📄</div>
                                <div className="font-medium">{fileName}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {csvContent.split('\n').length - 1} rows detected
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-4xl mb-2">📁</div>
                                <div className="font-medium">Click to select a CSV file</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    or drag and drop here
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview */}
                {csvContent && (
                    <div className="mb-6">
                        <h3 className="text-lg font-bold mb-3">3. Preview</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        {csvContent.split('\n')[0].split(',').map((header, i) => (
                                            <th key={i} className="px-4 py-2 text-left font-medium">
                                                {header.trim()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {csvContent.split('\n').slice(1, 6).map((row, i) => (
                                        <tr key={i}>
                                            {row.split(',').map((cell, j) => (
                                                <td key={j} className="px-4 py-2">{cell.trim()}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {csvContent.split('\n').length > 6 && (
                                <div className="text-center py-2 text-sm text-gray-500">
                                    ... and {csvContent.split('\n').length - 6} more rows
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className={`mb-6 p-4 rounded-xl ${result.success
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                        {result.success ? (
                            <div>
                                <div className="font-bold text-green-700 dark:text-green-400">
                                    ✅ Import Successful
                                </div>
                                <div className="text-sm mt-1">
                                    Imported {result.imported} of {result.total} rows
                                </div>
                                {result.errors && result.errors.length > 0 && (
                                    <div className="mt-2">
                                        <div className="font-medium text-sm text-amber-600">Warnings:</div>
                                        <ul className="text-sm list-disc list-inside">
                                            {result.errors.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="font-bold text-red-700 dark:text-red-400">
                                ❌ {result.error || 'Import failed'}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleImport}
                        disabled={!csvContent || importing}
                        className="flex-1 bg-brand text-white py-3 px-6 rounded-xl font-bold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {importing ? '⏳ Importing...' : `Import ${importType}`}
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
