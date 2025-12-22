import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AuditEvent, 
  CreateAuditEventInput, 
  AuditExport,
  AuditFilterOptions,
  AUDIT_EVENT_TYPES 
} from '@/types/audit';

// Simple hash function for browser (SHA-256 not available synchronously)
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAuditLog(claimId: string) {
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async (filters?: AuditFilterOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('claim_id', claimId)
        .order('timestamp', { ascending: true });

      if (filters?.event_types && filters.event_types.length > 0) {
        query = query.in('event_type', filters.event_types);
      }

      if (filters?.actor_types && filters.actor_types.length > 0) {
        query = query.in('actor_type', filters.actor_types);
      }

      if (filters?.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedLogs: AuditEvent[] = (data || []).map(log => ({
        id: log.id,
        claim_id: log.claim_id || '',
        timestamp: log.timestamp,
        event_type: log.event_type,
        actor_type: log.actor_type,
        actor_id: log.actor_id,
        session_id: log.session_id,
        request_id: log.request_id,
        model_provider: log.model_provider,
        model_name: log.model_name,
        model_version: log.model_version,
        inputs_ref: log.inputs_ref as AuditEvent['inputs_ref'],
        metrics: log.metrics as AuditEvent['metrics'],
        decision: log.decision as AuditEvent['decision'],
        snapshots: log.snapshots as AuditEvent['snapshots'],
        payload: (log.payload as Record<string, unknown>) || {},
        prev_event_hash: log.prev_event_hash,
        event_hash: log.event_hash,
        created_at: log.created_at,
      }));

      // Apply text search filter client-side
      let filteredLogs = transformedLogs;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLogs = transformedLogs.filter(log => 
          log.event_type.toLowerCase().includes(searchLower) ||
          log.actor_type.toLowerCase().includes(searchLower) ||
          (log.actor_id && log.actor_id.toLowerCase().includes(searchLower)) ||
          JSON.stringify(log.payload).toLowerCase().includes(searchLower)
        );
      }

      setAuditLogs(filteredLogs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [claimId]);

  const logEvent = useCallback(async (input: Omit<CreateAuditEventInput, 'claim_id'>) => {
    try {
      // Get the last event hash for chain integrity
      const { data: lastEvent } = await supabase
        .from('audit_logs')
        .select('event_hash')
        .eq('claim_id', claimId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevEventHash = lastEvent?.event_hash || null;

      // Create the event record (without hashes for now)
      const eventRecord = {
        claim_id: claimId,
        timestamp: new Date().toISOString(),
        event_type: input.event_type,
        actor_type: input.actor_type,
        actor_id: input.actor_id || null,
        session_id: input.session_id || null,
        request_id: input.request_id || null,
        model_provider: input.model?.provider || null,
        model_name: input.model?.name || null,
        model_version: input.model?.version || null,
        inputs_ref: input.inputs_ref || null,
        metrics: input.metrics || null,
        decision: input.decision || null,
        snapshots: input.snapshots || null,
        payload: input.payload || {},
        prev_event_hash: prevEventHash,
      };

      // Compute hash for tamper evidence
      const hashInput = (prevEventHash || '') + JSON.stringify(eventRecord);
      const eventHash = await computeHash(hashInput);

      const { error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          ...eventRecord,
          event_hash: eventHash,
        });

      if (insertError) throw insertError;

      // Refresh logs after insert
      await fetchAuditLogs();
    } catch (err) {
      console.error('Failed to log audit event:', err);
      throw err;
    }
  }, [claimId, fetchAuditLogs]);

  const exportAuditLog = useCallback(async (claim: Record<string, unknown>): Promise<AuditExport> => {
    // Fetch all logs for export (no filters)
    const { data: allLogs, error: fetchError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('claim_id', claimId)
      .order('timestamp', { ascending: true });

    if (fetchError) throw fetchError;

    const transformedLogs: AuditEvent[] = (allLogs || []).map(log => ({
      id: log.id,
      claim_id: log.claim_id || '',
      timestamp: log.timestamp,
      event_type: log.event_type,
      actor_type: log.actor_type,
      actor_id: log.actor_id,
      session_id: log.session_id,
      request_id: log.request_id,
      model_provider: log.model_provider,
      model_name: log.model_name,
      model_version: log.model_version,
      inputs_ref: log.inputs_ref as AuditEvent['inputs_ref'],
      metrics: log.metrics as AuditEvent['metrics'],
      decision: log.decision as AuditEvent['decision'],
      snapshots: log.snapshots as AuditEvent['snapshots'],
      payload: (log.payload as Record<string, unknown>) || {},
      prev_event_hash: log.prev_event_hash,
      event_hash: log.event_hash,
      created_at: log.created_at,
    }));

    const exportData: AuditExport = {
      claim_id: claimId,
      exported_at: new Date().toISOString(),
      exported_by: {
        actor_type: 'adjuster',
        actor_id: 'current_user', // TODO: get from auth context
      },
      claim_snapshot: claim,
      audit_events: transformedLogs,
    };

    // Log the export event
    await logEvent({
      event_type: AUDIT_EVENT_TYPES.AUDIT_EXPORTED,
      actor_type: 'adjuster',
      actor_id: 'current_user',
      payload: {
        events_count: transformedLogs.length,
        export_format: 'json',
      },
    });

    return exportData;
  }, [claimId, logEvent]);

  return {
    auditLogs,
    isLoading,
    error,
    fetchAuditLogs,
    logEvent,
    exportAuditLog,
  };
}
