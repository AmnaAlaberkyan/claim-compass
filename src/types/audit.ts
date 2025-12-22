// Comprehensive audit event types for full claim lifecycle tracking

export const AUDIT_EVENT_TYPES = {
  // Claim lifecycle
  CLAIM_CREATED: 'claim_created',
  CLAIM_UPDATED: 'claim_updated',
  CLAIM_SUBMITTED: 'claim_submitted',
  CLAIM_STATUS_CHANGED: 'claim_status_changed',

  // Photo lifecycle
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_DELETED: 'photo_deleted',
  PHOTO_QUALITY_SCORED: 'photo_quality_scored',
  RETAKE_REQUESTED: 'retake_requested',
  RETAKE_UPLOADED: 'retake_uploaded',

  // AI pipeline
  AI_QUALITY_COMPLETE: 'ai_quality_complete',
  AI_DAMAGE_COMPLETE: 'ai_damage_complete',
  AI_LOCALIZATION_COMPLETE: 'ai_localization_complete',
  AI_TRIAGE_COMPLETE: 'ai_triage_complete',

  // Routing
  ROUTING_DECISION: 'routing_decision',

  // Human review
  HUMAN_REVIEW_REQUESTED: 'human_review_requested',
  HUMAN_REVIEW_CLEARED: 'human_review_cleared',
  INTAKE_PREFERENCE_SET: 'intake_preference_set',

  // Part verification
  PART_VERIFIED: 'part_verified',
  PART_REJECTED: 'part_rejected',
  PART_EDITED: 'part_edited',
  EVIDENCE_LINKED: 'evidence_linked',

  // Box/annotation verification
  BOX_ADDED: 'box_added',
  BOX_EDITED: 'box_edited',
  BOX_DELETED: 'box_deleted',
  BOX_VERIFIED: 'box_verified',
  BOX_REJECTED: 'box_rejected',
  BOX_MARKED_UNCERTAIN: 'box_marked_uncertain',

  // Estimating
  ESTIMATE_CREATED: 'estimate_created',
  ESTIMATE_LINEITEM_ACCEPTED: 'estimate_lineitem_accepted',
  ESTIMATE_LINEITEM_REJECTED: 'estimate_lineitem_rejected',
  ESTIMATE_LINEITEM_EDITED: 'estimate_lineitem_edited',
  ESTIMATE_SOURCE_SELECTED: 'estimate_source_selected',

  // Decisions
  ADJUSTER_APPROVE: 'adjuster_approve',
  ADJUSTER_REVIEW: 'adjuster_review',
  ADJUSTER_ESCALATE: 'adjuster_escalate',
  SENIOR_APPROVE: 'senior_approve',
  MANAGER_OVERRIDE: 'manager_override',

  // QA
  QA_SAMPLED: 'qa_sampled',
  QA_STARTED: 'qa_started',
  QA_COMPLETED: 'qa_completed',
  QA_FAILED_REROUTED: 'qa_failed_rerouted',

  // Admin
  CONTROLS_UPDATED: 'controls_updated',
  MODEL_UPDATE_REVIEW_OPENED: 'model_update_review_opened',
  MODEL_UPDATE_APPROVED: 'model_update_approved',
  MODEL_UPDATE_DENIED: 'model_update_denied',

  // Export
  AUDIT_EXPORTED: 'audit_exported',
} as const;

export type AuditEventType = typeof AUDIT_EVENT_TYPES[keyof typeof AUDIT_EVENT_TYPES];

export type ActorType = 
  | 'claimant' 
  | 'system' 
  | 'ai_quality' 
  | 'ai_damage' 
  | 'ai_localization' 
  | 'ai_triage'
  | 'adjuster' 
  | 'qa_reviewer' 
  | 'senior_adjuster' 
  | 'manager';

export interface AuditEventModel {
  provider: string | null;
  name: string | null;
  version: string | null;
}

export interface AuditEventInputsRef {
  photo_ids?: string[];
  claim_fields?: string[];
}

export interface AuditEventMetrics {
  confidence?: number;
  severity?: number;
  estimate_low?: number;
  estimate_high?: number;
  quality_score?: number;
  duration_ms?: number;
}

export interface AuditEventDecision {
  action?: string;
  status_before?: string;
  status_after?: string;
  reason_code?: string | null;
  reasons?: Array<{ code: string; message: string }>;
}

export interface AuditEventSnapshots {
  before_json?: object | null;
  after_json?: object | null;
}

export interface AuditEventIntegrity {
  prev_event_hash?: string | null;
  event_hash?: string | null;
}

