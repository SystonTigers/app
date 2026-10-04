'use client';

/** Small building blocks shared by the owner panel pages. */
import { useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ClubBadge } from '@/components/ui/Brand';
import { brandVars, clubInitials } from '@/lib/brand';
import type { ClubStatus } from '@/lib/owner/types';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card min-w-0 p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children, icon }: { children: React.ReactNode; icon?: IconName }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wider text-foreground mb-3">
      {icon ? <Icon name={icon} className="w-5 h-5 text-brand" /> : null}
      {children}
    </h2>
  );
}

const TONE: Record<'plain' | 'brand' | 'amber' | 'red', string> = {
  plain: 'text-foreground',
  brand: 'text-brand',
  amber: 'text-amber-400',
  red: 'text-red-400',
};

export function Stat({ label, value, hint, tone = 'plain' }: { label: string; value: React.ReactNode; hint?: string; tone?: keyof typeof TONE }) {
  return (
    <div className="card min-w-0 p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted">{label}</div>
      <div className={`font-display text-3xl sm:text-4xl font-extrabold tabular-nums mt-1 leading-none break-words ${TONE[tone]}`}>{value}</div>
      {hint ? <div className="text-xs text-muted mt-2">{hint}</div> : null}
    </div>
  );
}

const STATUS_STYLE: Record<ClubStatus, string> = {
  trial: 'bg-amber-400/10 text-amber-300 border-amber-400/40',
  active: 'bg-brand/10 text-brand border-brand/40',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/40',
  cancelled: 'bg-surface-raised text-muted border-border',
};
const STATUS_TEXT: Record<ClubStatus, string> = { trial: 'Trial', active: 'Active', suspended: 'Suspended', cancelled: 'Cancelled' };
const PILL = 'px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border chamfer-sm whitespace-nowrap';

export function StatusBadge({ status, comped }: { status: string; comped?: boolean }) {
  const s: ClubStatus = status in STATUS_STYLE ? (status as ClubStatus) : 'cancelled';
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`${PILL} ${STATUS_STYLE[s]}`}>{STATUS_TEXT[s]}</span>
      {comped ? <span className={`${PILL} bg-violet-500/10 text-violet-300 border-violet-400/40`}>Free</span> : null}
    </span>
  );
}

/** The club's badge, or its initials on its own colour when it hasn't uploaded one. */
export function ClubMark({ name, badgeUrl, color, size = 40 }: { name: string; badgeUrl?: string | null; color?: string | null; size?: number }) {
  if (badgeUrl) return <ClubBadge name={name} badgeUrl={badgeUrl} size={size} />;
  const v = brandVars(color);
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: v.brand, color: `rgb(${v.onBrandRgb})` }}
      className="hexagon font-display font-extrabold flex items-center justify-center shrink-0"
    >
      {clubInitials(name)}
    </span>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-5 p-4 bg-red-500/10 border border-red-500/50 text-red-300 text-sm chamfer-sm flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-start gap-2 min-w-0">
        <Icon name="alert" className="w-5 h-5 shrink-0" />
        <span>{message}</span>
      </span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm min-h-10">
          <Icon name="refresh" className="w-4 h-4" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="py-16 flex flex-col items-center gap-3 text-muted text-sm">
      <span className="w-10 h-10 hexagon bg-brand/20 animate-pulse" aria-hidden="true" />
      {label}
    </div>
  );
}

/** A quiet "nothing here" line inside a card (page-level empties use EmptyNote). */
export function InlineEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-muted text-sm">{children}</p>;
}

/** Label and value on one line, wrapping on narrow screens. */
export function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground text-right min-w-0 break-words">{children}</dd>
    </div>
  );
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
      setError(err instanceof Error ? err.message : "That didn't load. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}
