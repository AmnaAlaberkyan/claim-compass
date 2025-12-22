import { 
  RoutingInput, 
  RoutingResult, 
  RoutingReason, 
  RoutingRecommendation, 
  RoutingStatus 
} from '@/types/routing';

/**
 * Central routing function used everywhere for claim decisions.
 * Returns a structured result with status, recommendation, reasons, and snapshot.
 */
export function routeClaim(input: RoutingInput): RoutingResult {
  const { claim, assessment, estimate, controls } = input;
  const reasons: RoutingReason[] = [];

  // Get relevant values (prefer assessment/estimate over claim fields)
  const confidence = assessment?.overall_confidence ?? claim.confidence_score ?? 100;
  const severity = assessment?.overall_severity ?? claim.severity_score ?? 1;
  const costHigh = estimate?.grandTotalHigh ?? assessment?.total_cost_high ?? claim.cost_high ?? 0;
  const fraudIndicators = assessment?.fraud_indicators ?? claim.fraud_indicators ?? [];
  const safetyConcerns = assessment?.safety_concerns ?? claim.safety_concerns ?? [];

  // Rule 1: Human review requested - always needs human
  if (claim.human_review_requested) {
    reasons.push({
      code: 'HUMAN_REQUESTED',
      message: 'Claimant requested human review.',
    });
  }

  // Rule 2: Low confidence
  if (confidence < controls.confidence_threshold * 100) {
    reasons.push({
      code: 'LOW_CONFIDENCE',
      message: `Confidence ${(confidence / 100).toFixed(2)} < threshold ${controls.confidence_threshold}.`,
    });
  }

  // Rule 3: High severity
  if (severity >= controls.severity_threshold) {
    reasons.push({
      code: 'HIGH_SEVERITY',
      message: `Severity ${severity} >= threshold ${controls.severity_threshold}.`,
    });
  }

  // Rule 4: Payout exceeds senior cap
  if (costHigh > controls.payout_cap_senior) {
    reasons.push({
      code: 'PAYOUT_CAP_SENIOR',
      message: `Estimate high $${costHigh.toLocaleString()} > senior cap $${controls.payout_cap_senior.toLocaleString()}.`,
    });
  } else if (costHigh > controls.payout_cap_auto) {
    reasons.push({
      code: 'PAYOUT_CAP',
      message: `Estimate high $${costHigh.toLocaleString()} > auto cap $${controls.payout_cap_auto.toLocaleString()}.`,
    });
  }

  // Rule 5: Fraud indicators
  if (fraudIndicators.length > 0) {
    reasons.push({
      code: 'FRAUD_INDICATOR',
      message: `Fraud indicators detected: ${fraudIndicators.join(', ')}.`,
    });
  }

  // Rule 6: Safety concerns
  if (safetyConcerns.length > 0) {
    reasons.push({
      code: 'SAFETY_CONCERN',
      message: `Safety concerns: ${safetyConcerns.join(', ')}.`,
    });
  }

  // Rule 7: Quality issues
  if (claim.quality_score !== undefined && claim.quality_score < 70) {
    reasons.push({
      code: 'QUALITY_ISSUES',
      message: `Photo quality score ${claim.quality_score}% is below acceptable threshold.`,
    });
  }

  // Rule 8: Dual review check
  if (controls.dual_review_enabled) {
    reasons.push({
      code: 'DUAL_REVIEW_REQUIRED',
      message: 'Dual review is enabled - requires second reviewer.',
    });
  }

  // Rule 9: QA sample (random selection based on rate)
  if (Math.random() < controls.qa_sample_rate) {
    reasons.push({
      code: 'QA_SAMPLE',
      message: `Selected for QA review (${(controls.qa_sample_rate * 100).toFixed(0)}% sample rate).`,
    });
  }

  // Determine recommendation and status based on reasons
  let recommendation: RoutingRecommendation;
  let status: RoutingStatus;

  const hasEscalatingReasons = reasons.some(r => 
    ['FRAUD_INDICATOR', 'PAYOUT_CAP_SENIOR', 'HIGH_SEVERITY'].includes(r.code)
  );

  const hasReviewReasons = reasons.some(r => 
    ['HUMAN_REQUESTED', 'LOW_CONFIDENCE', 'PAYOUT_CAP', 'SAFETY_CONCERN', 'QUALITY_ISSUES'].includes(r.code)
  );

  const hasDualReview = reasons.some(r => r.code === 'DUAL_REVIEW_REQUIRED');
  const hasQASample = reasons.some(r => r.code === 'QA_SAMPLE');

  if (hasEscalatingReasons) {
    recommendation = 'ESCALATE';
    status = reasons.some(r => r.code === 'PAYOUT_CAP_SENIOR') ? 'PENDING_SENIOR' : 'NEEDS_HUMAN';
  } else if (hasReviewReasons || hasDualReview) {
    recommendation = 'REVIEW';
    if (hasDualReview) {
      status = 'NEEDS_SECOND_REVIEW';
    } else if (reasons.some(r => r.code === 'HUMAN_REQUESTED')) {
      status = 'NEEDS_HUMAN';
    } else {
      status = 'NEEDS_HUMAN';
    }
  } else if (hasQASample) {
    recommendation = 'REVIEW';
    status = 'QA_REVIEW';
  } else {
    // No blocking reasons - can potentially auto-approve
    if (costHigh <= controls.payout_cap_auto && 
        confidence >= controls.confidence_threshold * 100 &&
        severity < controls.severity_threshold) {
      reasons.push({
        code: 'AUTO_APPROVABLE',
        message: `All thresholds passed - eligible for auto-approval.`,
      });
      recommendation = 'APPROVE';
      status = 'READY_FOR_APPROVAL';
    } else {
      recommendation = 'REVIEW';
      status = 'NEEDS_HUMAN';
    }
  }

  return {
    status,
    recommendation,
    reasons,
    rulesSnapshot: { ...controls },
  };
}

/**
 * Get user-friendly label for routing status
 */
export function getStatusLabel(status: RoutingStatus): string {
  const labels: Record<RoutingStatus, string> = {
    'READY_FOR_APPROVAL': 'Ready for Approval',
    'NEEDS_HUMAN': 'Needs Human Review',
    'PENDING_SENIOR': 'Pending Senior Review',
    'RETAKE_REQUESTED': 'Photo Retake Requested',
    'NEEDS_SECOND_REVIEW': 'Needs Second Review',
    'QA_REVIEW': 'QA Review',
  };
  return labels[status] || status;
}

/**
 * Get user-friendly label for routing recommendation
 */
export function getRecommendationLabel(recommendation: RoutingRecommendation): string {
  const labels: Record<RoutingRecommendation, string> = {
    'APPROVE': 'Approve',
    'REVIEW': 'Review',
    'ESCALATE': 'Escalate',
  };
  return labels[recommendation] || recommendation;
}
