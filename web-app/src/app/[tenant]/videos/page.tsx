import { VideoEditor } from '@/components/VideoEditor';

export default async function VideosPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = await params;

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>Video Analysis</h1>
            <VideoEditor tenant={tenant} />
        </div>
    );
}
