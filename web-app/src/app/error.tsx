'use client';

/** Shown when a page fails to load. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-3">Something went wrong</p>
        <h1 className="text-4xl italic mb-4">That page didn&apos;t load</h1>
        <p className="text-muted mb-8">Please try again in a moment. If it keeps happening, let the club know.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <a href="/" className="btn btn-secondary">Go home</a>
        </div>
        {error?.digest && <p className="mt-6 text-xs text-gray-500">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
