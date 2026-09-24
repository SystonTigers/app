import { redirect } from 'next/navigation';

/**
 * Member magic-link verification is not offered (see ../page.tsx). Admin
 * onboarding links are verified at /admin/onboard.
 */
export default function MagicLinkVerifyPage() {
    redirect('/login');
}
