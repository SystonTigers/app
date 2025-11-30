import Link from 'next/link';
import { ThemeProvider } from '@/components/ThemeProvider';

interface TenantAdminLayoutProps {
    children: React.ReactNode;
    params: Promise<{ tenant: string }>;
}

export default async function TenantAdminLayout({ children, params }: TenantAdminLayoutProps) {
    const { tenant } = await params;
    const tenantName = tenant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <ThemeProvider tenant={tenant}>
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
                {/* Tenant Admin Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 shadow-sm">
                    <nav className="container mx-auto px-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <Link href={`/${tenant}/admin`} className="text-xl font-bold text-gray-900 dark:text-white no-underline flex items-center gap-2">
                                    <span className="bg-brand text-white px-2 py-0.5 rounded text-sm">MANAGER</span>
                                    <span>{tenantName}</span>
                                </Link>

                                <div className="hidden md:flex gap-6 text-sm font-medium">
                                    <Link href={`/${tenant}/admin`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Dashboard
                                    </Link>
                                    <Link href={`/${tenant}/admin/squad`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Squad
                                    </Link>
                                    <Link href={`/${tenant}/admin/calendar`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Calendar
                                    </Link>
                                    <Link href={`/${tenant}/admin/fixtures`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Fixtures
                                    </Link>
                                    <Link href={`/${tenant}/admin/results`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Results
                                    </Link>
                                    <Link href={`/${tenant}/admin/feed`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        News
                                    </Link>
                                    <Link href={`/${tenant}/admin/videos`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Videos
                                    </Link>
                                    <Link href={`/${tenant}/admin/table`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Table
                                    </Link>
                                    <Link href={`/${tenant}/admin/settings`} className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Settings
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <Link href={`/${tenant}`} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                    View Public Site &rarr;
                                </Link>
                            </div>
                        </div>
                    </nav>
                </header>

                {/* Main content */}
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </ThemeProvider>
    );
}
