import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Claim, AuditLog } from '@/types/claims';
import { Estimate } from '@/types/estimates';
import { Annotations } from '@/types/annotations';
import { AssessmentResults } from './AssessmentResults';
import { EstimateCard } from './EstimateCard';
import { DamageOverlay } from './DamageOverlay';
import { ArrowLeft, Clock, User, Bot, FileText } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleDecision = async (decision: 'approve' | 'review' | 'escalate') => {
    setIsLoading(true);
    
    const statusMap = {
      approve: 'approved' as const,
      review: 'review' as const,
      escalate: 'escalated' as const,
    };

    try {
      // Update claim status
      const { error: updateError } = await supabase
        .from('claims')
        .update({ 
          status: statusMap[decision],
          adjuster_decision: decision,
        })
        .eq('id', claim.id);

      if (updateError) throw updateError;

      // Log the action
      await supabase.from('audit_logs').insert({
        claim_id: claim.id,
        action: `claim_${decision}`,
        actor: 'Adjuster',
        actor_type: 'human',
        details: { decision },
      });

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
      // Log the edit with before/after JSON
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

      // Update the claim
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

      // Update annotations with uncertainty note
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
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
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

        {/* Photo with Damage Overlay */}
        {claim.photo_url && (
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
