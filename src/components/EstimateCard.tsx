import { useState } from 'react';
import { Estimate, EstimateLineItem } from '@/types/estimates';
import { ChevronDown, ChevronUp, ExternalLink, Clock, DollarSign, Wrench } from 'lucide-react';

interface EstimateCardProps {
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
    hour: 'numeric',
    minute: '2-digit',
  });
}

function LineItemRow({ item, index }: { item: EstimateLineItem; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-4 px-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.part}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {item.damageType}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              {item.laborHours}h @ {formatCurrency(item.laborRate)}/hr
            </span>
            <span>Parts: {formatCurrency(item.partCostLow)} – {formatCurrency(item.partCostHigh)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(item.totalLow)} – {formatCurrency(item.totalHigh)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Price Sources</p>
          <div className="space-y-2">
            {item.sources.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3 h-3 text-primary group-hover:text-primary" />
                  <span className="text-sm text-foreground">{source.source}</span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(source.retrievedAt)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EstimateCard({ estimate }: EstimateCardProps) {
  return (
    <div className="card-apple overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Repair Estimate
          </h2>
          <span className="text-xs text-muted-foreground">
            Generated {formatDateTime(estimate.generatedAt)}
          </span>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Labor</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(estimate.laborTotal)}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Parts</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(estimate.partsLow)} – {formatCurrency(estimate.partsHigh)}
            </p>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-xl">
            <p className="text-xs text-primary mb-1">Total</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(estimate.grandTotalLow)} – {formatCurrency(estimate.grandTotalHigh)}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="divide-y divide-border">
        <div className="px-4 py-2 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">
            {estimate.lineItems.length} Line Item{estimate.lineItems.length !== 1 ? 's' : ''} • Tap to view sources
          </p>
        </div>
        {estimate.lineItems.map((item, index) => (
          <LineItemRow key={index} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
