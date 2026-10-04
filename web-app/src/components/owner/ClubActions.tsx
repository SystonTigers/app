'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ownerApi } from '@/lib/owner/client';
import type { OwnerAction, OwnerClubDetail } from '@/lib/owner/types';
import { Card, CardTitle } from './ui';

const BTN = 'btn btn-sm min-h-10';

/** What the owner can change on a club. Suspending asks twice. */
export default function ClubActions({ club, onChanged }: { club: OwnerClubDetail; onChanged: (club: OwnerClubDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const run = async (action: OwnerAction) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await ownerApi.act(club.id, action);
      onChanged(res.club);
      setMessage(`${res.detail}.`);
      setConfirmSuspend(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const suspended = club.status === 'suspended';

  return (
    <Card>
      <CardTitle icon="edit">Change this club</CardTitle>
      <div className="divide-y divide-border">
        <Row label="Trial" help={suspended ? 'Reactivate the club first.' : 'Adds days from today, or from the current end date if that is later.'}>
          {[7, 14, 30].map((d) => (
            <button key={d} type="button" disabled={busy || suspended} onClick={() => run({ action: 'extend_trial', days: d })} className={`${BTN} btn-secondary`}>
              +{d} days
            </button>
          ))}
        </Row>

        <Row label="Plan" help="What the club will pay once card payments are on.">
          {(['starter', 'pro'] as const).map((p) => {
            const current = club.plan === p;
            return (
              <button
                key={p}
                type="button"
                disabled={busy || current}
                onClick={() => run({ action: 'set_plan', plan: p })}
                aria-pressed={current}
                className={`${BTN} ${current ? 'btn-primary disabled:opacity-100 disabled:cursor-default' : 'btn-secondary'}`}
              >
                {current ? <Icon name="check" className="w-4 h-4" /> : null}
                {p === 'pro' ? 'Pro' : 'Starter'}
              </button>
            );
          })}
        </Row>

        <Row label="Free access" help={club.comped ? 'This club uses Boost Huddle for free.' : 'For partner or friendly clubs: no trial end, never charged.'}>
          <button type="button" disabled={busy} onClick={() => run({ action: 'comp', on: !club.comped })} className={`${BTN} btn-secondary`}>
            {club.comped ? 'Remove free access' : 'Give free access'}
          </button>
        </Row>

        {club.premiumPacks.length ? (
          <Row
            label="Premium graphics"
            help={club.planPacks.length ? 'Included with the Pro plan. Moving the club to Starter takes them away again.' : "Unlocks the pack in the club's graphics settings."}
          >
            {club.premiumPacks.map((p) => {
              if (club.planPacks.includes(p.id)) {
                return (
                  <span key={p.id} className="inline-flex items-center gap-2 px-4 min-h-10 border border-brand/40 bg-brand/10 text-brand font-bold uppercase tracking-wider text-xs chamfer-sm">
                    <Icon name="check" className="w-4 h-4" />
                    {p.name} included with Pro
                  </span>
                );
              }
              const on = club.unlockedPacks.includes(p.id);
              return (
                <button key={p.id} type="button" disabled={busy} onClick={() => run({ action: 'graphics', pack: p.id, on: !on })} className={`${BTN} btn-secondary`}>
                  <Icon name={on ? 'lock' : 'sparkles'} className="w-4 h-4" />
                  {on ? `Lock ${p.name}` : `Unlock ${p.name}`}
                </button>
              );
            })}
          </Row>
        ) : null}

        <Row label="Access" help={suspended ? "Everyone at the club is logged out and can't log in until you reactivate it." : 'Suspending logs everyone at the club out straight away.'}>
          {suspended ? (
            <button type="button" disabled={busy} onClick={() => run({ action: 'reactivate' })} className={`${BTN} btn-primary`}>
              <Icon name="refresh" className="w-4 h-4" />
              Reactivate club
            </button>
          ) : confirmSuspend ? (
            <>
              <button type="button" disabled={busy} onClick={() => run({ action: 'suspend' })} className={`${BTN} max-w-full whitespace-normal bg-red-600 border-red-600 text-white hover:bg-red-500`}>
                <Icon name="alert" className="w-4 h-4" />
                Yes, suspend {club.name}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmSuspend(false)} className={`${BTN} btn-secondary`}>Keep it running</button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmSuspend(true)} className={`${BTN} btn-danger`}>
              <Icon name="lock" className="w-4 h-4" />
              Suspend club
            </button>
          )}
        </Row>
      </div>

      {message ? (
        <p role="status" className="mt-4 flex items-center gap-2 p-3 text-sm text-brand bg-brand/10 border border-brand/40 chamfer-sm">
          <Icon name="check" className="w-4 h-4 shrink-0" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 p-3 text-sm text-red-300 bg-red-500/10 border border-red-500/50 chamfer-sm">
          <Icon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function Row({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[10rem_1fr] gap-2 sm:gap-4 items-start py-4 first:pt-0 last:pb-0">
      <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground sm:pt-2">{label}</h3>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">{children}</div>
        <p className="text-xs text-muted mt-2">{help}</p>
      </div>
    </div>
  );
}
