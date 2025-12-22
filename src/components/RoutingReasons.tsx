import { RoutingReason, RoutingRecommendation, RoutingStatus } from '@/types/routing';
import { getStatusLabel, getRecommendationLabel } from '@/lib/routing';
import { AlertCircle, CheckCircle2, XCircle, HelpCircle, ChevronDown, AlertTriangle, Info, Shield } from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface RoutingReasonsCardProps {
  reasons: RoutingReason[];
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  compact?: boolean;
  variant?: 'claimant' | 'adjuster';
}

const getReasonIcon = (code: string) => {
  if (['AUTO_APPROVABLE', 'READY_FOR_APPROVAL'].includes(code)) {
    return <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />;
  }
  if (['FRAUD_INDICATOR', 'PAYOUT_CAP_SENIOR', 'HIGH_SEVERITY'].includes(code)) {
    return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
  }
  if (['SAFETY_CONCERN'].includes(code)) {
    return <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />;
  }
  if (['MISSING_EVIDENCE', 'QUALITY_ISSUES'].includes(code)) {
    return <Info className="w-4 h-4 text-primary flex-shrink-0" />;
  }
  return <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />;
};

// Convert technical messages to human-friendly bullets
const getHumanFriendlyMessage = (code: string, message: string): { icon: React.ReactNode; shortLabel: string; detail: string } => {
  const codeMap: Record<string, { icon: React.ReactNode; shortLabel: string; detailPrefix: string }> = {
    'SAFETY_CONCERN': { 
      icon: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
      shortLabel: 'Safety',
      detailPrefix: ''
    },
    'MISSING_EVIDENCE': { 
      icon: <Info className="w-4 h-4 text-primary flex-shrink-0" />,
      shortLabel: 'Evidence',
      detailPrefix: ''
    },
    'HUMAN_REQUESTED': { 
      icon: <Shield className="w-4 h-4 text-primary flex-shrink-0" />,
      shortLabel: 'Policy',
      detailPrefix: 'Human review was requested'
    },
    'LOW_CONFIDENCE': { 
      icon: <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />,
      shortLabel: 'Confidence',
      detailPrefix: ''
    },
    'HIGH_SEVERITY': { 
      icon: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
      shortLabel: 'Severity',
      detailPrefix: ''
    },
    'PAYOUT_CAP': { 
      icon: <Shield className="w-4 h-4 text-primary flex-shrink-0" />,
      shortLabel: 'Policy',
      detailPrefix: 'Claim exceeds automatic approval threshold'
    },
    'PAYOUT_CAP_SENIOR': { 
      icon: <Shield className="w-4 h-4 text-warning flex-shrink-0" />,
      shortLabel: 'Policy',
      detailPrefix: 'Requires senior adjuster review'
    },
    'AUTO_APPROVABLE': { 
      icon: <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />,
      shortLabel: 'Approved',
      detailPrefix: 'Claim meets all criteria for automatic approval'
    },
    'DUAL_REVIEW_REQUIRED': { 
      icon: <Shield className="w-4 h-4 text-primary flex-shrink-0" />,
      shortLabel: 'Policy',
      detailPrefix: 'Dual review required per policy'
    },
    'QA_SAMPLE': { 
      icon: <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      shortLabel: 'QA',
      detailPrefix: 'Selected for quality assurance review'
    },
    'FRAUD_INDICATOR': { 
      icon: <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />,
      shortLabel: 'Review',
      detailPrefix: 'Additional verification needed'
    },
    'QUALITY_ISSUES': { 
      icon: <Info className="w-4 h-4 text-primary flex-shrink-0" />,
      shortLabel: 'Photo',
      detailPrefix: ''
    },
  };

  const mapped = codeMap[code];
  if (mapped) {
    return {
      icon: mapped.icon,
      shortLabel: mapped.shortLabel,
      detail: mapped.detailPrefix || message,
    };
  }

  return {
    icon: getReasonIcon(code),
    shortLabel: 'Info',
    detail: message,
  };
};

const getRecommendationColor = (rec: RoutingRecommendation) => {
  switch (rec) {
    case 'APPROVE': return 'bg-success/10 text-success border-success/20';
    case 'ESCALATE': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-warning/10 text-warning border-warning/20';
  }
};

export function RoutingReasonsCard({ reasons, recommendation, status, compact = false, variant = 'adjuster' }: RoutingReasonsCardProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why?</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            {recommendation && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRecommendationColor(recommendation)}`}>
                {getRecommendationLabel(recommendation)}
              </div>
            )}
            <ul className="space-y-1">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs">
                  {getReasonIcon(reason.code)}
                  <span>{reason.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Claimant-friendly bullet format
  if (variant === 'claimant') {
    return (
      <div className="card-apple overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Why this routing</span>
                {recommendation && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRecommendationColor(recommendation)}`}>
                    {getRecommendationLabel(recommendation)}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-border">
              <ul className="space-y-3 mt-3">
                {reasons.map((reason, idx) => {
                  const friendly = getHumanFriendlyMessage(reason.code, reason.message);
                  return (
                    <li key={idx} className="flex items-start gap-3">
                      {friendly.icon}
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {friendly.shortLabel}
                        </span>
                        <p className="text-sm text-foreground mt-0.5">
                          {friendly.detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              
              {/* View details disclosure */}
              <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded} className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                    {detailsExpanded ? 'Hide details' : 'View details'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                    {status && (
                      <p>Status: <span className="font-medium text-foreground">{getStatusLabel(status)}</span></p>
                    )}
                    <p className="text-xs">
                      {reasons.map(r => r.message).join(' • ')}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Adjuster format (original)
  return (
    <div className="card-apple overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Why this was routed</span>
              {recommendation && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRecommendationColor(recommendation)}`}>
                  {getRecommendationLabel(recommendation)}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-border">
            {status && (
              <p className="text-sm text-muted-foreground mt-3 mb-3">
                Status: <span className="font-medium text-foreground">{getStatusLabel(status)}</span>
              </p>
            )}
            <ul className="space-y-2">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {getReasonIcon(reason.code)}
                  <span className="text-sm text-foreground">{reason.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface RoutingWhyBadgeProps {
  reasons: RoutingReason[];
  recommendation?: RoutingRecommendation;
}

export function RoutingWhyBadge({ reasons, recommendation }: RoutingWhyBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <HelpCircle className="w-3 h-3" />
          Why
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        <div className="space-y-2">
          {recommendation && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRecommendationColor(recommendation)}`}>
              {getRecommendationLabel(recommendation)}
            </div>
          )}
          <ul className="space-y-1.5">
            {reasons.slice(0, 3).map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs">
                {getReasonIcon(reason.code)}
                <span>{reason.message}</span>
              </li>
            ))}
            {reasons.length > 3 && (
              <li className="text-xs text-muted-foreground">
                +{reasons.length - 3} more reasons
              </li>
            )}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
