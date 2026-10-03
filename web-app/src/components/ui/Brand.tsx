/**
 * The Boost Huddle mark and a club's badge (its uploaded picture, or its
 * initials in the brand hexagon when it hasn't uploaded one).
 */
import Link from 'next/link';
import { clubInitials } from '@/lib/brand';

export function BoostHuddleMark({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group shrink-0" aria-label="Boost Huddle home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/emblem.png" alt="" width={36} height={36} className="w-9 h-9 transition-transform group-hover:scale-105" />
      {!compact && (
        <span className="font-display text-2xl font-extrabold uppercase italic tracking-wide text-foreground leading-none">
          Boost <span className="text-brand">Huddle</span>
        </span>
      )}
    </Link>
  );
}

export function ClubBadge({ name, badgeUrl, size = 40, className = '' }: { name: string; badgeUrl?: string | null; size?: number; className?: string }) {
  if (badgeUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={badgeUrl}
        alt={`${name} badge`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`object-contain shrink-0 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`hexagon bg-brand text-brand-foreground font-display font-extrabold flex items-center justify-center shrink-0 ${className}`}
    >
      {clubInitials(name)}
    </span>
  );
}
