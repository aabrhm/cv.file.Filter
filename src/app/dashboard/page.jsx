import { requirePageAuth } from '../../lib/auth';
import DashboardPageClient from '../../components/dashboard-page-client';

export default function DashboardPage() {
  requirePageAuth();
  return <DashboardPageClient />;
}
