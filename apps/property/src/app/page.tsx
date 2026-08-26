import { redirect } from 'next/navigation';

// Root path has no content — middleware redirects unauthenticated users to
// /login, and authenticated users should land on /dashboard.
export default function RootPage(): never {
  redirect('/dashboard');
}
