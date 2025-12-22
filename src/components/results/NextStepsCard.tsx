import { RoutingRecommendation, RoutingStatus } from '@/types/routing';
import { ArrowRight, Upload, Search, CheckCircle2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NextStepsCardProps {
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  humanReviewRequested?: boolean;
  hasMissingEvidence?: boolean;
  onUploadMore?: () => void;
  onTrackClaim?: () => void;
  onRequestHumanReview?: () => void;
}

function getNextStepContent(
  recommendation?: RoutingRecommendation,
  status?: RoutingStatus,
  humanReviewRequested?: boolean,
  hasMissingEvidence?: boolean
) {
  if (hasMissingEvidence || status === 'RETAKE_REQUESTED') {
    return {
      title: 'Additional photos needed',
      description: 'We need a few more photos to complete the assessment.',
      primaryAction: 'Upload requested photos',
      primaryIcon: Upload,
      variant: 'warning' as const,
    };
  }

  if (humanReviewRequested || status === 'NEEDS_HUMAN' || status === 'PENDING_SENIOR') {
    return {
      title: 'Pending human review',
      description: 'An adjuster will verify your claim before repairs are approved.',
      primaryAction: 'Track claim',
      primaryIcon: Search,
      variant: 'info' as const,
    };
  }

  if (recommendation === 'APPROVE' || status === 'READY_FOR_APPROVAL') {
    return {
      title: 'Ready for approval',
      description: 'Your claim has been assessed and is ready for final approval.',
      primaryAction: 'Track claim',
      primaryIcon: CheckCircle2,
      variant: 'success' as const,
    };
  }

  if (recommendation === 'ESCALATE') {
    return {
      title: 'Under review',
      description: 'This claim requires additional review by a senior adjuster.',
      primaryAction: 'Track claim',
      primaryIcon: Search,
      variant: 'warning' as const,
    };
  }

  return {
    title: 'Claim submitted',
    description: 'Your claim is being processed. We\'ll notify you of any updates.',
    primaryAction: 'Track claim',
    primaryIcon: Search,
    variant: 'info' as const,
  };
}

const variantStyles = {
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  info: 'bg-primary/10 border-primary/20',
};

const iconStyles = {
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-primary',
};

export function NextStepsCard({
  recommendation,
  status,
  humanReviewRequested,
  hasMissingEvidence,
  onUploadMore,
  onTrackClaim,
  onRequestHumanReview,
}: NextStepsCardProps) {
  const content = getNextStepContent(recommendation, status, humanReviewRequested, hasMissingEvidence);
  const PrimaryIcon = content.primaryIcon;

  const handlePrimaryClick = () => {
    if (hasMissingEvidence || status === 'RETAKE_REQUESTED') {
      onUploadMore?.();
    } else {
      onTrackClaim?.();
    }
  };

  return (
    <div className={`card-apple p-6 border ${variantStyles[content.variant]}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full bg-card ${iconStyles[content.variant]}`}>
          <PrimaryIcon className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {content.title}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            {content.description}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handlePrimaryClick}
              className="gap-2"
            >
              {content.primaryAction}
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            {!humanReviewRequested && recommendation !== 'ESCALATE' && onRequestHumanReview && (
              <Button
                variant="outline"
                onClick={onRequestHumanReview}
                className="gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Request human review
              </Button>
            )}
            
            {!hasMissingEvidence && onUploadMore && (
              <Button
                variant="ghost"
                onClick={onUploadMore}
                className="gap-2 text-muted-foreground"
              >
                <Upload className="w-4 h-4" />
                Add another photo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
