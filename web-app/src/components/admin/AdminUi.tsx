'use client';

/**
 * Small pieces the club admin pages share: loading, "couldn't load" with
 * Try again, inline messages, a dialog and status pills, so every admin page
 * behaves and looks the same.
 */
import { useEffect, useId, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Placeholder blocks while a page loads. */
export function LoadingBlock({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
    return (
        <div role="status" aria-live="polite" className="space-y-3">
            <span className="sr-only">{label}</span>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="h-20 bg-surface border border-border chamfer-sm animate-pulse" />
            ))}
        </div>
    );
}

/** A load failed: say so and offer to try again. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="card flex flex-col sm:flex-row sm:items-center gap-4 border-red-500/40">
            <div className="flex items-start gap-3 flex-1">
                <Icon name="alert" className="w-5 h-5 text-red-400 mt-0.5" />
                <p className="text-foreground">{message}</p>
            </div>
            {onRetry && (
                <button type="button" onClick={onRetry} className="btn btn-sm btn-secondary">
                    <Icon name="refresh" className="w-4 h-4" /> Try again
                </button>
            )}
        </div>
    );
}

/** An inline message after an action: green when it worked, red when it didn't. */
export function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: ReactNode }) {
    const styles = {
        success: 'border-green-500/40 bg-green-500/10 text-green-200',
        error: 'border-red-500/40 bg-red-500/10 text-red-200',
        info: 'border-brand/40 bg-brand/10 text-foreground',
    }[tone];
    const icon = tone === 'success' ? 'check' : tone === 'error' ? 'alert' : 'info';
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 border px-4 py-3 text-sm chamfer-sm ${styles}`}>
            <Icon name={icon} className="w-5 h-5 shrink-0" />
            <div className="min-w-0">{children}</div>
        </div>
    );
}

/** A small coloured label (e.g. "Open", "Posted"). */
export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'; children: ReactNode }) {
    const styles = {
        neutral: 'border-border bg-surface-raised text-muted',
        brand: 'border-brand/40 bg-brand/10 text-brand',
        success: 'border-green-500/40 bg-green-500/10 text-green-300',
        warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        danger: 'border-red-500/40 bg-red-500/10 text-red-300',
    }[tone];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 border text-xs font-bold uppercase tracking-wider whitespace-nowrap ${styles}`}>
            {children}
        </span>
    );
}

/** A dialog over the page; Escape or the backdrop closes it. */
export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
    const titleId = useId();
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto bg-surface border border-border shadow-2xl sm:chamfer-lg`}>
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
                    <h2 id={titleId} className="text-2xl">{title}</h2>
                    <button type="button" onClick={onClose} className="p-2 -mr-2 text-muted hover:text-brand" aria-label="Close">
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

/** A card with a heading row (title, optional note and actions) and a body. */
export function Panel({ title, note, actions, children, className = '' }: { title: string; note?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`card ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="min-w-0">
                    <h2 className="text-2xl">{title}</h2>
                    {note && <p className="text-sm text-muted mt-1">{note}</p>}
                </div>
                {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            {children}
        </section>
    );
}

/** Read `{ error }` / `{ error: { message } }` from a JSON body we already parsed. */
export function bodyError(body: unknown, fallback: string): string {
    if (body && typeof body === 'object' && 'error' in body) {
        const err = (body as { error: unknown }).error;
        if (typeof err === 'string' && err) return err;
        if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
            return (err as { message: string }).message;
        }
    }
    return fallback;
}

/**
 * A message people can act on from an error thrown by lib/sdk's `http`
 * ("HTTP 400 Bad Request: {json}"): the server's own message when it sent
 * one, otherwise the fallback.
 */
export function sdkErrorMessage(err: unknown, fallback: string): string {
    if (!(err instanceof Error)) return fallback;
    const json = err.message.indexOf('{');
    if (json >= 0) {
        try {
            return bodyError(JSON.parse(err.message.slice(json)), fallback);
        } catch {
            return fallback;
        }
    }
    return fallback;
}
