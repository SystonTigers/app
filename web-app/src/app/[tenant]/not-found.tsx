'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** A page under a club that doesn't exist (the club itself does: the layout checks that). */
export default function NotFound() {
  const club = usePathname()?.split('/')[1] ?? '';
  return (
    <div className="container py-20 text-center max-w-xl">
      <p className="eyebrow mb-3">Page not found</p>
      <h1 className="text-5xl italic mb-4">Nothing here</h1>
      <p className="text-muted mb-8">That page doesn&apos;t exist or has moved. Everything about the club starts from its home page.</p>
      <Link href={club ? `/${club}` : '/'} className="btn btn-primary">Back to the club page</Link>
    </div>
  );
}
