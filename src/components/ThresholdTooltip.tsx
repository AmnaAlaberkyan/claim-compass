import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ThresholdTooltipProps {
  value?: number;
  showHelpLink?: boolean;
}

export function ThresholdTooltip({ value, showHelpLink = false }: ThresholdTooltipProps) {
  const displayValue = value !== undefined ? `${Math.round(value * 100)}%` : '70%';
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">
            Default threshold set at {displayValue} based on pilot calibration. Adjustable by admin.
          </p>
          {showHelpLink && (
            <AboutThresholdsDialog />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AboutThresholdsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary mt-1">
          Learn more about thresholds →
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>About Confidence Thresholds</DialogTitle>
          <DialogDescription>
            How we calibrate auto-approval decisions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">70% is an initial hypothesis</strong>; during pilot we will A/B test 
            60/70/80% to optimize override rate without increasing supplements.
          </p>
          
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-foreground">Threshold Impact</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Lower threshold (60%)</strong>: More auto-approvals, potentially higher supplement rate</li>
              <li><strong>Current threshold (70%)</strong>: Balanced approach based on pilot data</li>
              <li><strong>Higher threshold (80%)</strong>: Fewer auto-approvals, more human review workload</li>
            </ul>
          </div>
          
          <p>
            The optimal threshold depends on your organization's risk tolerance and the relative 
            cost of human review vs. supplement claims. We recommend starting at 70% and adjusting 
            based on observed outcomes.
          </p>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-foreground mb-2">Pilot Metrics to Track</h4>
            <ul className="space-y-1 text-xs">
              <li>• Auto-approval rate (target: 55-65%)</li>
              <li>• Override rate (target: &lt;15%)</li>
              <li>• Supplement rate on auto-approved claims (target: &lt;5%)</li>
              <li>• Average touch time reduction (target: 40%+)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
