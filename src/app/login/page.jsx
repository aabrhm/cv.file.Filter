import { redirect } from 'next/navigation';
import LoginPageClient from '../../components/login-page-client';
import { getPageSession } from '../../lib/auth';

export default function LoginPage() {
  const session = getPageSession();
  if (session) {
    redirect('/');
  }

  return <LoginPageClient />;
}
