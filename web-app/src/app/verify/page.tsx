import { redirect } from 'next/navigation';

/**
 * Links from the old club-less website sign-up. Accounts are now made in the
 * club app, so these land on the page that explains how to join.
 */
export default function VerifyPage() {
  redirect('/signup');
}
