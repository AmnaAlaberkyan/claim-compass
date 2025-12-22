// Routing service types

export type RoutingRecommendation = 'APPROVE' | 'REVIEW' | 'ESCALATE';

export type RoutingStatus = 
  | 'READY_FOR_APPROVAL'
  | 'NEEDS_HUMAN'
  | 'PENDING_SENIOR'
  | 'RETAKE_REQUESTED'
  | 'NEEDS_SECOND_REVIEW'
  | 'QA_REVIEW';

export type RoutingReasonCode =
  | 'HUMAN_REQUESTED'
  | 'LOW_CONFIDENCE'
  | 'HIGH_SEVERITY'
  | 'MISSING_EVIDENCE'
  | 'PAYOUT_CAP'
  | 'PAYOUT_CAP_SENIOR'
  | 'AUTO_APPROVABLE'
  | 'DUAL_REVIEW_REQUIRED'
  | 'QA_SAMPLE'
  | 'FRAUD_INDICATOR'
  | 'SAFETY_CONCERN'
  | 'QUALITY_ISSUES';

export interface RoutingReason {
  code: RoutingReasonCode;
  message: string;
}

export interface RoutingControls {
  confidence_threshold: number;
  severity_threshold: number;
  payout_cap_senior: number;
  payout_cap_auto: number;
  dual_review_enabled: boolean;
  qa_sample_rate: number;
}

export interface RoutingInput {
  claim: {
    id: string;
    human_review_requested: boolean;
    confidence_score?: number;
    severity_score?: number;
    cost_high?: number;
    fraud_indicators?: string[];
    safety_concerns?: string[];
    quality_score?: number;
  };
  assessment?: {
    overall_confidence: number;
    overall_severity: number;
    total_cost_high: number;
    fraud_indicators?: string[];
    safety_concerns?: string[];
  };
  estimate?: {
    grandTotalHigh: number;
  };
  controls: RoutingControls;
}

export interface RoutingResult {
  status: RoutingStatus;
  recommendation: RoutingRecommendation;
  reasons: RoutingReason[];
  rulesSnapshot: RoutingControls;
}

// Default controls used when database values are not available
export const DEFAULT_CONTROLS: RoutingControls = {
  confidence_threshold: 0.75,
  severity_threshold: 7,
  payout_cap_senior: 3000,
  payout_cap_auto: 1500,
  dual_review_enabled: false,
  qa_sample_rate: 0.1,
};
