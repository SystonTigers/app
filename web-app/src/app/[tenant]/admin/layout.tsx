import { AdminGuard } from '@/components/AdminGuard';
import { TrialExpiryBanner } from '@/components/TrialExpiryBanner';
import { AdminNav } from '@/components/admin/AdminNav';

interface TenantAdminLayoutProps {
    children: React.ReactNode;
    params: Promise<{ tenant: string }>;
}

/**
 * Club admin: staff only (AdminGuard). The club nav above comes from the club
 * layout; this adds the admin label and the admin page links.
 */
export default async function TenantAdminLayout({ children, params }: TenantAdminLayoutProps) {
    const { tenant } = await params;

    return (
        <AdminGuard>
            <div className="min-h-screen flex flex-col bg-background">
                <TrialExpiryBanner />
                <div className="bg-surface border-b border-border">
                    <div className="container">
                        <div className="flex items-center gap-3 pt-3">
                            <span className="inline-block bg-brand text-brand-foreground font-display text-[11px] font-extrabold uppercase tracking-[0.18em] px-2 py-0.5 chamfer-sm">
                                Club admin
                            </span>
                            <span className="text-xs text-muted truncate">Only staff see these pages</span>
                        </div>
                        <AdminNav tenant={tenant} />
                    </div>
                </div>

                <main className="flex-1">{children}</main>
            </div>
        </AdminGuard>
    );
}
