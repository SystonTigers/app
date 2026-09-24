import { redirect } from 'next/navigation';

/**
 * Passwordless member sign-in is not offered: the backend's magic links
 * (/api/v1/magic/*) are for platform admin onboarding only. Old links to
 * this page land on the normal sign-in screen instead.
 */
export default function MagicLinkPage() {
    redirect('/login');
}
