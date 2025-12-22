import { useState, useEffect, useMemo } from 'react';
import { 
  AuditEvent, 
  AuditFilterOptions, 
  EVENT_DISPLAY_CONFIG, 
  CATEGORY_LABELS,
  AUDIT_EVENT_TYPES 
} from '@/types/audit';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  User,
  Bot,
  Clock,
  FileText,
  Hash,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AuditTrailProps {
  claimId: string;
  claim: Record<string, unknown>;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTimeDiff(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

const ACTOR_TYPE_OPTIONS = [
  { value: 'all', label: 'All Actors' },
  { value: 'claimant', label: 'Claimant' },
  { value: 'system', label: 'System' },
  { value: 'ai_quality', label: 'AI Quality' },
  { value: 'ai_damage', label: 'AI Damage' },
  { value: 'ai_localization', label: 'AI Localization' },
  { value: 'ai_triage', label: 'AI Triage' },
  { value: 'adjuster', label: 'Adjuster' },
  { value: 'human', label: 'Human' },
];

const EVENT_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'lifecycle', label: 'Claim Lifecycle' },
  { value: 'photo', label: 'Photo' },
  { value: 'ai', label: 'AI Pipeline' },
  { value: 'routing', label: 'Routing' },
  { value: 'verification', label: 'Verification' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'decision', label: 'Decision' },
  { value: 'qa', label: 'QA' },
  { value: 'admin', label: 'Admin' },
  { value: 'export', label: 'Export' },
];

export function AuditTrail({ claimId, claim }: AuditTrailProps) {
  const { auditLogs, isLoading, fetchAuditLogs, exportAuditLog } = useAuditLog(claimId);
  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filteredLogs = useMemo(() => {
    let logs = auditLogs;

    // Filter by actor type
    if (actorFilter !== 'all') {
      logs = logs.filter(log => log.actor_type === actorFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      logs = logs.filter(log => {
        const config = EVENT_DISPLAY_CONFIG[log.event_type];
        return config?.category === categoryFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(log => 
        log.event_type.toLowerCase().includes(query) ||
        log.actor_type.toLowerCase().includes(query) ||
        (log.actor_id && log.actor_id.toLowerCase().includes(query)) ||
        JSON.stringify(log.payload).toLowerCase().includes(query)
      );
    }

    return logs;
  }, [auditLogs, actorFilter, categoryFilter, searchQuery]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await exportAuditLog(claim);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${claimId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportData.audit_events.length} audit events`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export audit log');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActorFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = searchQuery || actorFilter !== 'all' || categoryFilter !== 'all';

  const getEventConfig = (eventType: string) => {
    return EVENT_DISPLAY_CONFIG[eventType] || {
      label: eventType.replace(/_/g, ' '),
      icon: 'FileText',
      color: 'text-muted-foreground',
      category: 'lifecycle',
    };
  };

  return (
    <div className="space-y-4">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredLogs.length} of {auditLogs.length} events
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting || auditLogs.length === 0}
          className="gap-1"
        >
          <Download className="w-3 h-3" />
          Export JSON
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            {ACTOR_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2 text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Event List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading audit trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{auditLogs.length === 0 ? 'No audit events recorded yet' : 'No events match your filters'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log, index) => {
            const config = getEventConfig(log.event_type);
            const isExpanded = expandedEvents.has(log.id);
            const isAI = log.actor_type.startsWith('ai_') || log.actor_type === 'system';
            const hasDetails = log.payload && Object.keys(log.payload).length > 0;
            const hasSnapshots = log.snapshots && (log.snapshots.before_json || log.snapshots.after_json);
            const hasMetrics = log.metrics && Object.keys(log.metrics).length > 0;

            return (
              <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleEventExpanded(log.id)}>
                <div className={`border rounded-lg ${isExpanded ? 'border-primary/30' : 'border-border'} bg-card`}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors">
                      {/* Actor icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isAI ? 'bg-secondary' : 'bg-primary/10'
                      }`}>
                        {isAI 
                          ? <Bot className="w-4 h-4 text-muted-foreground" />
                          : <User className="w-4 h-4 text-primary" />
                        }
                      </div>

                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {log.actor_type.replace(/_/g, ' ')}
                          </Badge>
                          {log.actor_id && (
                            <span className="text-xs text-muted-foreground">
                              by {log.actor_id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(log.timestamp)}</span>
                          <span className="opacity-50">({formatTimeDiff(log.timestamp)})</span>
                        </div>
                        
                        {/* Quick metrics preview */}
                        {hasMetrics && !isExpanded && (
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {log.metrics?.quality_score !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                Quality: {log.metrics.quality_score}
                              </Badge>
                            )}
                            {log.metrics?.confidence !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                Confidence: {log.metrics.confidence}%
                              </Badge>
                            )}
                            {log.metrics?.severity !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                Severity: {log.metrics.severity}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expand indicator */}
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
                      {/* Model info */}
                      {(log.model_provider || log.model_name) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Model</p>
                          <Badge variant="outline" className="text-xs">
                            {log.model_provider && `${log.model_provider}/`}{log.model_name}
                            {log.model_version && ` v${log.model_version}`}
                          </Badge>
                        </div>
                      )}

                      {/* Metrics */}
                      {hasMetrics && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Metrics</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(log.metrics!).map(([key, value]) => (
                              <div key={key} className="bg-muted rounded px-2 py-1">
                                <p className="text-xs text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                                <p className="text-sm font-medium">{typeof value === 'number' ? value.toLocaleString() : String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decision */}
                      {log.decision && Object.keys(log.decision).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Decision</p>
                          <div className="bg-muted rounded p-2">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.decision, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Payload */}
                      {hasDetails && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Payload</p>
                          <div className="bg-muted rounded p-2 max-h-48 overflow-auto">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Snapshots */}
                      {hasSnapshots && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {log.snapshots?.before_json && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
                              <div className="bg-muted rounded p-2 max-h-32 overflow-auto">
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.snapshots.before_json, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {log.snapshots?.after_json && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
                              <div className="bg-muted rounded p-2 max-h-32 overflow-auto">
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.snapshots.after_json, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hash chain info */}
                      {(log.event_hash || log.prev_event_hash) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Integrity
                          </p>
                          <div className="text-xs font-mono text-muted-foreground space-y-0.5">
                            {log.prev_event_hash && (
                              <p className="truncate">prev: {log.prev_event_hash.slice(0, 16)}...</p>
                            )}
                            {log.event_hash && (
                              <p className="truncate">hash: {log.event_hash.slice(0, 16)}...</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
