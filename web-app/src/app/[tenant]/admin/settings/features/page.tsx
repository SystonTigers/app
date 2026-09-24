import { redirect } from 'next/navigation';

/**
 * Auto-post feature switches are not offered in the dashboard: the backend has
 * no endpoint that saves them, so old links go to the settings hub instead.
 */
export default async function FeaturesPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = await params;
    redirect(`/${tenant}/admin/settings`);
}
