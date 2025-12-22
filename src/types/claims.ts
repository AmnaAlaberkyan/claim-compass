export type IntakePreference = 'ai_first' | 'human_requested';

export interface Claim {
  id: string;
  policy_number: string;
  claimant_name: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  incident_date: string;
  incident_description: string;
  status: 'pending' | 'processing' | 'approved' | 'review' | 'escalated';
  photo_url?: string;
  quality_score?: number;
  quality_issues?: QualityIssue[];
  damage_assessment?: DamageAssessment;
  ai_summary?: string;
  ai_recommendation?: string;
  severity_score?: number;
  confidence_score?: number;
  cost_low?: number;
  cost_high?: number;
  safety_concerns?: string[];
  fraud_indicators?: string[];
  adjuster_decision?: string;
  adjuster_notes?: string;
  // Human review request fields
  human_review_requested: boolean;
  human_review_reason?: string;
  intake_preference: IntakePreference;
  routing_reasons?: Array<{ code: string; message: string }>;
  routing_snapshot?: Record<string, number | boolean>;
  created_at: string;
  updated_at: string;
}

export interface QualityIssue {
  type: 'blur' | 'darkness' | 'angle' | 'distance' | 'obstruction' | 'resolution';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface QualityResult {
  acceptable: boolean;
  score: number;
  issues: QualityIssue[];
  guidance: string;
}

export interface DamagedPart {
  part: string;
  damage_type: string;
  severity: number;
  confidence: number;
  cost_low: number;
  cost_high: number;
}

export interface DamageAssessment {
  damaged_parts: DamagedPart[];
  overall_severity: number;
  overall_confidence: number;
  total_cost_low: number;
  total_cost_high: number;
  summary: string;
  safety_concerns: string[];
  fraud_indicators: string[];
  recommended_action: 'approve' | 'review' | 'escalate';
}

export interface AuditLog {
  id: string;
  claim_id: string;
  action: string;
  actor: string;
  actor_type: 'ai_quality' | 'ai_damage' | 'ai_triage' | 'human';
  details?: Record<string, any>;
  created_at: string;
}

export interface ClaimFormData {
  policy_number: string;
  claimant_name: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  incident_date: string;
  incident_description: string;
}
