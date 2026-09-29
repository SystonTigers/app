import { redirect } from 'next/navigation';

/**
 * The old owner console lived here. Platform owners now use /owner; club
 * staff manage their club at /<club>/admin.
 */
export default function OldAdminPage() {
  redirect('/owner');
}
