import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Owner panel · Boost Huddle',
  robots: { index: false, follow: false },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
