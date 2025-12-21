import { DamageAssessment, DamagedPart } from '@/types/claims';
import { AlertTriangle, CheckCircle, TrendingUp, DollarSign, ShieldAlert, AlertOctagon } from 'lucide-react';

interface AssessmentResultsProps {
  assessment: DamageAssessment;
  onApprove: () => void;
  onEdit: () => void;
  onEscalate: () => void;
  isLoading?: boolean;
}

function getSeverityClass(severity: number): string {
  if (severity <= 3) return 'severity-low';
  if (severity <= 5) return 'severity-medium';
  if (severity <= 7) return 'severity-high';
  return 'severity-critical';
}

function getSeverityLabel(severity: number): string {
  if (severity <= 3) return 'Minor';
  if (severity <= 5) return 'Moderate';
  if (severity <= 7) return 'Significant';
  return 'Severe';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AssessmentResults({ 
  assessment, 
  onApprove, 
  onEdit, 
  onEscalate,
  isLoading 
}: AssessmentResultsProps) {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-apple p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{assessment.overall_severity}/10</p>
          <p className="text-xs text-muted-foreground">Severity</p>
          <span className={`status-badge mt-2 inline-block ${getSeverityClass(assessment.overall_severity)}`}>
            {getSeverityLabel(assessment.overall_severity)}
          </span>
        </div>

        <div className="card-apple p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{assessment.overall_confidence}%</p>
          <p className="text-xs text-muted-foreground">Confidence</p>
        </div>

        <div className="card-apple p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(assessment.total_cost_low)}</p>
          <p className="text-xs text-muted-foreground">Est. Low</p>
        </div>

        <div className="card-apple p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(assessment.total_cost_high)}</p>
          <p className="text-xs text-muted-foreground">Est. High</p>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card-apple p-6">
        <h3 className="font-semibold text-foreground mb-3">AI Summary</h3>
        <p className="text-muted-foreground leading-relaxed">{assessment.summary}</p>
      </div>

      {/* Damaged Parts */}
      <div className="card-apple p-6">
        <h3 className="font-semibold text-foreground mb-4">Damaged Parts</h3>
        <div className="space-y-3">
          {assessment.damaged_parts.map((part: DamagedPart, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`status-badge ${getSeverityClass(part.severity)}`}>
                  {part.severity}/10
                </span>
                <div>
                  <p className="font-medium text-foreground">{part.part}</p>
                  <p className="text-sm text-muted-foreground">{part.damage_type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">
                  {formatCurrency(part.cost_low)} - {formatCurrency(part.cost_high)}
                </p>
                <p className="text-xs text-muted-foreground">{part.confidence}% confidence</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Concerns */}
      {assessment.safety_concerns && assessment.safety_concerns.length > 0 && (
        <div className="card-apple p-6 border-l-4 border-l-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Safety Concerns</h3>
              <ul className="space-y-1">
                {assessment.safety_concerns.map((concern, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {concern}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Fraud Indicators */}
      {assessment.fraud_indicators && assessment.fraud_indicators.length > 0 && (
        <div className="card-apple p-6 border-l-4 border-l-destructive">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Fraud Indicators</h3>
              <ul className="space-y-1">
                {assessment.fraud_indicators.map((indicator, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {indicator}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Action Banner */}
      <div className={`card-apple p-4 border-l-4 ${
        assessment.recommended_action === 'approve' ? 'border-l-success bg-success/5' :
        assessment.recommended_action === 'escalate' ? 'border-l-destructive bg-destructive/5' :
        'border-l-warning bg-warning/5'
      }`}>
        <div className="flex items-center gap-3">
          <ShieldAlert className={`w-5 h-5 ${
            assessment.recommended_action === 'approve' ? 'text-success' :
            assessment.recommended_action === 'escalate' ? 'text-destructive' :
            'text-warning'
          }`} />
          <div>
            <p className="font-semibold text-foreground">
              AI Recommendation: {assessment.recommended_action.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">
              {assessment.recommended_action === 'approve' 
                ? 'Low severity, high confidence. Safe to approve.' 
                : assessment.recommended_action === 'escalate'
                ? 'Requires senior adjuster review due to severity, confidence, or fraud indicators.'
                : 'Manual review recommended before final decision.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="btn-success flex-1"
        >
          Approve
        </button>
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="btn-secondary flex-1"
        >
          Edit
        </button>
        <button
          onClick={onEscalate}
          disabled={isLoading}
          className="btn-destructive flex-1"
        >
          Escalate
        </button>
      </div>
    </div>
  );
}
