'use client';

/**
 * Building blocks every club and admin page shares, so headings, empty
 * states and "log in to see this" look the same everywhere.
 */
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { getSessionToken } from '@/lib/session';
import { clubAppLink } from '@/lib/app-link';
import { Icon, type IconName } from './Icon';

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-title break-words">{title}</h1>
        {subtitle && <p className="mt-2 text-muted max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 shrink-0">{actions}</div>}
    </header>
  );
}

/** A friendly empty state that says what to do next. */
export function EmptyNote({ icon = 'info', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card text-center py-12 px-6">
      <div className="mx-auto mb-4 w-14 h-14 hexagon bg-brand/15 text-brand flex items-center justify-center">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <h2 className="text-2xl mb-2">{title}</h2>
      {children && <div className="text-muted max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

/** Shown on members-only club pages to visitors who haven't logged in. */
export function MembersOnly({ tenant, what }: { tenant: string; what: string }) {
  return (
    <EmptyNote
      icon="lock"
      title="Log in to see this"
      action={
        <>
          <Link href={`/login?next=${encodeURIComponent(`/${tenant}`)}`} className="btn btn-primary">Log in</Link>
          <a href={clubAppLink(tenant)} className="btn btn-secondary">Get the club app</a>
        </>
      }
    >
      {what} are for the club&apos;s players, parents and staff. Log in with your club account, or get the club app to join.
    </EmptyNote>
  );
}

/**
 * Whether someone is logged in on this browser: null until we've looked
 * (so members-only pages don't flash the "log in" panel), then true/false.
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    setSignedIn(!!getSessionToken());
  }, []);
  return signedIn;
}

/**
 * Wrap a members-only page: visitors get the "Log in to see this" panel
 * instead of the page (which would only show errors for them).
 */
export function MembersOnlyPage({ tenant, what, title, subtitle, children }: { tenant: string; what: string; title: string; subtitle?: string; children: ReactNode }) {
  const signedIn = useSignedIn();
  if (signedIn === null) return <div className="container py-10 min-h-[50vh]" aria-busy="true" />;
  if (!signedIn) {
    return (
      <div className="container py-10">
        <PageHeader title={title} subtitle={subtitle} />
        <MembersOnly tenant={tenant} what={what} />
      </div>
    );
  }
  return <>{children}</>;
}
