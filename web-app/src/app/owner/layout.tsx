import type { Metadata, Viewport } from 'next';
import OwnerAppSetup from '@/components/owner/OwnerAppSetup';

export const metadata: Metadata = {
  title: 'Owner panel · Boost Huddle',
  robots: { index: false, follow: false },
  // Installable as its own app ("Add to Home Screen" / "Install app")
  manifest: '/owner/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'BH Owner', statusBarStyle: 'black' },
  icons: { icon: '/owner/icon-192.png', apple: '/owner/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#0B0D0F',
  width: 'device-width',
  initialScale: 1,
  // The installed app draws under the phone's home bar; the shell pads by the safe area
  viewportFit: 'cover',
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OwnerAppSetup />
      {children}
    </>
  );
}
