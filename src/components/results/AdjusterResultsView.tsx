import { DamageAssessment, DamagedPart } from '@/types/claims';
import { Estimate } from '@/types/estimates';
import { Annotations, Detection } from '@/types/annotations';
import { RoutingReason, RoutingRecommendation, RoutingStatus } from '@/types/routing';
import { VerificationState, PartVerification, BoxVerification, ReasonCode } from '@/types/verification';
import { AssessmentResults } from '@/components/AssessmentResults';
import { PartsVerificationTable } from '@/components/PartsVerificationTable';
import { DamageOverlay } from '@/components/DamageOverlay';
import { EstimateCard } from '@/components/EstimateCard';
import { RoutingReasonsCard } from '@/components/RoutingReasons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, UserCheck } from 'lucide-react';

interface AdjusterResultsViewProps {
  assessment: DamageAssessment;
  estimate?: Estimate | null;
  annotations?: Annotations | null;
  photoUrl?: string;
  routingReasons?: RoutingReason[];
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  humanReviewRequested?: boolean;
  verificationState: VerificationState;
  highlightedBoxId: string | null;
  isLoading?: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onEscalate: () => void;
  onVerifyPart: (partIndex: number) => void;
  onRejectPart: (partIndex: number, reasonCode: ReasonCode, notes?: string) => void;
  onEditPart: (partIndex: number, edits: PartVerification['editedValues'], reasonCode: ReasonCode) => void;
  onLinkEvidence: (partIndex: number, detectionIds: string[]) => void;
  onVerifyBox: (detectionId: string) => void;
  onRejectBox: (detectionId: string, reasonCode: ReasonCode, notes?: string) => void;
  onEditBox: (detectionId: string, edits: BoxVerification['editedValues'], reasonCode: ReasonCode) => void;
  onMarkBoxUncertain: (detectionId: string) => void;
  onLinkBoxToPart: (detectionId: string, partIndex: number | null) => void;
  onSelectDetection: (id: string | null) => void;
}

export function AdjusterResultsView({
  assessment,
  estimate,
  annotations,
  photoUrl,
  routingReasons = [],
  recommendation,
  status,
  humanReviewRequested,
  verificationState,
  highlightedBoxId,
  isLoading,
  onApprove,
  onEdit,
  onEscalate,
  onVerifyPart,
  onRejectPart,
  onEditPart,
  onLinkEvidence,
  onVerifyBox,
  onRejectBox,
  onEditBox,
  onMarkBoxUncertain,
  onLinkBoxToPart,
  onSelectDetection,
}: AdjusterResultsViewProps) {
  const damagedParts = assessment.damaged_parts || [];
  const detections = annotations?.detections || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Routing Reasons Card */}
      {routingReasons.length > 0 && (
        <RoutingReasonsCard
          reasons={routingReasons}
          recommendation={recommendation}
          status={status}
          variant="adjuster"
        />
      )}

      {/* Human Review Requested Banner */}
      {humanReviewRequested && (
        <div className="card-apple p-4 border-l-4 border-l-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Human review requested by claimant</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verify the assessment before making a decision.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Results with full stats */}
      <AssessmentResults
        assessment={assessment}
        onApprove={onApprove}
        onEdit={onEdit}
        onEscalate={onEscalate}
        isLoading={isLoading}
        hideActions={false}
      />

      {/* Human Verification Workspace */}
      {photoUrl && assessment && (
        <div className="card-apple p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Human Verification Workspace
          </h2>

          <Tabs defaultValue="parts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="parts">Parts Verification</TabsTrigger>
              <TabsTrigger value="annotations">Annotation Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="parts" className="space-y-4">
              <PartsVerificationTable
                damagedParts={damagedParts}
                detections={detections}
                verifications={verificationState.parts}
                onVerify={onVerifyPart}
                onReject={onRejectPart}
                onEdit={onEditPart}
                onLinkEvidence={onLinkEvidence}
                onSelectDetection={onSelectDetection}
                selectedDetectionId={highlightedBoxId}
              />
            </TabsContent>

            <TabsContent value="annotations" className="space-y-4">
              <DamageOverlay
                imageUrl={photoUrl}
                annotations={annotations}
                editable={false}
                boxVerifications={verificationState.boxes}
                onVerifyBox={onVerifyBox}
                onRejectBox={onRejectBox}
                onEditBox={onEditBox}
                onMarkBoxUncertain={onMarkBoxUncertain}
                onLinkBoxToPart={onLinkBoxToPart}
                highlightedBoxId={highlightedBoxId}
                partLabels={damagedParts.map(p => p.part)}
                showVerificationControls={true}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Estimate Card - Full version for adjusters */}
      {estimate && (
        <div className="mt-8">
          <EstimateCard estimate={estimate} />
        </div>
      )}
    </div>
  );
}
