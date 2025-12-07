import { redirect } from 'next/navigation';

export default async function TeamPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = await params;

    // Redirect to discussions (default tab)
    redirect(`/${tenant}/team/discussions`);
}
