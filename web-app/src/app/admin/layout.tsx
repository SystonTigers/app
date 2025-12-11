import Link from 'next/link';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider tenant="default">
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
                {/* Admin Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 shadow-sm">
                    <nav className="container mx-auto px-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <Link href="/admin" className="text-xl font-bold text-gray-900 dark:text-white no-underline flex items-center gap-2">
                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm">TEAM</span>
                                    <span>Admin</span>
                                </Link>

                                <div className="hidden md:flex gap-6 text-sm font-medium">
                                    <Link href="/admin" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Dashboard
                                    </Link>
                                    <Link href="/admin/squad" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Squad
                                    </Link>
                                    <Link href="/admin/calendar" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Calendar
                                    </Link>
                                    <Link href="/admin/fixtures" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Fixtures
                                    </Link>
                                    <Link href="/admin/results" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Results
                                    </Link>
                                    <Link href="/admin/feed" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        News
                                    </Link>
                                    <Link href="/admin/videos" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Videos
                                    </Link>
                                    <Link href="/admin/table" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Table
                                    </Link>
                                    <Link href="/admin/push" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Push
                                    </Link>
                                    <Link href="/admin/settings" className="text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                                        Settings
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                    Exit to Site &rarr;
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
