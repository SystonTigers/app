import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';

// Barlow Condensed (SIL Open Font License): the app's display face, same files as mobile/assets/fonts
const display = localFont({
  src: [
    { path: '../fonts/BarlowCondensed-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/BarlowCondensed-ExtraBold.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Boost Huddle',
  description: 'Live scores, fixtures, the league table and match posts for grassroots football clubs.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0D0F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`dark ${display.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
