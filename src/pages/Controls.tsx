import { useState } from 'react';
import { useControls } from '@/hooks/useControls';
import { DEFAULT_CONTROLS } from '@/types/routing';
import { ArrowLeft, Save, RotateCcw, Clock, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Controls() {
  const navigate = useNavigate();
  const { controls, lastUpdated, isLoading, updateControl, resetToDefaults } = useControls();
  const [isSaving, setIsSaving] = useState(false);
  const [localControls, setLocalControls] = useState(controls);

  // Sync local state when controls load
  useState(() => {
    setLocalControls(controls);
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(localControls).map(([key, value]) =>
        updateControl(key as keyof typeof controls, value)
      );
      await Promise.all(updates);
      toast.success('Controls saved successfully');
    } catch (error) {
      toast.error('Failed to save controls');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetToDefaults();
      setLocalControls(DEFAULT_CONTROLS);
      toast.success('Controls reset to defaults');
    } catch (error) {
      toast.error('Failed to reset controls');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading controls...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Routing Controls</h1>
            <p className="text-muted-foreground text-sm">
              Configure thresholds and rules for claim routing decisions.
            </p>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Last updated: {formatDateTime(lastUpdated)}</span>
          </div>
        )}

        {/* Controls Form */}
        <div className="card-apple p-6 space-y-8">
          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label htmlFor="confidence_threshold" className="font-medium">
              Confidence Threshold
            </Label>
            <p className="text-xs text-muted-foreground">
              Minimum confidence score (0-1) for auto-approval consideration. Claims below this require review.
            </p>
            <Input
              id="confidence_threshold"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={localControls.confidence_threshold}
              onChange={(e) => setLocalControls(prev => ({
                ...prev,
                confidence_threshold: parseFloat(e.target.value) || 0
              }))}
              className="max-w-[200px]"
            />
          </div>

          {/* Severity Threshold */}
          <div className="space-y-2">
            <Label htmlFor="severity_threshold" className="font-medium">
              Severity Threshold
            </Label>
            <p className="text-xs text-muted-foreground">
              Severity score (1-10) at or above which claims escalate to senior review.
            </p>
            <Input
              id="severity_threshold"
              type="number"
              min={1}
              max={10}
              step={1}
              value={localControls.severity_threshold}
              onChange={(e) => setLocalControls(prev => ({
                ...prev,
                severity_threshold: parseInt(e.target.value) || 1
              }))}
              className="max-w-[200px]"
            />
          </div>

          {/* Auto Approval Cap */}
          <div className="space-y-2">
            <Label htmlFor="payout_cap_auto" className="font-medium">
              Auto-Approval Cap ($)
            </Label>
            <p className="text-xs text-muted-foreground">
              Maximum estimate amount that can be auto-approved without human review.
            </p>
            <Input
              id="payout_cap_auto"
              type="number"
              min={0}
              step={100}
              value={localControls.payout_cap_auto}
              onChange={(e) => setLocalControls(prev => ({
                ...prev,
                payout_cap_auto: parseInt(e.target.value) || 0
              }))}
              className="max-w-[200px]"
            />
          </div>

          {/* Senior Review Cap */}
          <div className="space-y-2">
            <Label htmlFor="payout_cap_senior" className="font-medium">
              Senior Review Cap ($)
            </Label>
            <p className="text-xs text-muted-foreground">
              Estimates above this amount require senior adjuster review.
            </p>
            <Input
              id="payout_cap_senior"
              type="number"
              min={0}
              step={100}
              value={localControls.payout_cap_senior}
              onChange={(e) => setLocalControls(prev => ({
                ...prev,
                payout_cap_senior: parseInt(e.target.value) || 0
              }))}
              className="max-w-[200px]"
            />
          </div>

          {/* QA Sample Rate */}
          <div className="space-y-2">
            <Label htmlFor="qa_sample_rate" className="font-medium">
              QA Sample Rate
            </Label>
            <p className="text-xs text-muted-foreground">
              Percentage (0-1) of claims randomly selected for QA review.
            </p>
            <Input
              id="qa_sample_rate"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={localControls.qa_sample_rate}
              onChange={(e) => setLocalControls(prev => ({
                ...prev,
                qa_sample_rate: parseFloat(e.target.value) || 0
              }))}
              className="max-w-[200px]"
            />
          </div>

          {/* Dual Review Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label htmlFor="dual_review_enabled" className="font-medium">
                Dual Review Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Require two reviewers to approve high-value claims.
              </p>
            </div>
            <Switch
              id="dual_review_enabled"
              checked={localControls.dual_review_enabled}
              onCheckedChange={(checked) => setLocalControls(prev => ({
                ...prev,
                dual_review_enabled: checked
              }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
