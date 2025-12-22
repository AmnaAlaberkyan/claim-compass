import { supabase } from '@/integrations/supabase/client';

// Simple hash function for browser (SHA-256)
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface LogAuditEventInput {
  claim_id: string | null;
  event_type: string;
  actor_type: string;
  actor_id?: string | null;
  model?: {
    provider?: string | null;
    name?: string | null;
    version?: string | null;
  };
  metrics?: Record<string, unknown> | null;
  decision?: Record<string, unknown> | null;
  snapshots?: {
    before_json?: object | null;
    after_json?: object | null;
  } | null;
  payload?: Record<string, unknown>;
}

/**
 * Log an audit event to the audit_logs table.
 * This is the single utility function used everywhere for consistent audit logging.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    // Get the last event hash for chain integrity (if claim_id provided)
    let prevEventHash: string | null = null;
    
    if (input.claim_id) {
      const { data: lastEvent } = await supabase
        .from('audit_logs')
        .select('event_hash')
        .eq('claim_id', input.claim_id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      prevEventHash = lastEvent?.event_hash || null;
    }

    // Create the event record
    const eventRecord = {
      claim_id: input.claim_id,
      timestamp: new Date().toISOString(),
      event_type: input.event_type,
      actor_type: input.actor_type,
      actor_id: input.actor_id || null,
      model_provider: input.model?.provider || null,
      model_name: input.model?.name || null,
      model_version: input.model?.version || null,
      metrics: input.metrics ? JSON.parse(JSON.stringify(input.metrics)) : null,
      decision: input.decision ? JSON.parse(JSON.stringify(input.decision)) : null,
      snapshots: input.snapshots ? JSON.parse(JSON.stringify(input.snapshots)) : null,
      payload: input.payload ? JSON.parse(JSON.stringify(input.payload)) : {},
      prev_event_hash: prevEventHash,
    };

    // Compute hash for tamper evidence
    const hashInput = (prevEventHash || '') + JSON.stringify(eventRecord);
    const eventHash = await computeHash(hashInput);

    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...eventRecord,
        event_hash: eventHash,
      }]);

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Error in logAuditEvent:', err);
  }
}

/**
 * Helper to log verification actions (parts and boxes)
 */
export async function logVerificationAction(
  claimId: string,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    claim_id: claimId,
    event_type: eventType,
    actor_type: 'adjuster',
    actor_id: 'Adjuster',
    payload: details,
    snapshots: {
      before_json: details.before as object | null,
      after_json: details.after as object | null,
    },
  });
}
