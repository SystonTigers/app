'use client';

import Link from 'next/link';
import { ownerApi } from '@/lib/owner/client';
import { dateTime } from '@/lib/owner/format';
import { Card, Empty, ErrorBox, Loading, PageTitle, useLoad } from '@/components/owner/ui';

export default function OwnerHistoryPage() {
  const { data, error, loading, reload } = useLoad(() => ownerApi.history());
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageTitle title="History" sub="The latest changes made from this panel, newest first." />
      <Card>
        {data.length ? (
          <ul className="divide-y divide-gray-800">
            {data.map((h, i) => (
              <li key={`${h.at}-${i}`} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white">{h.detail ?? h.action}</div>
                  {h.clubId ? (
                    <Link href={`/owner/clubs/${h.clubId}`} className="text-xs text-brand no-underline hover:underline">{h.clubName ?? h.clubId}</Link>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{dateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</div>
              </li>
            ))}
          </ul>
        ) : <Empty>No changes yet.</Empty>}
      </Card>
    </>
  );
}
