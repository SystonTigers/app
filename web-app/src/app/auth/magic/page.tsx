import { redirect } from 'next/navigation';

/**
 * Passwordless sign-in is not offered. Old links to this page land on the
 * normal sign-in screen instead.
 */
export default function MagicLinkPage() {
    redirect('/login');
}
