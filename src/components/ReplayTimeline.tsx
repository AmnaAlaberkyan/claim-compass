import { useState } from 'react';
import { AuditLog } from '@/types/claims';
import { ChevronDown, ChevronRight, Clock, User, Bot, Cpu, Server, Code, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplayTimelineProps {
  logs: AuditLog[];
}

// Event type display configuration
const EVENT_CONFIG: Record<string, { label: string; color: string }> = {
  // Intake events
  claim_created: { label: 'Claim Created', color: 'bg-muted text-muted-foreground' },
  intake_preference_set: { label: 'Intake Preference Set', color: 'bg-secondary text-secondary-foreground' },
  human_review_requested: { label: 'Human Review Requested', color: 'bg-warning/10 text-warning' },
  photo_uploaded: { label: 'Photo Uploaded', color: 'bg-secondary text-secondary-foreground' },
  
  // AI Processing events
  quality_assessment_completed: { label: 'Quality Assessment', color: 'bg-primary/10 text-primary' },
  damage_assessment_completed: { label: 'Damage Assessment', color: 'bg-primary/10 text-primary' },
  localization_completed: { label: 'Damage Localization', color: 'bg-primary/10 text-primary' },
  estimate_created: { label: 'Estimate Created', color: 'bg-primary/10 text-primary' },
  triage_decision: { label: 'Triage Decision', color: 'bg-accent/10 text-accent-foreground' },
  retake_requested: { label: 'Retake Requested', color: 'bg-warning/10 text-warning' },
  
  // Routing events
  routing_decision: { label: 'Routing Decision', color: 'bg-accent/10 text-accent-foreground' },
  
  // Verification events
  part_verified: { label: 'Part Verified', color: 'bg-success/10 text-success' },
  part_rejected: { label: 'Part Rejected', color: 'bg-destructive/10 text-destructive' },
  part_edited: { label: 'Part Edited', color: 'bg-warning/10 text-warning' },
  evidence_linked: { label: 'Evidence Linked', color: 'bg-secondary text-secondary-foreground' },
  box_verified: { label: 'Box Verified', color: 'bg-success/10 text-success' },
  box_rejected: { label: 'Box Rejected', color: 'bg-destructive/10 text-destructive' },
  box_edited: { label: 'Box Edited', color: 'bg-warning/10 text-warning' },
  box_marked_uncertain: { label: 'Box Marked Uncertain', color: 'bg-warning/10 text-warning' },
  
  // Decision events
  claim_approved: { label: 'Claim Approved', color: 'bg-success/10 text-success' },
  claim_approve: { label: 'Claim Approved', color: 'bg-success/10 text-success' },
  claim_review: { label: 'Marked for Review', color: 'bg-warning/10 text-warning' },
  claim_escalated: { label: 'Claim Escalated', color: 'bg-destructive/10 text-destructive' },
  claim_escalate: { label: 'Claim Escalated', color: 'bg-destructive/10 text-destructive' },
  
  // QA events
  qa_sampled: { label: 'QA Sampled', color: 'bg-accent/10 text-accent-foreground' },
  qa_completed: { label: 'QA Completed', color: 'bg-success/10 text-success' },
  
  // Legacy/misc
  ai_assessment_complete: { label: 'AI Assessment Complete', color: 'bg-primary/10 text-primary' },
  verification_updated: { label: 'Verification Updated', color: 'bg-secondary text-secondary-foreground' },
  estimate_updated: { label: 'Estimate Updated', color: 'bg-warning/10 text-warning' },
  manager_action: { label: 'Manager Action', color: 'bg-accent/10 text-accent-foreground' },
  controls_updated: { label: 'Controls Updated', color: 'bg-warning/10 text-warning' },
};

function getActorIcon(actorType: string) {
  switch (actorType) {
    case 'human':
      return <User className="w-4 h-4" />;
    case 'ai_quality':
    case 'ai_damage':
    case 'ai_triage':
      return <Bot className="w-4 h-4" />;
    case 'system':
      return <Server className="w-4 h-4" />;
    default:
      return <Cpu className="w-4 h-4" />;
  }
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function JsonDiffView({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  if (!before && !after) return null;
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-3">
      {before && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Before</p>
          <pre className="text-xs bg-destructive/5 p-2 rounded overflow-auto max-h-40 border border-destructive/20">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {after && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">After</p>
          <pre className="text-xs bg-success/5 p-2 rounded overflow-auto max-h-40 border border-success/20">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function EventCard({ log, isExpanded, onToggle }: { log: AuditLog; isExpanded: boolean; onToggle: () => void }) {
  const config = EVENT_CONFIG[log.action] || { label: log.action.replace(/_/g, ' '), color: 'bg-muted text-muted-foreground' };
  const details = log.details as Record<string, unknown> | undefined;
  const modelVersion = details?.model_version as string | undefined;
  const confidence = details?.confidence as number | undefined;
  const severity = details?.severity as number | undefined;
  const beforeJson = details?.before_json || details?.before;
  const afterJson = details?.after_json || details?.after;
  const hasDiff = beforeJson || afterJson;

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline connector */}
      <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border last:hidden" />
      
      {/* Timeline dot */}
      <div className={cn(
        "absolute left-0 top-2 w-6 h-6 rounded-full flex items-center justify-center",
        log.actor_type === 'human' ? 'bg-primary/10' : 'bg-secondary'
      )}>
        {getActorIcon(log.actor_type)}
      </div>
      
      {/* Event content */}
      <div className="card-apple p-4">
        <button 
          onClick={onToggle}
          className="w-full flex items-start justify-between gap-2 text-left"
        >
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", config.color)}>
                {config.label}
              </span>
              {modelVersion && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  {modelVersion}
                </span>
              )}
              {confidence !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Conf: {(confidence * 100).toFixed(0)}%
                </span>
              )}
              {severity !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Sev: {severity}/10
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{log.actor}</span>
              <span className="text-xs">•</span>
              <Clock className="w-3 h-3" />
              <span className="text-xs">{formatDateTime(log.created_at)}</span>
            </div>
          </div>
          
          {details && (
            <div className="flex-shrink-0 text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          )}
        </button>
        
        {isExpanded && details && (
          <div className="mt-4 pt-4 border-t border-border">
            {hasDiff ? (
              <JsonDiffView 
                before={beforeJson as Record<string, unknown>} 
                after={afterJson as Record<string, unknown>} 
              />
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Payload</p>
                <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-60 border">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReplayTimeline({ logs }: ReplayTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sort logs by timestamp ascending for timeline view
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (sortedLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No events recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {sortedLogs.map(log => (
        <EventCard
          key={log.id}
          log={log}
          isExpanded={expandedIds.has(log.id)}
          onToggle={() => toggleExpanded(log.id)}
        />
      ))}
    </div>
  );
}
