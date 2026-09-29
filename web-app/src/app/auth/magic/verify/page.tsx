import { redirect } from 'next/navigation';

/**
 * Magic-link sign-in is not offered (see ../page.tsx).
 */
export default function MagicLinkVerifyPage() {
    redirect('/login');
}
