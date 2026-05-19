import { requirePageAuth } from '../lib/auth';
import HomePageClient from '../components/home-page-client';

export default function HomePage() {
  requirePageAuth();
  return <HomePageClient />;
}
