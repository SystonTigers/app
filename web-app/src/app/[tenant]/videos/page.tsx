
import { VideoEditor } from '@/components/VideoEditor';

export default async function VideosPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = await params;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-12 px-6">
                <div className="container">
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Video Analysis</h1>
                    <p className="text-gray-500">Match footage, highlights, and AI-powered coaching tools.</p>
                </div>
            </div>

            <div className="container px-6 py-12">
                <VideoEditor tenant={tenant} />
            </div>
        </div>
    );
}