export interface AuditEvent {
  id: string;
  claim_id: string;
  timestamp: string;
  event_type: AuditEventType | string;
  actor_type: ActorType | string;
  actor_id: string | null;
  session_id: string | null;
  request_id: string | null;
  model_provider: string | null;
  model_name: string | null;
  model_version: string | null;
  inputs_ref: AuditEventInputsRef | null;
  metrics: AuditEventMetrics | null;
  decision: AuditEventDecision | null;
  snapshots: AuditEventSnapshots | null;
  payload: Record<string, unknown>;
  prev_event_hash: string | null;
  event_hash: string | null;
  created_at: string;
}

// Input type for creating new audit events
export interface CreateAuditEventInput {
  claim_id: string;
  event_type: AuditEventType | string;
  actor_type: ActorType | string;
  actor_id?: string | null;
  session_id?: string | null;
  request_id?: string | null;
  model?: {
    provider?: string | null;
    name?: string | null;
    version?: string | null;
  };
  inputs_ref?: AuditEventInputsRef | null;
  metrics?: AuditEventMetrics | null;
  decision?: AuditEventDecision | null;
  snapshots?: AuditEventSnapshots | null;
  payload?: Record<string, unknown>;
}

// Full export structure
export interface AuditExport {
  claim_id: string;
  exported_at: string;
  exported_by: {
    actor_type: ActorType | string;
    actor_id: string | null;
  };
  claim_snapshot: Record<string, unknown>;
  audit_events: AuditEvent[];
}

