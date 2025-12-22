import { useState } from 'react';
import { Estimate, EstimateLineItem } from '@/types/estimates';
import { ChevronDown, ChevronUp, ExternalLink, Clock, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ClaimantEstimateCardProps {
  estimate: Estimate;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function LineItemRow({ item }: { item: EstimateLineItem }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.part}</span>
            <span className="text-xs text-muted-foreground">
              {item.damageType}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(item.totalLow)} – {formatCurrency(item.totalHigh)}
          </span>
          {item.sources.length > 0 && (
            <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="w-3 h-3" />
                  Sources ({item.sources.length})
                  {sourcesOpen ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {item.sources.length > 0 && (
        <Collapsible open={sourcesOpen}>
          <CollapsibleContent>
            <div className="mt-3 space-y-2 pl-4">
              {item.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 text-primary" />
                    <span className="text-sm text-foreground">{source.source}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(source.retrievedAt)}
                  </span>
                </a>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function ClaimantEstimateCard({ estimate }: ClaimantEstimateCardProps) {
  return (
    <div className="card-apple overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Estimated repair cost</h2>
        </div>

        {/* Total prominently */}
        <div className="text-center p-4 bg-primary/5 rounded-xl mb-4">
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(estimate.grandTotalLow)} – {formatCurrency(estimate.grandTotalHigh)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Final cost may vary after shop inspection
          </p>
        </div>
      </div>

      {/* Line Items - simplified */}
      <div className="px-6 py-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          {estimate.lineItems.length} repair item{estimate.lineItems.length !== 1 ? 's' : ''}
        </p>
        <div className="space-y-0">
          {estimate.lineItems.map((item, index) => (
            <LineItemRow key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
