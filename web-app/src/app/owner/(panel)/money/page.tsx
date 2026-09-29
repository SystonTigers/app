'use client';

import { ownerApi } from '@/lib/owner/client';
import { pounds } from '@/lib/owner/format';
import { Card, CardTitle, ErrorBox, Loading, PageTitle, Stat, useLoad } from '@/components/owner/ui';

export default function OwnerMoneyPage() {
  const { data, error, loading, reload } = useLoad(() => ownerApi.money());
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageTitle title="Money" sub="Subscriptions by plan, and what's been taken." />
      {!data.stripeConnected ? (
        <div className="mb-5 p-4 border border-amber-400/40 bg-amber-400/5 text-amber-200 text-sm chamfer-sm">
          Card payments aren&apos;t switched on yet (Stripe isn&apos;t connected). Monthly income below is what active clubs would pay on their plan; nothing is being charged.
        </div>
      ) : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Monthly income" value={pounds(data.monthlyRecurringPence)} hint={`${data.payingClubs} paying club${data.payingClubs === 1 ? '' : 's'}`} tone="brand" />
        <Stat label="Yearly run rate" value={pounds(data.monthlyRecurringPence * 12)} />
        <Stat label="If trials pay" value={`+${pounds(data.trialPipelinePence)}`} hint="per month" tone="amber" />
        <Stat label="Taken, last 30 days" value={pounds(data.recorded30dPence)} hint="Subscriptions, dues fees and shop" />
      </div>
      <Card>
        <CardTitle>By plan</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[28rem]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="py-2 pr-3 font-bold">Plan</th>
                <th className="py-2 pr-3 font-bold text-right">Price</th>
                <th className="py-2 pr-3 font-bold text-right">Paying</th>
                <th className="py-2 pr-3 font-bold text-right">On trial</th>
                <th className="py-2 font-bold text-right">Monthly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 tabular-nums">
              {data.byPlan.map((p) => (
                <tr key={p.plan}>
                  <td className="py-2.5 pr-3 font-bold text-white">{p.name}</td>
                  <td className="py-2.5 pr-3 text-right text-gray-300">{pounds(p.monthlyPence)}</td>
                  <td className="py-2.5 pr-3 text-right text-white">{p.active}</td>
                  <td className="py-2.5 pr-3 text-right text-amber-300">{p.trial}</td>
                  <td className="py-2.5 text-right text-brand font-bold">{pounds(p.active * p.monthlyPence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">Clubs with free access aren&apos;t counted as paying.</p>
      </Card>
    </>
  );
}
