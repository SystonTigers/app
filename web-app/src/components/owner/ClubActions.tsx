'use client';

import { useState } from 'react';
import { ownerApi } from '@/lib/owner/client';
import type { OwnerAction, OwnerClubDetail } from '@/lib/owner/types';
import { Card, CardTitle, buttonClass, ghostButtonClass } from './ui';

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
      setError(err instanceof Error ? err.message : 'That didn\'t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const suspended = club.status === 'suspended';

  return (
    <Card>
      <CardTitle>Change this club</CardTitle>
      <div className="space-y-5">
        <Row label="Trial" help={suspended ? 'Reactivate the club first.' : 'Adds days from today, or from the current end date if later.'}>
          {[7, 14, 30].map((d) => (
            <button key={d} type="button" disabled={busy || suspended} onClick={() => run({ action: 'extend_trial', days: d })} className={ghostButtonClass}>+{d} days</button>
          ))}
        </Row>

        <Row label="Plan" help="What the club will pay once card payments are on.">
          {(['starter', 'pro'] as const).map((p) => (
            <button key={p} type="button" disabled={busy || club.plan === p} onClick={() => run({ action: 'set_plan', plan: p })}
              aria-pressed={club.plan === p}
              className={club.plan === p ? `${buttonClass} !opacity-100` : ghostButtonClass}>
              {p === 'pro' ? 'Pro' : 'Starter'}
            </button>
          ))}
        </Row>

        <Row label="Free access" help={club.comped ? 'This club uses Boost Huddle for free.' : 'For partner or friendly clubs: no trial end, never charged.'}>
          <button type="button" disabled={busy} onClick={() => run({ action: 'comp', on: !club.comped })} className={ghostButtonClass}>
            {club.comped ? 'Remove free access' : 'Give free access'}
          </button>
        </Row>

        {club.premiumPacks.length ? (
          <Row label="Premium graphics" help="Unlocks the pack in the club's graphics settings.">
            {club.premiumPacks.map((p) => {
              const on = club.unlockedPacks.includes(p.id);
              return (
                <button key={p.id} type="button" disabled={busy} onClick={() => run({ action: 'graphics', pack: p.id, on: !on })} className={ghostButtonClass}>
                  {on ? `Lock ${p.name}` : `Unlock ${p.name}`}
                </button>
              );
            })}
          </Row>
        ) : null}

        <Row label="Access" help={suspended ? 'Everyone at the club is signed out and can\'t sign in.' : 'Suspending signs everyone at the club out straight away.'}>
          {suspended ? (
            <button type="button" disabled={busy} onClick={() => run({ action: 'reactivate' })} className={buttonClass}>Reactivate club</button>
          ) : confirmSuspend ? (
            <>
              <button type="button" disabled={busy} onClick={() => run({ action: 'suspend' })}
                className="px-4 py-2.5 bg-red-600 text-white font-black uppercase tracking-wider text-sm chamfer-sm hover:bg-red-500 disabled:opacity-50">
                Yes, suspend {club.name}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmSuspend(false)} className={ghostButtonClass}>Keep it running</button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmSuspend(true)}
              className="px-4 py-2.5 border border-red-500/60 text-red-300 font-bold uppercase tracking-wider text-xs chamfer-sm hover:bg-red-500/10 disabled:opacity-50">
              Suspend club
            </button>
          )}
        </Row>

        {message ? <p role="status" className="text-sm text-brand">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      </div>
    </Card>
  );
}

function Row({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[10rem_1fr] gap-2 sm:gap-4 items-start">
      <div>
        <div className="text-sm font-bold text-white">{label}</div>
      </div>
      <div>
        <div className="flex flex-wrap gap-2">{children}</div>
        <p className="text-xs text-gray-500 mt-1.5">{help}</p>
      </div>
    </div>
  );
}
