'use client';

/** Small building blocks shared by the owner panel pages. */
import { useCallback, useEffect, useState } from 'react';
import type { ClubStatus } from '@/lib/owner/types';

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">{title}</h1>
        {sub ? <p className="text-sm text-gray-400 mt-1">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 bg-gray-900/60 border border-gray-800 chamfer-lg p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{children}</h2>;
}

export function Stat({ label, value, hint, tone = 'white' }: { label: string; value: React.ReactNode; hint?: string; tone?: 'white' | 'brand' | 'amber' | 'red' }) {
  const colour = { white: 'text-white', brand: 'text-brand', amber: 'text-amber-400', red: 'text-red-400' }[tone];
  return (
    <div className="bg-gray-900/60 border border-gray-800 chamfer-sm p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
      <div className={`text-3xl font-black tabular-nums mt-1 ${colour}`}>{value}</div>
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  );
}

const STATUS_STYLE: Record<ClubStatus, string> = {
  trial: 'bg-amber-400/10 text-amber-300 border-amber-400/40',
  active: 'bg-brand/10 text-brand border-brand/40',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/40',
  cancelled: 'bg-gray-700/30 text-gray-400 border-gray-600',
};
const STATUS_TEXT: Record<ClubStatus, string> = { trial: 'Trial', active: 'Active', suspended: 'Suspended', cancelled: 'Cancelled' };

export function StatusBadge({ status, comped }: { status: string; comped?: boolean }) {
  const s = (status in STATUS_STYLE ? status : 'cancelled') as ClubStatus;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border chamfer-sm ${STATUS_STYLE[s]}`}>{STATUS_TEXT[s] ?? status}</span>
      {comped ? <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border chamfer-sm bg-violet-500/10 text-violet-300 border-violet-400/40">Free</span> : null}
    </span>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="p-4 bg-red-900/20 border border-red-500/50 text-red-300 text-sm chamfer-sm flex flex-wrap items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry ? <button type="button" onClick={onRetry} className="font-bold uppercase text-xs tracking-wider text-white hover:text-brand">Try again</button> : null}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="py-16 text-center text-brand font-mono text-sm animate-pulse">{label}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-gray-500 text-sm">{children}</div>;
}

/** Load data for a page, with loading and error state and a reload function. */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await run());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}

export const inputClass = 'w-full px-4 py-2.5 bg-black/50 border border-gray-700 text-white placeholder-gray-600 focus:border-brand focus:ring-1 focus:ring-brand outline-none chamfer-sm';
export const buttonClass = 'px-4 py-2.5 bg-brand text-black font-black uppercase italic tracking-wider text-sm chamfer-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const ghostButtonClass = 'px-4 py-2.5 border border-gray-700 text-white font-bold uppercase tracking-wider text-xs chamfer-sm hover:border-brand hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
