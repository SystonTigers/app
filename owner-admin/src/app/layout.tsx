import './globals.css';

// Root layout is minimal - each route group has its own layout
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
