// Human Verification types for parts and annotations

export type VerificationStatus = 'proposed' | 'verified' | 'rejected' | 'needs_review';

export type ReasonCode = 
  | 'wrong_part'
  | 'false_positive'
  | 'occluded_view'
  | 'mislocalized'
  | 'severity_incorrect'
  | 'other';

export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  wrong_part: 'Wrong part identified',
  false_positive: 'False positive',
  occluded_view: 'Occluded/insufficient view',
  mislocalized: 'Mislocalized evidence',
  severity_incorrect: 'Severity incorrect',
  other: 'Other',
};

// Verification state for a damaged part
export interface PartVerification {
  partIndex: number; // Index in the original damaged_parts array
  status: VerificationStatus;
  reasonCode?: ReasonCode;
  notes?: string;
  linkedBoxIds: string[]; // Detection IDs linked as evidence
  editedValues?: {
    part?: string;
    damage_type?: string;
    severity?: number;
  };
  verifiedAt?: string;
  verifiedBy?: string;
}

// Verification state for a detection box
export interface BoxVerification {
  detectionId: string;
  status: VerificationStatus;
  reasonCode?: ReasonCode;
  notes?: string;
  editedValues?: {
    label?: string;
    part?: string;
    severity?: string;
    confidence?: number;
  };
  linkedPartIndex?: number; // Which part this box is evidence for
  verifiedAt?: string;
  verifiedBy?: string;
}

// Complete verification state stored per claim
export interface VerificationState {
  parts: PartVerification[];
  boxes: BoxVerification[];
  lastModified: string;
  modifiedBy: string;
}

// For audit log snapshots
export interface VerificationSnapshot {
  type: 'part' | 'box';
  id: string | number;
  before: PartVerification | BoxVerification | null;
  after: PartVerification | BoxVerification;
  action: 'verify' | 'reject' | 'edit' | 'link' | 'unlink';
}