// Filter options for audit trail UI
export interface AuditFilterOptions {
  event_types?: string[];
  actor_types?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Event display config for UI
export interface EventDisplayConfig {
  label: string;
  icon: string;
  color: string;
  category: 'lifecycle' | 'photo' | 'ai' | 'routing' | 'verification' | 'estimate' | 'decision' | 'qa' | 'admin' | 'export';
}

export const EVENT_DISPLAY_CONFIG: Record<string, EventDisplayConfig> = {
  // Claim lifecycle
  claim_created: { label: 'Claim Created', icon: 'FilePlus', color: 'text-success', category: 'lifecycle' },
  claim_updated: { label: 'Claim Updated', icon: 'FileEdit', color: 'text-primary', category: 'lifecycle' },
  claim_submitted: { label: 'Claim Submitted', icon: 'Send', color: 'text-primary', category: 'lifecycle' },
  claim_status_changed: { label: 'Status Changed', icon: 'RefreshCw', color: 'text-warning', category: 'lifecycle' },

  // Photo lifecycle
  photo_uploaded: { label: 'Photo Uploaded', icon: 'Upload', color: 'text-primary', category: 'photo' },
  photo_deleted: { label: 'Photo Deleted', icon: 'Trash2', color: 'text-destructive', category: 'photo' },
  photo_quality_scored: { label: 'Quality Scored', icon: 'CheckCircle', color: 'text-success', category: 'photo' },
  retake_requested: { label: 'Retake Requested', icon: 'RotateCcw', color: 'text-warning', category: 'photo' },
  retake_uploaded: { label: 'Retake Uploaded', icon: 'RefreshCw', color: 'text-success', category: 'photo' },

  // AI pipeline
  ai_quality_complete: { label: 'AI Quality Complete', icon: 'Bot', color: 'text-primary', category: 'ai' },
  ai_damage_complete: { label: 'AI Damage Complete', icon: 'Bot', color: 'text-primary', category: 'ai' },
  ai_localization_complete: { label: 'AI Localization Complete', icon: 'Bot', color: 'text-primary', category: 'ai' },
  ai_triage_complete: { label: 'AI Triage Complete', icon: 'Bot', color: 'text-primary', category: 'ai' },
  quality_assessment_completed: { label: 'Quality Assessment', icon: 'Camera', color: 'text-primary', category: 'ai' },
  damage_assessment_completed: { label: 'Damage Assessment', icon: 'AlertTriangle', color: 'text-warning', category: 'ai' },
  localization_completed: { label: 'Localization Complete', icon: 'Target', color: 'text-primary', category: 'ai' },
  triage_decision: { label: 'Triage Decision', icon: 'GitBranch', color: 'text-primary', category: 'ai' },

  // Routing
  routing_decision: { label: 'Routing Decision', icon: 'GitBranch', color: 'text-primary', category: 'routing' },

  // Human review
  human_review_requested: { label: 'Human Review Requested', icon: 'UserCheck', color: 'text-warning', category: 'routing' },
  human_review_cleared: { label: 'Human Review Cleared', icon: 'UserCheck', color: 'text-success', category: 'routing' },
  intake_preference_set: { label: 'Intake Preference Set', icon: 'Settings', color: 'text-muted-foreground', category: 'routing' },

  // Part verification
  part_verified: { label: 'Part Verified', icon: 'CheckCircle', color: 'text-success', category: 'verification' },
  part_rejected: { label: 'Part Rejected', icon: 'XCircle', color: 'text-destructive', category: 'verification' },
  part_edited: { label: 'Part Edited', icon: 'Edit', color: 'text-warning', category: 'verification' },
  evidence_linked: { label: 'Evidence Linked', icon: 'Link', color: 'text-primary', category: 'verification' },

  // Box verification
  box_added: { label: 'Box Added', icon: 'PlusSquare', color: 'text-success', category: 'verification' },
  box_edited: { label: 'Box Edited', icon: 'Edit', color: 'text-warning', category: 'verification' },
  box_deleted: { label: 'Box Deleted', icon: 'Trash2', color: 'text-destructive', category: 'verification' },
  box_verified: { label: 'Box Verified', icon: 'CheckSquare', color: 'text-success', category: 'verification' },
  box_rejected: { label: 'Box Rejected', icon: 'XSquare', color: 'text-destructive', category: 'verification' },
  box_marked_uncertain: { label: 'Box Marked Uncertain', icon: 'HelpCircle', color: 'text-warning', category: 'verification' },

  // Estimating
  estimate_created: { label: 'Estimate Created', icon: 'DollarSign', color: 'text-success', category: 'estimate' },
  estimate_lineitem_accepted: { label: 'Line Item Accepted', icon: 'CheckCircle', color: 'text-success', category: 'estimate' },
  estimate_lineitem_rejected: { label: 'Line Item Rejected', icon: 'XCircle', color: 'text-destructive', category: 'estimate' },
  estimate_lineitem_edited: { label: 'Line Item Edited', icon: 'Edit', color: 'text-warning', category: 'estimate' },
  estimate_source_selected: { label: 'Source Selected', icon: 'ExternalLink', color: 'text-primary', category: 'estimate' },

  // Decisions
  adjuster_approve: { label: 'Adjuster Approved', icon: 'CheckCircle', color: 'text-success', category: 'decision' },
  adjuster_review: { label: 'Adjuster Review', icon: 'Eye', color: 'text-warning', category: 'decision' },
  adjuster_escalate: { label: 'Adjuster Escalated', icon: 'AlertTriangle', color: 'text-destructive', category: 'decision' },
  claim_approve: { label: 'Claim Approved', icon: 'CheckCircle', color: 'text-success', category: 'decision' },
  claim_review: { label: 'Claim Review', icon: 'Eye', color: 'text-warning', category: 'decision' },
  claim_escalate: { label: 'Claim Escalated', icon: 'AlertTriangle', color: 'text-destructive', category: 'decision' },
  senior_approve: { label: 'Senior Approved', icon: 'Shield', color: 'text-success', category: 'decision' },
  manager_override: { label: 'Manager Override', icon: 'Key', color: 'text-warning', category: 'decision' },

  // QA
  qa_sampled: { label: 'QA Sampled', icon: 'Clipboard', color: 'text-primary', category: 'qa' },
  qa_started: { label: 'QA Started', icon: 'Play', color: 'text-primary', category: 'qa' },
  qa_completed: { label: 'QA Completed', icon: 'CheckSquare', color: 'text-success', category: 'qa' },
  qa_failed_rerouted: { label: 'QA Failed - Rerouted', icon: 'AlertOctagon', color: 'text-destructive', category: 'qa' },

  // Admin
  controls_updated: { label: 'Controls Updated', icon: 'Settings', color: 'text-primary', category: 'admin' },
  model_update_review_opened: { label: 'Model Review Opened', icon: 'Eye', color: 'text-warning', category: 'admin' },
  model_update_approved: { label: 'Model Update Approved', icon: 'CheckCircle', color: 'text-success', category: 'admin' },
  model_update_denied: { label: 'Model Update Denied', icon: 'XCircle', color: 'text-destructive', category: 'admin' },

  // Export
  audit_exported: { label: 'Audit Exported', icon: 'Download', color: 'text-primary', category: 'export' },

  // Legacy/fallback
  edit_annotations: { label: 'Annotations Edited', icon: 'Edit', color: 'text-warning', category: 'verification' },
  annotations_marked_uncertain: { label: 'Annotations Uncertain', icon: 'HelpCircle', color: 'text-warning', category: 'verification' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  lifecycle: 'Claim Lifecycle',
  photo: 'Photo',
  ai: 'AI Pipeline',
  routing: 'Routing',
  verification: 'Verification',
  estimate: 'Estimate',
  decision: 'Decision',
  qa: 'QA',
  admin: 'Admin',
  export: 'Export',
};

// KPI computation types (for backwards compatibility)
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
