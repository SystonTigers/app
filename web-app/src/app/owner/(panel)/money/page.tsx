'use client';

import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/format';
import { ownerApi } from '@/lib/owner/client';
import { Card, CardTitle, ErrorBox, InlineEmpty, Loading, Stat, useLoad } from '@/components/owner/ui';

export default function OwnerMoneyPage() {
  const { data, error, loading, reload } = useLoad(() => ownerApi.money());
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader eyebrow="Owner panel" title="Money" subtitle="Subscriptions by plan, and what's been taken." />

      {!data.stripeConnected ? (
        <div className="mb-6 p-4 flex items-start gap-3 border border-amber-400/40 bg-amber-400/5 text-amber-200 text-sm chamfer-sm">
          <Icon name="info" className="w-5 h-5 shrink-0" />
          <p>Card payments aren&apos;t switched on yet (Stripe isn&apos;t connected). Monthly income below is what active clubs would pay on their plan; nothing is being charged.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Monthly income" value={formatMoney(data.monthlyRecurringPence)} hint={`${data.payingClubs} paying club${data.payingClubs === 1 ? '' : 's'}`} tone="brand" />
        <Stat label="A year at this rate" value={formatMoney(data.monthlyRecurringPence * 12)} />
        <Stat label="If trials pay" value={`+${formatMoney(data.trialPipelinePence)}`} hint="a month" tone="amber" />
        <Stat label="Taken in 30 days" value={formatMoney(data.recorded30dPence)} hint="Club plans, subs fees and shop" />
      </div>

      <Card>
        <CardTitle icon="card">By plan</CardTitle>
        {data.byPlan.length ? (
          <>
            {/* Phones: one block per plan */}
            <ul className="sm:hidden divide-y divide-border">
              {data.byPlan.map((p) => (
                <li key={p.plan} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-bold uppercase tracking-wide text-foreground">{p.name}</span>
                    <span className="text-sm text-muted tabular-nums">{formatMoney(p.monthlyPence)} a month</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-center tabular-nums">
                    <div className="flex flex-col-reverse bg-surface-raised border border-border py-2 chamfer-sm">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Paying</dt>
                      <dd className="font-display text-xl font-extrabold text-foreground leading-none">{p.active}</dd>
                    </div>
                    <div className="flex flex-col-reverse bg-surface-raised border border-border py-2 chamfer-sm">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">On trial</dt>
                      <dd className="font-display text-xl font-extrabold text-amber-300 leading-none">{p.trial}</dd>
                    </div>
                    <div className="flex flex-col-reverse bg-surface-raised border border-border py-2 chamfer-sm">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Monthly</dt>
                      <dd className="font-display text-xl font-extrabold text-brand leading-none">{formatMoney(p.active * p.monthlyPence)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            {/* Wider screens: a table */}
            <div className="hidden sm:block table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
                    <th scope="col" className="py-3 pr-3 font-bold">Plan</th>
                    <th scope="col" className="py-3 pr-3 font-bold text-right">Price</th>
                    <th scope="col" className="py-3 pr-3 font-bold text-right">Paying</th>
                    <th scope="col" className="py-3 pr-3 font-bold text-right">On trial</th>
                    <th scope="col" className="py-3 font-bold text-right">Monthly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {data.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td className="py-3 pr-3 font-bold text-foreground">{p.name}</td>
                      <td className="py-3 pr-3 text-right text-muted">{formatMoney(p.monthlyPence)}</td>
                      <td className="py-3 pr-3 text-right text-foreground">{p.active}</td>
                      <td className="py-3 pr-3 text-right text-amber-300">{p.trial}</td>
                      <td className="py-3 text-right text-brand font-bold">{formatMoney(p.active * p.monthlyPence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <InlineEmpty>No plans set up.</InlineEmpty>}
        <p className="text-xs text-muted mt-3">Clubs with free access aren&apos;t counted as paying.</p>
      </Card>
    </>
  );
}
