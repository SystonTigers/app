import OnboardingChecklist from '@/components/OnboardingChecklist';

interface DashboardPageProps {
    params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { tenant } = await params;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>

            <OnboardingChecklist tenantSlug={tenant} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Quick Actions */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg mb-2">Next Match</h3>
                    <p className="text-gray-500">No upcoming fixtures scheduled.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg mb-2">Recent Results</h3>
                    <p className="text-gray-500">No recent matches played.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg mb-2">Squad Status</h3>
                    <p className="text-gray-500">0 Active Players</p>
                </div>
            </div>
        </div>
    );
}
