'use client';

import Link from 'next/link';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { formatDateTime } from '@/lib/format';
import { ownerApi } from '@/lib/owner/client';
import { Card, ErrorBox, Loading, useLoad } from '@/components/owner/ui';

export default function OwnerHistoryPage() {
  const { data, error, loading, reload } = useLoad(() => ownerApi.history());
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader eyebrow="Owner panel" title="History" subtitle="The latest changes made from this panel, newest first." />
      {data.length ? (
        <Card className="py-2">
          <ul className="divide-y divide-border">
            {data.map((h, i) => (
              <li key={`${h.at}-${i}`} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4">
                <div className="min-w-0">
                  <div className="text-foreground">{h.detail ?? h.action}</div>
                  {h.clubId ? (
                    <Link href={`/owner/clubs/${h.clubId}`} className="inline-block py-1 text-sm font-bold text-brand hover:underline">{h.clubName ?? 'Open club'}</Link>
                  ) : null}
                </div>
                <div className="text-xs text-muted sm:whitespace-nowrap">{formatDateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyNote
          icon="history"
          title="No changes yet"
          action={<Link href="/owner/clubs" className="btn btn-secondary">Go to clubs</Link>}
        >
          When you extend a trial, change a plan or suspend a club, it&apos;s listed here.
        </EmptyNote>
      )}
    </>
  );
}
