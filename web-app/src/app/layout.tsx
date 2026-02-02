import type { Metadata, Viewport } from 'next';
import { Orbitron, Roboto_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/ui/ThemeProvider';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Boost Huddle',
  description: 'The ultimate team management platform',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0D0F', // Obsidian
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${robotoMono.variable} font-mono bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
