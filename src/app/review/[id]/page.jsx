import { requirePageAuth } from '../../../lib/auth';
import ReviewPageClient from '../../../components/review-page-client';

export default function ReviewPage() {
  requirePageAuth();
  return <ReviewPageClient />;
}
