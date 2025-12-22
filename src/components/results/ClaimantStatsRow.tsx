import { DamageAssessment } from '@/types/claims';
import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface ClaimantStatsRowProps {
  assessment: DamageAssessment;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSeverityLabel(severity: number): string {
  if (severity <= 3) return 'Minor';
  if (severity <= 5) return 'Moderate';
  if (severity <= 7) return 'Significant';
  return 'Severe';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'High';
  if (confidence >= 70) return 'Medium';
  return 'Low';
}

export function ClaimantStatsRow({ assessment }: ClaimantStatsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Primary: Estimated Total */}
      <div className="card-apple p-5 md:col-span-1 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Estimated repair cost</span>
        </div>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(assessment.total_cost_low)} – {formatCurrency(assessment.total_cost_high)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Final cost may vary after shop inspection
        </p>
      </div>

      {/* Secondary: Confidence */}
      <div className="card-apple p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Confidence</span>
        </div>
        <p className="text-lg font-semibold text-foreground">
          {getConfidenceLabel(assessment.overall_confidence)}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({assessment.overall_confidence}%)
          </span>
        </p>
      </div>

      {/* Secondary: Severity */}
      <div className="card-apple p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Severity</span>
        </div>
        <p className="text-lg font-semibold text-foreground">
          {getSeverityLabel(assessment.overall_severity)}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({assessment.overall_severity}/10)
          </span>
        </p>
      </div>
    </div>
  );
}
