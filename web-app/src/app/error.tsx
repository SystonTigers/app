'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <main className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">Please try again in a moment.</p>
          <pre className="text-xs opacity-60">{error?.digest ?? ''}</pre>
          <a className="underline" href="/">Go home</a>
        </main>
      </body>
    </html>
  );
}
