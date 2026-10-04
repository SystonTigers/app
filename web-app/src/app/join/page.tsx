import { redirect } from 'next/navigation';

/**
 * Joining a club now happens in the club app (sign up inside the club, then
 * parents enter the manager's code). Old links land on the explanation.
 */
export default function JoinPage() {
  redirect('/signup');
}
