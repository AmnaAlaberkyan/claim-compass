import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useControls } from '@/hooks/useControls';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { DEFAULT_CONTROLS } from '@/types/routing';
import { ThresholdTooltip, AboutThresholdsDialog } from '@/components/ThresholdTooltip';
import { 
  ArrowLeft, Save, RotateCcw, Clock, Settings2, 
  Cpu, RefreshCw, Users, TrendingUp, Timer, CheckCircle,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Mock model info
const MODEL_INFO = {
  name: 'damage-detect-v2.3.1',
  lastRetrained: '2025-12-15',
  pendingUpdate: 'damage-detect-v2.4.0',
  pendingUpdateDate: '2025-12-20',
};

export default function Controls() {
  const navigate = useNavigate();
  const { controls, lastUpdated, isLoading, updateControl, resetToDefaults } = useControls();
  const { metrics: teamMetrics, isLoading: metricsLoading } = useTeamMetrics('7d');
  const [isSaving, setIsSaving] = useState(false);
  const [localControls, setLocalControls] = useState(controls);

  // Sync local state when controls load
  useEffect(() => {
    setLocalControls(controls);
  }, [controls]);

  const logManagerAction = async (eventType: string, details: Record<string, unknown>) => {
    const payload = JSON.parse(JSON.stringify({
      timestamp: new Date().toISOString(),
      ...details,
    }));
    const snapshots = details.before && details.after ? JSON.parse(JSON.stringify({
      before_json: details.before,
      after_json: details.after,
    })) : null;
    await supabase.from('audit_logs').insert([{
      claim_id: null,
      event_type: eventType,
      actor_type: 'manager',
      actor_id: 'Manager',
      payload,
      snapshots,
    }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Log the before state
      const beforeControls = { ...controls };
      
      const updates = Object.entries(localControls).map(([key, value]) =>
        updateControl(key as keyof typeof controls, value)
      );
      await Promise.all(updates);

      // Log the change
      await logManagerAction('controls_updated', {
        before: beforeControls,
        after: localControls,
      });

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
      const beforeControls = { ...localControls };
      await resetToDefaults();
      setLocalControls(DEFAULT_CONTROLS);

      await logManagerAction('controls_reset', {
        before: beforeControls,
        after: DEFAULT_CONTROLS,
      });

      toast.success('Controls reset to defaults');
    } catch (error) {
      toast.error('Failed to reset controls');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewModelUpdate = async () => {
    await logManagerAction('model_update_review_opened', {
      current_model: MODEL_INFO.name,
      pending_model: MODEL_INFO.pendingUpdate,
    });
    toast.info('Model update review opened (demo)');
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
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Controls</h1>
            <p className="text-muted-foreground text-sm">
              Configure routing thresholds, model settings, and view team metrics.
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

        {/* Team Metrics (7 days) */}
        <div className="card-apple p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Team Metrics (Last 7 Days)</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Claims Processed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metricsLoading ? '—' : teamMetrics.claimsProcessed || 342}
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">AI Auto-Approved</span>
              </div>
              <p className="text-2xl font-bold text-success">
                {metricsLoading ? '—' : `${teamMetrics.aiAutoApprovedRate.toFixed(0)}%`}
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Override Rate</span>
              </div>
              <p className="text-2xl font-bold text-warning">
                {metricsLoading ? '—' : `${teamMetrics.overrideRate.toFixed(0)}%`}
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Timer className="w-4 h-4" />
                <span className="text-xs">Avg Touch Time</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metricsLoading ? '—' : `${teamMetrics.avgTouchTimeMinutes.toFixed(1)} min`}
              </p>
            </div>
          </div>
        </div>

        {/* Model Controls */}
        <div className="card-apple p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Model Controls</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-foreground">Current Model</p>
                <p className="text-sm text-muted-foreground">{MODEL_INFO.name}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">Active</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-foreground">Last Retrained</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(MODEL_INFO.lastRetrained).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-foreground">Pending Update</p>
                <p className="text-sm text-muted-foreground">
                  {MODEL_INFO.pendingUpdate} • Ready since Dec 20, 2025
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReviewModelUpdate}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Review Update
              </Button>
            </div>
          </div>
        </div>

        {/* Escalation Thresholds */}
        <div className="card-apple p-6 space-y-8">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Escalation Thresholds</h2>
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="confidence_threshold" className="font-medium">
                Confidence Threshold
              </Label>
              <ThresholdTooltip value={localControls.confidence_threshold} showHelpLink />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum confidence score (0-1) for auto-approval consideration. Claims below this require review.
            </p>
            <div className="flex items-center gap-3">
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
              <span className="text-sm text-muted-foreground">
                ({Math.round(localControls.confidence_threshold * 100)}%)
              </span>
            </div>
            <div className="mt-2">
              <AboutThresholdsDialog />
            </div>
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

          {/* Auto Approval Cap (Estimate Ceiling) */}
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
