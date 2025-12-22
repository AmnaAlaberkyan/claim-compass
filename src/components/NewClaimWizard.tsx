import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClaimForm } from './ClaimForm';
import { PhotoUploader } from './PhotoUploader';
import { AssessmentResults } from './AssessmentResults';
import { ClaimFormData, QualityResult, DamageAssessment, IntakePreference } from '@/types/claims';
import { Estimate } from '@/types/estimates';
import { Annotations } from '@/types/annotations';
import { EstimateCard } from './EstimateCard';
import { DamageOverlay } from './DamageOverlay';
import { ArrowLeft, Check, Bot, UserCheck, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [annotations, setAnnotations] = useState<Annotations | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentClaim, setCurrentClaim] = useState<ClaimFormData | null>(null);
  // Human review preference state
  const [intakePreference, setIntakePreference] = useState<IntakePreference>('ai_first');
  const [humanReviewReason, setHumanReviewReason] = useState('');

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
      setCurrentClaim(data);
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
    const humanReviewRequested = intakePreference === 'human_requested';

    try {
      // Update claim with intake preference and set status to processing
      await supabase.from('claims').update({ 
        status: 'processing',
        human_review_requested: humanReviewRequested,
        human_review_reason: humanReviewRequested ? humanReviewReason || null : null,
        intake_preference: intakePreference,
      }).eq('id', claimId);

      // Log intake preference
      await supabase.from('audit_logs').insert([{
        claim_id: claimId,
        action: humanReviewRequested ? 'human_review_requested' : 'intake_preference_set',
        actor: 'Claimant',
        actor_type: 'human',
        details: JSON.parse(JSON.stringify({ 
          preference: intakePreference, 
          reason: humanReviewReason || null 
        })),
      }]);

      // Log photo upload
      await supabase.from('audit_logs').insert([{
        claim_id: claimId,
        action: 'photo_uploaded',
        actor: 'System',
        actor_type: 'human',
      }]);

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
            vehicle_make: currentClaim?.vehicle_make,
            vehicle_model: currentClaim?.vehicle_model,
            vehicle_year: currentClaim?.vehicle_year,
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

      // Determine the routing based on human review request
      let finalStatus: 'review' | 'escalated';
      if (humanReviewRequested) {
        // Always route to review queue when human review is requested
        finalStatus = 'review';
        // Log routing decision
        await supabase.from('audit_logs').insert([{
          claim_id: claimId,
          action: 'routed_to_human_due_to_request',
          actor: 'System',
          actor_type: 'ai_triage',
          details: JSON.parse(JSON.stringify({
            reason: 'claimant_requested_human_review',
            ai_recommendation: result.recommended_action,
            intake_preference: intakePreference,
          })),
        }]);
      } else {
        // Normal AI routing logic
        finalStatus = result.recommended_action === 'escalate' ? 'escalated' : 'review';
      }

      // Update claim with assessment data
      await supabase.from('claims').update({
        status: finalStatus,
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
      if (result.estimate) {
        setEstimate(result.estimate);
      }
      if (result.annotations) {
        setAnnotations(result.annotations);
      }
      setStep('results');
      
      if (humanReviewRequested) {
        toast.success('Analysis complete! Your claim is queued for human verification.');
      } else {
        toast.success('Analysis complete!');
      }
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
          <div className="animate-fade-in space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Upload Photo</h1>
              <p className="text-muted-foreground mb-6">
                Take a clear photo of the vehicle damage.
              </p>
            </div>

            {/* Review Preference Selection */}
            <div className="card-apple p-5 space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground text-sm">How would you like your claim reviewed?</span>
              </div>
              
              <RadioGroup 
                value={intakePreference} 
                onValueChange={(v) => setIntakePreference(v as IntakePreference)}
                className="space-y-3"
              >
                <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  intakePreference === 'ai_first' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="ai_first" id="ai_first" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="ai_first" className="flex items-center gap-2 cursor-pointer">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium">AI review first (fastest)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll analyze your photos instantly and route to an adjuster if needed.
                    </p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  intakePreference === 'human_requested' 
                    ? 'border-warning bg-warning/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="human_requested" id="human_requested" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="human_requested" className="flex items-center gap-2 cursor-pointer">
                      <UserCheck className="w-4 h-4 text-warning" />
                      <span className="font-medium">Request human review</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      An adjuster will verify the assessment before any decision.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Optional reason field when human review is requested */}
              {intakePreference === 'human_requested' && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reason" className="text-sm text-muted-foreground">
                    Reason for human review (optional)
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Complex damage, pre-existing conditions, or any concerns..."
                    value={humanReviewReason}
                    onChange={(e) => setHumanReviewReason(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <PhotoUploader
              onPhotoSelected={handlePhotoSelected}
              qualityResult={qualityResult}
              isAnalyzing={isAnalyzing}
              onRetry={handleRetry}
            />
          </div>
        )}

        {step === 'results' && damageAssessment && (
          <div className="animate-fade-in space-y-6">
            {/* Human Review Requested Banner */}
            {intakePreference === 'human_requested' && (
              <div className="card-apple p-4 border-l-4 border-l-warning bg-warning/5">
                <div className="flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Your claim is queued for human verification</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      An adjuster will review your assessment within 24-48 hours. We'll notify you when a decision is made.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Assessment Results</h1>
              <p className="text-muted-foreground mb-6">
                {intakePreference === 'human_requested' 
                  ? 'AI has analyzed your photos. An adjuster will verify before finalizing.'
                  : 'Review the AI assessment and make a decision.'}
              </p>
            </div>
            <AssessmentResults
              assessment={damageAssessment}
              onApprove={() => handleDecision('approve')}
              onEdit={() => handleDecision('review')}
              onEscalate={() => handleDecision('escalate')}
              isLoading={isLoading}
              hideActions={intakePreference === 'human_requested'}
            />
            {photoBase64 && annotations && (
              <div className="mt-8">
                <h3 className="font-semibold text-foreground mb-3">Damage Localization</h3>
                <DamageOverlay
                  imageUrl={`data:image/jpeg;base64,${photoBase64}`}
                  annotations={annotations}
                  editable={false}
                />
              </div>
            )}
            {estimate && (
              <div className="mt-8">
                <EstimateCard estimate={estimate} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
