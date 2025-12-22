import { Bot, UserCheck, Clock } from 'lucide-react';
import { RoutingRecommendation, RoutingStatus } from '@/types/routing';

interface VerificationStatusBadgeProps {
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  humanReviewRequested?: boolean;
}

export function VerificationStatusBadge({
  recommendation,
  status,
  humanReviewRequested,
}: VerificationStatusBadgeProps) {
  const needsHumanReview =
    humanReviewRequested ||
    recommendation === 'REVIEW' ||
    recommendation === 'ESCALATE' ||
    status === 'NEEDS_HUMAN' ||
    status === 'PENDING_SENIOR' ||
    status === 'NEEDS_SECOND_REVIEW' ||
    status === 'QA_REVIEW';

  if (needsHumanReview) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning border border-warning/20">
        <UserCheck className="w-4 h-4" />
        <span className="text-sm font-medium">Waiting for human verification</span>
      </div>
    );
  }

  if (recommendation === 'APPROVE' || status === 'READY_FOR_APPROVAL') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success border border-success/20">
        <Bot className="w-4 h-4" />
        <span className="text-sm font-medium">AI review completed</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground border border-border">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-medium">Processing</span>
    </div>
  );
}
