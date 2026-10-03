import Link from 'next/link';

/** Shown for any address that doesn't exist, including a club name nobody has signed up with. */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-background hex-grid">
      <div className="max-w-md w-full text-center">
        <p className="eyebrow mb-3">Page not found</p>
        <h1 className="text-5xl md:text-6xl italic mb-4">We can&apos;t find that club</h1>
        <p className="text-muted mb-8">
          Check the web address, or ask the club for their link. If you run a club, you can set up its own page in a couple of minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn btn-primary">Go to Boost Huddle</Link>
          <Link href="/create-team" className="btn btn-secondary">Set up a club</Link>
        </div>
      </div>
    </main>
  );
}
