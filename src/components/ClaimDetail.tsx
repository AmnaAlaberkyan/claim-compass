import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Claim, AuditLog, DamagedPart } from '@/types/claims';
import { Estimate } from '@/types/estimates';
import { Annotations, Detection } from '@/types/annotations';
import { VerificationState, PartVerification, BoxVerification, ReasonCode } from '@/types/verification';
import { AssessmentResults } from './AssessmentResults';
import { EstimateCard } from './EstimateCard';
import { DamageOverlay } from './DamageOverlay';
import { PartsVerificationTable } from './PartsVerificationTable';
import { ArrowLeft, Clock, User, Bot, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ClaimDetailProps {
  claim: Claim;
  onBack: () => void;
  onUpdate: () => void;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ClaimDetail({ claim, onBack, onUpdate }: ClaimDetailProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [annotations, setAnnotations] = useState<Annotations | null>(null);
  const [originalAnnotations, setOriginalAnnotations] = useState<Annotations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>({
    parts: [],
    boxes: [],
    lastModified: new Date().toISOString(),
    modifiedBy: 'Adjuster',
  });
  const [highlightedBoxId, setHighlightedBoxId] = useState<string | null>(null);

  const damagedParts = claim.damage_assessment?.damaged_parts || [];
  const detections = annotations?.detections || [];

  useEffect(() => {
    fetchAuditLogs();
    fetchEstimate();
    fetchAnnotations();
  }, [claim.id]);

  const fetchAnnotations = async () => {
    const { data, error } = await supabase
      .from('claims')
      .select('annotations_json')
      .eq('id', claim.id)
      .single();

    if (!error && data?.annotations_json) {
      const parsed = data.annotations_json as unknown as Annotations;
      setAnnotations(parsed);
      setOriginalAnnotations(parsed);
    }
  };

  const fetchEstimate = async () => {
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('claim_id', claim.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setEstimate(data.payload as unknown as Estimate);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('claim_id', claim.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const transformedLogs: AuditLog[] = data.map(log => ({
        id: log.id,
        claim_id: log.claim_id || '',
        action: log.action,
        actor: log.actor,
        actor_type: log.actor_type as AuditLog['actor_type'],
        details: log.details as Record<string, any> | undefined,
        created_at: log.created_at,
      }));
      setAuditLogs(transformedLogs);
    }
  };

  const logVerificationAction = async (action: string, details: Record<string, any>) => {
    await supabase.from('audit_logs').insert([{
      claim_id: claim.id,
      action,
      actor: 'Adjuster',
      actor_type: 'human',
      details: JSON.parse(JSON.stringify(details)),
    }]);
    fetchAuditLogs();
  };

  // Part verification handlers
  const handleVerifyPart = (partIndex: number) => {
    const before = verificationState.parts.find(p => p.partIndex === partIndex);
    const after: PartVerification = {
      partIndex,
      status: 'verified',
      linkedBoxIds: before?.linkedBoxIds || [],
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      parts: [...prev.parts.filter(p => p.partIndex !== partIndex), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('part_verified', {
      partIndex,
      partName: damagedParts[partIndex]?.part,
      before,
      after,
    });
    toast.success(`Part "${damagedParts[partIndex]?.part}" verified`);
  };

  const handleRejectPart = (partIndex: number, reasonCode: ReasonCode, notes?: string) => {
    const before = verificationState.parts.find(p => p.partIndex === partIndex);
    const after: PartVerification = {
      partIndex,
      status: 'rejected',
      reasonCode,
      notes,
      linkedBoxIds: before?.linkedBoxIds || [],
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      parts: [...prev.parts.filter(p => p.partIndex !== partIndex), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('part_rejected', {
      partIndex,
      partName: damagedParts[partIndex]?.part,
      reasonCode,
      notes,
      before,
      after,
    });
    toast.success(`Part "${damagedParts[partIndex]?.part}" rejected`);
  };

  const handleEditPart = (partIndex: number, edits: PartVerification['editedValues'], reasonCode: ReasonCode) => {
    const before = verificationState.parts.find(p => p.partIndex === partIndex);
    const after: PartVerification = {
      partIndex,
      status: 'verified',
      reasonCode,
      editedValues: edits,
      linkedBoxIds: before?.linkedBoxIds || [],
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      parts: [...prev.parts.filter(p => p.partIndex !== partIndex), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('part_edited', {
      partIndex,
      partName: damagedParts[partIndex]?.part,
      edits,
      reasonCode,
      before,
      after,
    });
    toast.success(`Part "${damagedParts[partIndex]?.part}" edited and verified`);
  };

  const handleLinkEvidence = (partIndex: number, detectionIds: string[]) => {
    const existing = verificationState.parts.find(p => p.partIndex === partIndex);
    const updated: PartVerification = {
      ...(existing || { partIndex, status: 'proposed' as const, linkedBoxIds: [] }),
      linkedBoxIds: detectionIds,
    };

    setVerificationState(prev => ({
      ...prev,
      parts: [...prev.parts.filter(p => p.partIndex !== partIndex), updated],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('evidence_linked', {
      partIndex,
      partName: damagedParts[partIndex]?.part,
      detectionIds,
    });
  };

  // Box verification handlers
  const handleVerifyBox = (detectionId: string) => {
    const before = verificationState.boxes.find(b => b.detectionId === detectionId);
    const after: BoxVerification = {
      detectionId,
      status: 'verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      boxes: [...prev.boxes.filter(b => b.detectionId !== detectionId), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('box_verified', { detectionId, before, after });
    toast.success('Detection verified');
  };

  const handleRejectBox = (detectionId: string, reasonCode: ReasonCode, notes?: string) => {
    const before = verificationState.boxes.find(b => b.detectionId === detectionId);
    const after: BoxVerification = {
      detectionId,
      status: 'rejected',
      reasonCode,
      notes,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      boxes: [...prev.boxes.filter(b => b.detectionId !== detectionId), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('box_rejected', { detectionId, reasonCode, notes, before, after });
    toast.success('Detection rejected');
  };

  const handleEditBox = (detectionId: string, edits: BoxVerification['editedValues'], reasonCode: ReasonCode) => {
    const before = verificationState.boxes.find(b => b.detectionId === detectionId);
    const after: BoxVerification = {
      detectionId,
      status: 'verified',
      editedValues: edits,
      reasonCode,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      boxes: [...prev.boxes.filter(b => b.detectionId !== detectionId), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('box_edited', { detectionId, edits, reasonCode, before, after });
    toast.success('Detection edited');
  };

  const handleMarkBoxUncertain = (detectionId: string) => {
    const before = verificationState.boxes.find(b => b.detectionId === detectionId);
    const after: BoxVerification = {
      detectionId,
      status: 'needs_review',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Adjuster',
    };

    setVerificationState(prev => ({
      ...prev,
      boxes: [...prev.boxes.filter(b => b.detectionId !== detectionId), after],
      lastModified: new Date().toISOString(),
    }));

    logVerificationAction('box_marked_uncertain', { detectionId, before, after });
    toast.success('Detection marked for 2nd review');
  };

  const handleLinkBoxToPart = (detectionId: string, partIndex: number | null) => {
    const existing = verificationState.boxes.find(b => b.detectionId === detectionId);
    const updated: BoxVerification = {
      ...(existing || { detectionId, status: 'proposed' as const }),
      linkedPartIndex: partIndex ?? undefined,
    };

    setVerificationState(prev => ({
      ...prev,
      boxes: [...prev.boxes.filter(b => b.detectionId !== detectionId), updated],
      lastModified: new Date().toISOString(),
    }));

    if (partIndex !== null) {
      handleLinkEvidence(partIndex, [
        ...(verificationState.parts.find(p => p.partIndex === partIndex)?.linkedBoxIds || []),
        detectionId,
      ]);
    }
  };

  const handleDecision = async (decision: 'approve' | 'review' | 'escalate') => {
    setIsLoading(true);
    
    const statusMap = {
      approve: 'approved' as const,
      review: 'review' as const,
      escalate: 'escalated' as const,
    };

    try {
      const { error: updateError } = await supabase
        .from('claims')
        .update({ 
          status: statusMap[decision],
          adjuster_decision: decision,
        })
        .eq('id', claim.id);

      if (updateError) throw updateError;

      await supabase.from('audit_logs').insert([{
        claim_id: claim.id,
        action: `claim_${decision}`,
        actor: 'Adjuster',
        actor_type: 'human',
        details: JSON.parse(JSON.stringify({ decision, verificationState })),
      }]);

      toast.success(`Claim ${decision === 'approve' ? 'approved' : decision === 'escalate' ? 'escalated' : 'marked for review'}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnnotations = async (newAnnotations: Annotations) => {
    try {
      await supabase.from('audit_logs').insert([{
        claim_id: claim.id,
        action: 'edit_annotations',
        actor: 'Adjuster',
        actor_type: 'human',
        details: JSON.parse(JSON.stringify({
          before_json: originalAnnotations,
          after_json: newAnnotations,
        })),
      }]);

      const { error } = await supabase
        .from('claims')
        .update({ annotations_json: JSON.parse(JSON.stringify(newAnnotations)) })
        .eq('id', claim.id);

      if (error) throw error;

      setAnnotations(newAnnotations);
      setOriginalAnnotations(newAnnotations);
      fetchAuditLogs();
      toast.success('Annotations saved');
    } catch (error) {
      console.error('Error saving annotations:', error);
      toast.error('Failed to save annotations');
    }
  };

  const handleResetAnnotations = () => {
    if (originalAnnotations) {
      setAnnotations({ ...originalAnnotations });
    }
  };

  const handleMarkUncertain = async () => {
    try {
      await supabase.from('audit_logs').insert([{
        claim_id: claim.id,
        action: 'annotations_marked_uncertain',
        actor: 'Adjuster',
        actor_type: 'human',
        details: { reason: 'Adjuster marked annotations as uncertain' },
      }]);

      const updatedAnnotations: Annotations = {
        ...annotations,
        detections: annotations?.detections || [],
        notes: 'Marked as uncertain by adjuster',
      };

      await supabase
        .from('claims')
        .update({ annotations_json: JSON.parse(JSON.stringify(updatedAnnotations)) })
        .eq('id', claim.id);

      setAnnotations(updatedAnnotations);
      fetchAuditLogs();
      toast.success('Annotations marked as uncertain');
    } catch (error) {
      console.error('Error marking uncertain:', error);
      toast.error('Failed to mark as uncertain');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Claim Info */}
        <div className="card-apple p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{claim.policy_number}</h1>
              <p className="text-muted-foreground">{claim.claimant_name}</p>
            </div>
            <span className={`status-badge ${
              claim.status === 'approved' ? 'bg-success/10 text-success' :
              claim.status === 'escalated' ? 'bg-destructive/10 text-destructive' :
              claim.status === 'review' ? 'bg-warning/10 text-warning' :
              'bg-muted text-muted-foreground'
            }`}>
              {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p className="font-medium text-foreground">
                {claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Incident Date</p>
              <p className="font-medium text-foreground">
                {new Date(claim.incident_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-muted-foreground text-sm mb-1">Description</p>
            <p className="text-foreground">{claim.incident_description}</p>
          </div>
        </div>

        {/* Human Verification Workspace */}
        {claim.photo_url && claim.damage_assessment && (
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
                  onVerify={handleVerifyPart}
                  onReject={handleRejectPart}
                  onEdit={handleEditPart}
                  onLinkEvidence={handleLinkEvidence}
                  onSelectDetection={setHighlightedBoxId}
                  selectedDetectionId={highlightedBoxId}
                />
              </TabsContent>
              
              <TabsContent value="annotations" className="space-y-4">
                <DamageOverlay
                  imageUrl={claim.photo_url}
                  annotations={annotations}
                  editable={false}
                  boxVerifications={verificationState.boxes}
                  onVerifyBox={handleVerifyBox}
                  onRejectBox={handleRejectBox}
                  onEditBox={handleEditBox}
                  onMarkBoxUncertain={handleMarkBoxUncertain}
                  onLinkBoxToPart={handleLinkBoxToPart}
                  highlightedBoxId={highlightedBoxId}
                  partLabels={damagedParts.map(p => p.part)}
                  showVerificationControls={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Photo with Damage Overlay (editing mode) */}
        {claim.photo_url && !claim.damage_assessment && (
          <div className="card-apple p-6">
            <h2 className="font-semibold text-foreground mb-4">Damage Photo & Localization</h2>
            <DamageOverlay
              imageUrl={claim.photo_url}
              annotations={annotations}
              editable={true}
              onSave={handleSaveAnnotations}
              onReset={handleResetAnnotations}
              onMarkUncertain={handleMarkUncertain}
            />
          </div>
        )}

        {/* Assessment Results */}
        {claim.damage_assessment && (
          <>
            <h2 className="font-semibold text-foreground text-lg">AI Assessment</h2>
            <AssessmentResults
              assessment={claim.damage_assessment}
              onApprove={() => handleDecision('approve')}
              onEdit={() => handleDecision('review')}
              onEscalate={() => handleDecision('escalate')}
              isLoading={isLoading}
            />
          </>
        )}

        {/* Estimate Card */}
        {estimate && (
          <>
            <h2 className="font-semibold text-foreground text-lg">Repair Estimate</h2>
            <EstimateCard estimate={estimate} />
          </>
        )}

        {/* Audit Trail */}
        {auditLogs.length > 0 && (
          <div className="card-apple p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Trail
            </h2>
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.actor_type === 'human' ? 'bg-primary/10' : 'bg-secondary'
                  }`}>
                    {log.actor_type === 'human' 
                      ? <User className="w-4 h-4 text-primary" />
                      : <Bot className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">{log.actor}</span>
                      {' '}{log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
