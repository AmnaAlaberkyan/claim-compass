import { Claim } from '@/types/claims';
import { Clock, CheckCircle, AlertTriangle, XCircle, FileSearch } from 'lucide-react';

interface ClaimCardProps {
  claim: Claim;
  onClick: () => void;
}

function getStatusIcon(status: Claim['status']) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'processing':
      return <FileSearch className="w-4 h-4" />;
    case 'approved':
      return <CheckCircle className="w-4 h-4" />;
    case 'review':
      return <AlertTriangle className="w-4 h-4" />;
    case 'escalated':
      return <XCircle className="w-4 h-4" />;
  }
}

function getStatusClass(status: Claim['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-muted text-muted-foreground';
    case 'processing':
      return 'bg-primary/10 text-primary';
    case 'approved':
      return 'bg-success/10 text-success';
    case 'review':
      return 'bg-warning/10 text-warning';
    case 'escalated':
      return 'bg-destructive/10 text-destructive';
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount?: number): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ClaimCard({ claim, onClick }: ClaimCardProps) {
  return (
    <div 
      className="card-apple p-5 cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{claim.policy_number}</h3>
          <p className="text-sm text-muted-foreground">{claim.claimant_name}</p>
        </div>
        <span className={`status-badge flex items-center gap-1 ${getStatusClass(claim.status)}`}>
          {getStatusIcon(claim.status)}
          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model}
        </p>
        <p className="text-muted-foreground">
          Incident: {formatDate(claim.incident_date)}
        </p>
      </div>

      {(claim.cost_low || claim.cost_high) && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Estimated Cost</span>
            <span className="font-medium text-foreground">
              {formatCurrency(claim.cost_low)} - {formatCurrency(claim.cost_high)}
            </span>
          </div>
        </div>
      )}

      {claim.severity_score !== undefined && claim.confidence_score !== undefined && (
        <div className="mt-3 flex gap-2">
          <span className={`status-badge text-xs ${
            claim.severity_score <= 3 ? 'severity-low' :
            claim.severity_score <= 5 ? 'severity-medium' :
            claim.severity_score <= 7 ? 'severity-high' : 'severity-critical'
          }`}>
            Severity: {claim.severity_score}/10
          </span>
          <span className="status-badge text-xs bg-secondary text-secondary-foreground">
            Confidence: {claim.confidence_score}%
          </span>
        </div>
      )}
    </div>
  );
}
