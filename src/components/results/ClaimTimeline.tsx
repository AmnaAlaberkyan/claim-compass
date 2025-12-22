import { Check, Circle } from 'lucide-react';
import { RoutingRecommendation, RoutingStatus } from '@/types/routing';

interface TimelineStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface ClaimTimelineProps {
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  humanReviewRequested?: boolean;
}

function getTimelineSteps(
  recommendation?: RoutingRecommendation,
  status?: RoutingStatus,
  humanReviewRequested?: boolean
): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: 'submitted', label: 'Submitted', completed: true, current: false },
    { key: 'ai_review', label: 'AI review', completed: true, current: false },
  ];

  // Determine if human review is needed
  const needsHumanReview = 
    humanReviewRequested ||
    recommendation === 'REVIEW' ||
    recommendation === 'ESCALATE' ||
    status === 'NEEDS_HUMAN' ||
    status === 'PENDING_SENIOR' ||
    status === 'NEEDS_SECOND_REVIEW' ||
    status === 'QA_REVIEW';

  if (needsHumanReview) {
    const humanReviewComplete = recommendation === 'APPROVE' && !humanReviewRequested;
    steps.push({
      key: 'human_review',
      label: 'Human review',
      completed: humanReviewComplete,
      current: !humanReviewComplete,
    });
  }

  const isApproved = recommendation === 'APPROVE' && !needsHumanReview;
  steps.push({
    key: 'approved',
    label: 'Approved',
    completed: isApproved,
    current: false,
  });

  return steps;
}

export function ClaimTimeline({
  recommendation,
  status,
  humanReviewRequested,
}: ClaimTimelineProps) {
  const steps = getTimelineSteps(recommendation, status, humanReviewRequested);

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, idx) => (
        <div key={step.key} className="flex items-center flex-1 last:flex-initial">
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                step.completed
                  ? 'bg-success text-success-foreground'
                  : step.current
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.completed ? (
                <Check className="w-4 h-4" />
              ) : (
                <Circle className={`w-3 h-3 ${step.current ? 'fill-current' : ''}`} />
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium whitespace-nowrap ${
                step.completed || step.current
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
          
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${
                step.completed ? 'bg-success' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
