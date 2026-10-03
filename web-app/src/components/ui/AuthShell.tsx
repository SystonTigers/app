/**
 * The look shared by every sign-in style page (log in, create account,
 * forgotten password, welcome): dark hex background, the Boost Huddle or club
 * mark, a heading and one chamfered card.
 */
import type { ReactNode } from 'react';
import { BoostHuddleMark } from './Brand';

export function AuthShell({ title, subtitle, mark, children, footer }: { title: ReactNode; subtitle?: ReactNode; mark?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-[url('/assets/hero-bg.jpg')] bg-cover bg-center relative px-4 py-12">
      <div className="absolute inset-0 bg-background/80" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">{mark ?? <BoostHuddleMark />}</div>
          <h1 className="text-4xl sm:text-5xl italic text-foreground">{title}</h1>
          {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
        </div>
        <div className="card p-6 sm:p-8 bg-surface/95">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted space-y-2">{footer}</div>}
      </div>
    </div>
  );
}

/** A labelled text field in the sign-in style. */
export function AuthField({ id, label, hint, ...input }: { id: string; label: string; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="field chamfer-sm" {...input} />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="p-3 border border-red-500/50 bg-red-500/10 text-red-300 text-sm chamfer-sm">
      {children}
    </div>
  );
}
