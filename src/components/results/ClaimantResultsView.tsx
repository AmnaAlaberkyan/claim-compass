import { DamageAssessment } from '@/types/claims';
import { Estimate } from '@/types/estimates';
import { RoutingReason, RoutingRecommendation, RoutingStatus } from '@/types/routing';
import { NextStepsCard } from './NextStepsCard';
import { ClaimTimeline } from './ClaimTimeline';
import { ClaimantStatsRow } from './ClaimantStatsRow';
import { ClaimantEstimateCard } from './ClaimantEstimateCard';
import { VerificationStatusBadge } from './VerificationStatusBadge';
import { RoutingReasonsCard } from '@/components/RoutingReasons';

interface ClaimantResultsViewProps {
  assessment: DamageAssessment;
  estimate?: Estimate | null;
  routingReasons?: RoutingReason[];
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  humanReviewRequested?: boolean;
  onUploadMore?: () => void;
  onTrackClaim?: () => void;
  onRequestHumanReview?: () => void;
}

export function ClaimantResultsView({
  assessment,
  estimate,
  routingReasons = [],
  recommendation,
  status,
  humanReviewRequested,
  onUploadMore,
  onTrackClaim,
  onRequestHumanReview,
}: ClaimantResultsViewProps) {
  // Determine if missing evidence based on routing reasons
  const hasMissingEvidence = routingReasons.some(
    r => r.code === 'MISSING_EVIDENCE' || r.code === 'QUALITY_ISSUES'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Next Steps Card - TOP */}
      <NextStepsCard
        recommendation={recommendation}
        status={status}
        humanReviewRequested={humanReviewRequested}
        hasMissingEvidence={hasMissingEvidence}
        onUploadMore={onUploadMore}
        onTrackClaim={onTrackClaim}
        onRequestHumanReview={onRequestHumanReview}
      />

      {/* Timeline */}
      <div className="card-apple p-6">
        <ClaimTimeline
          recommendation={recommendation}
          status={status}
          humanReviewRequested={humanReviewRequested}
        />
      </div>

      {/* Routing Reasons - Claimant-friendly bullets */}
      {routingReasons.length > 0 && (
        <RoutingReasonsCard
          reasons={routingReasons}
          recommendation={recommendation}
          status={status}
          variant="claimant"
        />
      )}

      {/* Simplified Stats */}
      <ClaimantStatsRow assessment={assessment} />

      {/* Verification Status Badge */}
      <div className="flex justify-center">
        <VerificationStatusBadge
          recommendation={recommendation}
          status={status}
          humanReviewRequested={humanReviewRequested}
        />
      </div>

      {/* AI Summary */}
      <div className="card-apple p-6">
        <h3 className="font-semibold text-foreground mb-3">Assessment summary</h3>
        <p className="text-muted-foreground leading-relaxed">{assessment.summary}</p>
      </div>

      {/* Estimate - Human-friendly */}
      {estimate && <ClaimantEstimateCard estimate={estimate} />}
    </div>
  );
}
