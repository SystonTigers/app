'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/session';
import { PageHeader } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Notice, bodyError } from '@/components/admin/AdminUi';

type ImportType = 'fixtures' | 'results' | 'players' | 'match-events';

interface ImportResult {
    success: boolean;
    imported?: number;
    total?: number;
    errors?: string[];
    error?: string;
}

interface Counts {
    players: number;
    fixtures: number;
    matches: number;
    match_events: number;
}

interface Season {
    id: string;
    name: string;
    is_current: number;
}

const TYPES: Array<{ value: ImportType; label: string; icon: IconName }> = [
    { value: 'players', label: 'Players', icon: 'users' },
    { value: 'fixtures', label: 'Fixtures', icon: 'calendar' },
    { value: 'results', label: 'Results', icon: 'trophy' },
    { value: 'match-events', label: 'Goals, assists and cards', icon: 'ball' },
];

/** Split CSV text into rows for the preview (simple: commas, no quoted commas). */
function previewRows(csv: string): string[][] {
    return csv.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(',').map((c) => c.trim()));
}

export default function ImportPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = use(params);
    const [importType, setImportType] = useState<ImportType>('players');
    const [csvContent, setCsvContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [counts, setCounts] = useState<Counts | null>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [templateError, setTemplateError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadCounts = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v1/import/status');
            const data = await res.json();
            if (data?.success) setCounts(data.counts as Counts);
        } catch (err) {
            console.error('Failed to load counts', err);
        }
    }, []);

    useEffect(() => {
        apiFetch('/api/v1/seasons')
            .then((res) => res.json())
            .then((data) => { if (data?.success) setSeasons((data.data ?? []) as Season[]); })
            .catch((err) => console.error('Failed to load seasons', err));
        loadCounts();
    }, [tenant, loadCounts]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setResult(null);
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => setCsvContent(String(event.target?.result ?? ''));
        reader.readAsText(file);
    };

    // Fetched from the backend and saved as a file (a plain link would hit this website instead)
    const downloadTemplate = async (type: ImportType) => {
        setTemplateError('');
        try {
            const res = await apiFetch(`/api/v1/import/template/${type}`);
            if (!res.ok) throw new Error();
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-template.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setTemplateError("The template didn't download. Please try again.");
        }
    };

    const handleImport = async () => {
        if (!csvContent.trim()) {
            setResult({ success: false, error: 'Choose a CSV file first.' });
            return;
        }
        setImporting(true);
        setResult(null);
        try {
            const path = selectedSeasonId
                ? `/api/v1/import/${importType}?seasonId=${encodeURIComponent(selectedSeasonId)}`
                : `/api/v1/import/${importType}`;
            // Sent to the API (not this website), with the login token
            const res = await apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csvContent });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                setResult({ success: false, error: bodyError(data, "The import didn't work. Check the file matches the template and try again.") });
                return;
            }
            setResult(data as ImportResult);
            loadCounts();
        } catch {
            setResult({ success: false, error: "We couldn't reach the server. Check your connection and try again." });
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setCsvContent('');
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const rows = csvContent ? previewRows(csvContent) : [];
    const typeLabel = TYPES.find((t) => t.value === importType)?.label.toLowerCase() ?? importType;

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            <PageHeader eyebrow="Club admin" title="Import" subtitle="Bring in players, fixtures, results and past stats from a spreadsheet saved as CSV." />

            {counts && (
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {[
                        { label: 'Players', value: counts.players },
                        { label: 'Fixtures', value: counts.fixtures },
                        { label: 'Results', value: counts.matches },
                        { label: 'Goals, cards…', value: counts.match_events },
                    ].map((c) => (
                        <div key={c.label} className="bg-surface border border-border chamfer-sm p-4">
                            <dd className="font-display text-4xl font-extrabold text-brand">{c.value}</dd>
                            <dt className="text-xs text-muted uppercase tracking-wider">{c.label}</dt>
                        </div>
                    ))}
                </dl>
            )}

            <div className="card space-y-8">
                <section aria-labelledby="step1">
                    <h2 id="step1" className="text-2xl mb-3">1. What are you importing?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="radiogroup" aria-labelledby="step1">
                        {TYPES.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={importType === opt.value}
                                onClick={() => { setImportType(opt.value); setResult(null); }}
                                className={`p-4 border text-left transition-colors chamfer-sm ${importType === opt.value ? 'border-brand bg-brand/10' : 'border-border bg-surface-raised hover:border-brand/50'}`}
                            >
                                <Icon name={opt.icon} className="w-6 h-6 text-brand mb-2" />
                                <span className="block font-semibold text-sm">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => downloadTemplate(importType)} className="btn btn-sm btn-ghost mt-3 px-0 text-brand">
                        <Icon name="download" className="w-4 h-4" /> Download the {typeLabel} template
                    </button>
                    {templateError && <Notice tone="error">{templateError}</Notice>}
                </section>

                <section aria-labelledby="step-season">
                    <h2 id="step-season" className="text-2xl mb-3">2. Which season?</h2>
                    <label htmlFor="import-season" className="label">Season</label>
                    <select id="import-season" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} className="field max-w-md">
                        <option value="">This season</option>
                        {seasons.map((season) => (
                            <option key={season.id} value={season.id}>{season.name}{season.is_current === 1 ? ' (current)' : ''}</option>
                        ))}
                    </select>
                    <p className="text-sm text-muted mt-2">Pick an older season to fill in past results and stats.</p>
                </section>

                <section aria-labelledby="step2">
                    <h2 id="step2" className="text-2xl mb-3">3. Choose the file</h2>
                    <label htmlFor="import-file" className="block border-2 border-dashed border-border hover:border-brand transition-colors p-8 text-center cursor-pointer">
                        <input ref={fileInputRef} id="import-file" type="file" accept=".csv,text/csv" onChange={handleFileSelect} className="sr-only" />
                        <Icon name={fileName ? 'file' : 'upload'} className="w-10 h-10 text-brand mx-auto mb-2" />
                        {fileName ? (
                            <>
                                <span className="block font-semibold break-all">{fileName}</span>
                                <span className="block text-sm text-muted mt-1">{Math.max(rows.length - 1, 0)} rows found</span>
                            </>
                        ) : (
                            <>
                                <span className="block font-semibold">Choose a CSV file</span>
                                <span className="block text-sm text-muted mt-1">In Excel or Google Sheets: File, then Save as / Download as CSV.</span>
                            </>
                        )}
                    </label>
                </section>

                {rows.length > 0 && (
                    <section aria-labelledby="step3">
                        <h2 id="step3" className="text-2xl mb-3">4. Check it looks right</h2>
                        <div className="table-scroll relative border border-border">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-raised">
                                    <tr>{rows[0].map((h, i) => <th key={i} scope="col" className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {rows.slice(1, 6).map((row, i) => (
                                        <tr key={i}>{row.map((cell, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{cell}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {rows.length > 6 && <p className="text-sm text-muted mt-2">and {rows.length - 6} more rows</p>}
                    </section>
                )}

                {result && (
                    result.success ? (
                        <Notice tone="success">
                            <p className="font-semibold">Imported {result.imported ?? 0} of {result.total ?? 0} rows.</p>
                            {result.errors && result.errors.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-amber-200">
                                    {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            )}
                        </Notice>
                    ) : (
                        <Notice tone="error">{result.error || "The import didn't work. Please try again."}</Notice>
                    )
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button type="button" onClick={handleReset} className="btn btn-ghost">Start again</button>
                    <button type="button" onClick={handleImport} disabled={!csvContent || importing} className="btn btn-primary flex-1">
                        {importing ? 'Importing…' : `Import ${typeLabel}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
