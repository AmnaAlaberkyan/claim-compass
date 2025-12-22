import { RoutingReason, RoutingRecommendation, RoutingStatus } from '@/types/routing';
import { getStatusLabel, getRecommendationLabel } from '@/lib/routing';
import { AlertCircle, CheckCircle2, XCircle, HelpCircle, ChevronDown } from 'lucide-react';
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

interface RoutingReasonsCardProps {
  reasons: RoutingReason[];
  recommendation?: RoutingRecommendation;
  status?: RoutingStatus;
  compact?: boolean;
}

const getReasonIcon = (code: string) => {
  if (['AUTO_APPROVABLE', 'READY_FOR_APPROVAL'].includes(code)) {
    return <CheckCircle2 className="w-4 h-4 text-success" />;
  }
  if (['FRAUD_INDICATOR', 'PAYOUT_CAP_SENIOR', 'HIGH_SEVERITY'].includes(code)) {
    return <XCircle className="w-4 h-4 text-destructive" />;
  }
  return <AlertCircle className="w-4 h-4 text-warning" />;
};

const getRecommendationColor = (rec: RoutingRecommendation) => {
  switch (rec) {
    case 'APPROVE': return 'bg-success/10 text-success border-success/20';
    case 'ESCALATE': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-warning/10 text-warning border-warning/20';
  }
};

export function RoutingReasonsCard({ reasons, recommendation, status, compact = false }: RoutingReasonsCardProps) {
  const [isOpen, setIsOpen] = useState(!compact);

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
