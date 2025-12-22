// Standardized audit event types for KPI tracking

export const AUDIT_EVENT_TYPES = {
  // Intake
  INTAKE_STARTED: 'intake_started',
  CLAIM_CREATED: 'claim_created',
  
  // Photo & Analysis
  PHOTO_UPLOADED: 'photo_uploaded',
  QUALITY_ASSESSMENT_COMPLETED: 'quality_assessment_completed',
  DAMAGE_ASSESSMENT_COMPLETED: 'damage_assessment_completed',
  LOCALIZATION_COMPLETED: 'localization_completed',
  
  // Routing & Review
  ROUTING_DECISION: 'routing_decision',
  HUMAN_REVIEW_REQUESTED: 'human_review_requested',
  INTAKE_PREFERENCE_SET: 'intake_preference_set',
  
  // Part Verification
  PART_VERIFIED: 'part_verified',
  PART_REJECTED: 'part_rejected',
  PART_EDITED: 'part_edited',
  
  // Annotation Verification
  BOX_VERIFIED: 'box_verified',
  BOX_REJECTED: 'box_rejected',
  BOX_EDITED: 'box_edited',
  BOX_MARKED_UNCERTAIN: 'box_marked_uncertain',
  ANNOTATION_EDITED: 'annotation_edited',
  ANNOTATIONS_MARKED_UNCERTAIN: 'annotations_marked_uncertain',
  EVIDENCE_LINKED: 'evidence_linked',
  
  // Estimates
  ESTIMATE_CREATED: 'estimate_created',
  ESTIMATE_EDITED: 'estimate_edited',
  
  // Decisions
  CLAIM_APPROVED: 'claim_approved',
  CLAIM_ESCALATED: 'claim_escalated',
  CLAIM_REVIEW: 'claim_review',
  
  // Retakes
  RETAKE_REQUESTED: 'retake_requested',
  RETAKE_UPLOADED: 'retake_uploaded',
  
  // QA
  QA_SAMPLED: 'qa_sampled',
  QA_COMPLETED: 'qa_completed',
} as const;

export type AuditEventType = typeof AUDIT_EVENT_TYPES[keyof typeof AUDIT_EVENT_TYPES];

export type ActorType = 'human' | 'ai_quality' | 'ai_damage' | 'ai_triage' | 'system';

export interface AuditEvent {
  id: string;
  claim_id: string;
  action: AuditEventType;
  actor: string;
  actor_type: ActorType;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Helper to create standardized audit event details
export function createAuditDetails<T extends Record<string, unknown>>(details: T): string {
  return JSON.stringify(details);
}

// KPI computation types
export interface KPIMetrics {
  medianUploadToAssessment: number | null; // seconds
  medianUploadToFirstHuman: number | null; // seconds
  medianFirstHumanToApproval: number | null; // seconds
  retakePercentage: number;
  qaPercentage: number;
  qaPassRate: number;
  queueAgingNeedsHuman: number; // claims >24h
  queueAgingQAReview: number; // claims >24h
  totalClaims: number;
  totalApproved: number;
  totalEscalated: number;
  totalPending: number;
}

export type TimeframeFilter = '24h' | '7d' | 'all';

export function getTimeframeCutoff(timeframe: TimeframeFilter): Date | null {
  const now = new Date();
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
  }
}
