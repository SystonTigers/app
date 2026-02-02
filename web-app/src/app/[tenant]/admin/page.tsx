import OnboardingChecklist from '@/components/OnboardingChecklist';

interface DashboardPageProps {
    params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { tenant } = await params;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-black uppercase italic text-gray-900 dark:text-white mb-8">
                {tenant} <span className="text-brand not-italic">Console</span>
            </h1>

            <OnboardingChecklist tenantSlug={tenant} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Quick Actions */}
                <div className="bg-white dark:bg-gray-800 p-6 chamfer-lg shadow-sm border border-gray-200 dark:border-gray-700 relative group">
                    <div className="absolute top-0 right-0 p-2 opacity-50 text-6xl font-black text-gray-100 dark:text-gray-900/50 -rotate-12 select-none group-hover:text-brand/10 transition-colors">
                        01
                    </div>
                    <h3 className="font-bold text-lg mb-2 uppercase tracking-tight text-gray-900 dark:text-white">Next Match</h3>
                    <p className="text-gray-500 relative z-10">No upcoming fixtures scheduled.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 chamfer-lg shadow-sm border border-gray-200 dark:border-gray-700 relative group">
                    <div className="absolute top-0 right-0 p-2 opacity-50 text-6xl font-black text-gray-100 dark:text-gray-900/50 -rotate-12 select-none group-hover:text-brand/10 transition-colors">
                        02
                    </div>
                    <h3 className="font-bold text-lg mb-2 uppercase tracking-tight text-gray-900 dark:text-white">Recent Results</h3>
                    <p className="text-gray-500 relative z-10">No recent matches played.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 chamfer-lg shadow-sm border border-gray-200 dark:border-gray-700 relative group">
                    <div className="absolute top-0 right-0 p-2 opacity-50 text-6xl font-black text-gray-100 dark:text-gray-900/50 -rotate-12 select-none group-hover:text-brand/10 transition-colors">
                        03
                    </div>
                    <h3 className="font-bold text-lg mb-2 uppercase tracking-tight text-gray-900 dark:text-white">Squad Status</h3>
                    <p className="text-gray-500 relative z-10">0 Active Players</p>
                </div>
            </div>
        </div>
    );
}
