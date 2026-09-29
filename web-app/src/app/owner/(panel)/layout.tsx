import OwnerShell from '@/components/owner/OwnerShell';

/**
 * The session cookie is only sent to /api/owner, so pages don't check it
 * themselves: the first API call finds out and sends the owner to sign in.
 */
export default function OwnerPanelLayout({ children }: { children: React.ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
