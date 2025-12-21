import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClaimForm } from './ClaimForm';
import { PhotoUploader } from './PhotoUploader';
import { AssessmentResults } from './AssessmentResults';
import { ClaimFormData, QualityResult, DamageAssessment } from '@/types/claims';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

interface NewClaimWizardProps {
  onBack: () => void;
  onComplete: () => void;
}

type Step = 'form' | 'photo' | 'results';

export function NewClaimWizard({ onBack, onComplete }: NewClaimWizardProps) {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<ClaimFormData | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [damageAssessment, setDamageAssessment] = useState<DamageAssessment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (data: ClaimFormData) => {
    setIsLoading(true);
    try {
      // Create the claim in the database
      const { data: newClaim, error } = await supabase
        .from('claims')
        .insert({
          policy_number: data.policy_number,
          claimant_name: data.claimant_name,
          vehicle_make: data.vehicle_make,
          vehicle_model: data.vehicle_model,
          vehicle_year: data.vehicle_year,
          incident_date: data.incident_date,
          incident_description: data.incident_description,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await supabase.from('audit_logs').insert([{
        claim_id: newClaim.id,
        action: 'claim_created',
        actor: 'System',
        actor_type: 'human',
        details: JSON.parse(JSON.stringify({ form_data: data })),
      }]);

      setFormData(data);
      setClaimId(newClaim.id);
      setStep('photo');
      toast.success('Claim created. Now upload a damage photo.');
    } catch (error) {
      console.error('Error creating claim:', error);
      toast.error('Failed to create claim');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelected = async (_file: File, base64: string) => {
    setPhotoBase64(base64);
    setQualityResult(null);
    setDamageAssessment(null);
    await analyzePhoto(base64);
  };

  const analyzePhoto = async (base64: string) => {
    if (!claimId) return;
    
    setIsAnalyzing(true);
    try {
      // Update claim status to processing
      await supabase.from('claims').update({ status: 'processing' }).eq('id', claimId);

      // Log photo upload
      await supabase.from('audit_logs').insert({
        claim_id: claimId,
        action: 'photo_uploaded',
        actor: 'System',
        actor_type: 'human',
      });

      // Call the process-photo edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-photo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            claim_id: claimId,
            image_base64: base64,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.');
          return;
        }
        throw new Error(result.error || 'Analysis failed');
      }

      // Log quality assessment
      await supabase.from('audit_logs').insert({
        claim_id: claimId,
        action: 'quality_assessment_completed',
        actor: 'Quality Agent',
        actor_type: 'ai_quality',
        details: result.quality_result,
      });

      setQualityResult(result.quality_result);

      if (!result.success) {
        // Quality failed
        toast.error('Photo quality check failed. Please retake.');
        return;
      }

      // Quality passed, log damage assessment
      await supabase.from('audit_logs').insert({
        claim_id: claimId,
        action: 'damage_assessment_completed',
        actor: 'Damage Agent',
        actor_type: 'ai_damage',
        details: result.damage_result,
      });

      // Log triage decision
      await supabase.from('audit_logs').insert({
        claim_id: claimId,
        action: `triage_recommendation_${result.recommended_action}`,
        actor: 'Triage Agent',
        actor_type: 'ai_triage',
        details: { 
          recommended_action: result.recommended_action,
          severity: result.damage_result.overall_severity,
          confidence: result.damage_result.overall_confidence,
        },
      });

      // Update claim with assessment data
      await supabase.from('claims').update({
        status: result.recommended_action === 'escalate' ? 'escalated' : 'review',
        quality_score: result.quality_result.score,
        quality_issues: result.quality_result.issues,
        damage_assessment: result.damage_result,
        ai_summary: result.damage_result.summary,
        ai_recommendation: result.recommended_action,
        severity_score: result.damage_result.overall_severity,
        confidence_score: result.damage_result.overall_confidence,
        cost_low: result.damage_result.total_cost_low,
        cost_high: result.damage_result.total_cost_high,
        safety_concerns: result.damage_result.safety_concerns,
        fraud_indicators: result.damage_result.fraud_indicators,
        photo_url: `data:image/jpeg;base64,${base64}`,
      }).eq('id', claimId);

      setDamageAssessment(result.damage_result);
      setStep('results');
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error analyzing photo:', error);
      toast.error('Failed to analyze photo. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = () => {
    setQualityResult(null);
    setPhotoBase64(null);
  };

  const handleDecision = async (decision: 'approve' | 'review' | 'escalate') => {
    if (!claimId) return;
    
    setIsLoading(true);
    try {
      const statusMap = {
        approve: 'approved' as const,
        review: 'review' as const,
        escalate: 'escalated' as const,
      };

      await supabase.from('claims').update({
        status: statusMap[decision],
        adjuster_decision: decision,
      }).eq('id', claimId);

      await supabase.from('audit_logs').insert({
        claim_id: claimId,
        action: `claim_${decision}`,
        actor: 'Adjuster',
        actor_type: 'human',
        details: { decision },
      });

      toast.success(`Claim ${decision === 'approve' ? 'approved' : decision === 'escalate' ? 'escalated' : 'marked for review'}`);
      onComplete();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: 'form', label: 'Details' },
    { key: 'photo', label: 'Photo' },
    { key: 'results', label: 'Results' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  idx < currentStepIndex 
                    ? 'bg-success text-success-foreground' 
                    : idx === currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {idx < currentStepIndex ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  idx === currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-3 ${
                    idx < currentStepIndex ? 'bg-success' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        {step === 'form' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-2">New Claim</h1>
            <p className="text-muted-foreground mb-6">Enter the claim details below.</p>
            <ClaimForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          </div>
        )}

        {step === 'photo' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-2">Upload Photo</h1>
            <p className="text-muted-foreground mb-6">
              Take a clear photo of the vehicle damage.
            </p>
            <PhotoUploader
              onPhotoSelected={handlePhotoSelected}
              qualityResult={qualityResult}
              isAnalyzing={isAnalyzing}
              onRetry={handleRetry}
            />
          </div>
        )}

        {step === 'results' && damageAssessment && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-2">Assessment Results</h1>
            <p className="text-muted-foreground mb-6">
              Review the AI assessment and make a decision.
            </p>
            <AssessmentResults
              assessment={damageAssessment}
              onApprove={() => handleDecision('approve')}
              onEdit={() => handleDecision('review')}
              onEscalate={() => handleDecision('escalate')}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
