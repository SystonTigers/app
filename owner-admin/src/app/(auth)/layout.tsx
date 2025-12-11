import '../globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login | Owner Admin',
    description: 'Sign in to the platform administration dashboard',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth pages have no sidebar/header - full screen
    return (
        <html lang="en" className="dark">
            <body>{children}</body>
        </html>
    );
}
