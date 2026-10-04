import Link from 'next/link';
import { BoostHuddleMark } from '@/components/ui/Brand';
import { APP_URL } from '@/lib/app-link';

const LEGAL_BASE = 'https://boosthuddle-legal.pages.dev';

/**
 * Header for the Boost Huddle marketing pages (home, pricing). On phones it
 * keeps just the mark, Log in and the trial button so nothing wraps.
 */
export function SiteHeader() {
  return (
    <header className="container py-4 sm:py-6 flex items-center justify-between gap-3">
      <span className="sm:hidden"><BoostHuddleMark compact /></span>
      <span className="hidden sm:inline-flex"><BoostHuddleMark /></span>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2 text-sm font-bold">
        <a href={APP_URL} className="hidden md:inline-flex items-center min-h-[40px] px-3 text-muted hover:text-foreground">Open the app</a>
        <Link href="/pricing" className="hidden sm:inline-flex items-center min-h-[40px] px-3 text-muted hover:text-foreground">Pricing</Link>
        <Link href="/login" className="inline-flex items-center min-h-[40px] px-3 text-muted hover:text-foreground whitespace-nowrap">Log in</Link>
        <Link href="/create-team" className="btn btn-primary btn-sm whitespace-nowrap min-h-[40px]">Start free trial</Link>
      </nav>
    </header>
  );
}

/** Footer for the marketing pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <nav aria-label="Footer" className="container flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
        <Link href="/pricing" className="py-2 hover:text-foreground">Pricing</Link>
        <a href={APP_URL} className="py-2 hover:text-foreground">Open the app</a>
        <Link href="/login" className="py-2 hover:text-foreground">Log in</Link>
        <a href={`${LEGAL_BASE}/terms`} className="py-2 hover:text-foreground">Terms</a>
        <a href={`${LEGAL_BASE}/privacy`} className="py-2 hover:text-foreground">Privacy</a>
      </nav>
      <p className="mt-2 text-center text-xs text-muted">&copy; {new Date().getFullYear()} Boost Huddle</p>
    </footer>
  );
}
