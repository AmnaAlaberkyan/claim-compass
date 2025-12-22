import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuditEvent, KPIMetrics, TimeframeFilter, getTimeframeCutoff, AUDIT_EVENT_TYPES } from '@/types/audit';

interface ClaimEvents {
  claimId: string;
  events: AuditEvent[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function timeDiffSeconds(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 1000;
}

export function useKPIs(timeframe: TimeframeFilter) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [claims, setClaims] = useState<{ id: string; status: string; created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const cutoff = getTimeframeCutoff(timeframe);
      
      // Fetch audit events
      let eventsQuery = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (cutoff) {
        eventsQuery = eventsQuery.gte('created_at', cutoff.toISOString());
      }
      
      const { data: eventsData, error: eventsError } = await eventsQuery;
      
      if (eventsError) {
        console.error('Error fetching audit events:', eventsError);
      } else {
        const transformed: AuditEvent[] = (eventsData || []).map(e => ({
          id: e.id,
          claim_id: e.claim_id || '',
          action: e.action as AuditEvent['action'],
          actor: e.actor,
          actor_type: e.actor_type as AuditEvent['actor_type'],
          details: e.details as Record<string, unknown> | null,
          created_at: e.created_at,
        }));
        setAuditEvents(transformed);
      }
      
      // Fetch claims for status counts
      let claimsQuery = supabase
        .from('claims')
        .select('id, status, created_at');
      
      if (cutoff) {
        claimsQuery = claimsQuery.gte('created_at', cutoff.toISOString());
      }
      
      const { data: claimsData, error: claimsError } = await claimsQuery;
      
      if (claimsError) {
        console.error('Error fetching claims:', claimsError);
      } else {
        setClaims(claimsData || []);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [timeframe]);

  const metrics = useMemo<KPIMetrics>(() => {
    // Group events by claim
    const eventsByClaimMap = new Map<string, AuditEvent[]>();
    auditEvents.forEach(event => {
      if (!event.claim_id) return;
      const existing = eventsByClaimMap.get(event.claim_id) || [];
      existing.push(event);
      eventsByClaimMap.set(event.claim_id, existing);
    });
    
    const claimEvents: ClaimEvents[] = Array.from(eventsByClaimMap.entries()).map(([claimId, events]) => ({
      claimId,
      events: events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));

    // Calculate timing metrics
    const uploadToAssessmentTimes: number[] = [];
    const uploadToFirstHumanTimes: number[] = [];
    const firstHumanToApprovalTimes: number[] = [];
    let retakeCount = 0;
    let qaCount = 0;
    let qaPassCount = 0;

    claimEvents.forEach(({ events }) => {
      const photoUpload = events.find(e => 
        e.action === 'photo_uploaded'
      );
      const damageAssessment = events.find(e => 
        e.action === 'damage_assessment_completed'
      );
      const firstHuman = events.find(e => 
        e.actor_type === 'human' && 
        e.action !== 'claim_created'
      );
      const approval = events.find(e => 
        ['claim_approved', 'claim_approve'].includes(e.action)
      );
      const hasRetake = events.some(e => 
        ['retake_requested', 'retake_uploaded'].includes(e.action)
      );
      const hasQA = events.some(e => 
        e.action === 'qa_sampled'
      );
      const qaCompleted = events.find(e => 
        e.action === 'qa_completed'
      );

      // Upload to assessment
      if (photoUpload && damageAssessment) {
        uploadToAssessmentTimes.push(timeDiffSeconds(photoUpload.created_at, damageAssessment.created_at));
      }

      // Upload to first human
      if (photoUpload && firstHuman) {
        uploadToFirstHumanTimes.push(timeDiffSeconds(photoUpload.created_at, firstHuman.created_at));
      }

      // First human to approval
      if (firstHuman && approval) {
        firstHumanToApprovalTimes.push(timeDiffSeconds(firstHuman.created_at, approval.created_at));
      }

      if (hasRetake) retakeCount++;
      if (hasQA) qaCount++;
      if (qaCompleted) {
        const passed = (qaCompleted.details as Record<string, unknown>)?.passed;
        if (passed === true) qaPassCount++;
      }
    });

    // Queue aging - claims >24h in specific statuses
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check audit logs for claims stuck in NEEDS_HUMAN or QA_REVIEW
    const claimsNeedingHuman = new Set<string>();
    const claimsInQA = new Set<string>();
    
    claimEvents.forEach(({ claimId, events }) => {
      // Find the last routing decision (reverse search)
      const routingDecision = [...events].reverse().find(e => 
        e.action === 'routing_decision'
      );
      const hasApproval = events.some(e => 
        ['claim_approved', 'claim_approve'].includes(e.action)
      );
      
      if (routingDecision && !hasApproval) {
        const details = routingDecision.details as Record<string, unknown>;
        const status = details?.status as string;
        const eventTime = new Date(routingDecision.created_at);
        
        if (eventTime < twentyFourHoursAgo) {
          if (status === 'NEEDS_HUMAN' || status === 'NEEDS_SECOND_REVIEW') {
            claimsNeedingHuman.add(claimId);
          }
          if (status === 'QA_REVIEW') {
            claimsInQA.add(claimId);
          }
        }
      }
    });

    const totalClaims = claims.length;
    const totalApproved = claims.filter(c => c.status === 'approved').length;
    const totalEscalated = claims.filter(c => c.status === 'escalated').length;
    const totalPending = claims.filter(c => ['pending', 'processing', 'review'].includes(c.status)).length;

    return {
      medianUploadToAssessment: median(uploadToAssessmentTimes),
      medianUploadToFirstHuman: median(uploadToFirstHumanTimes),
      medianFirstHumanToApproval: median(firstHumanToApprovalTimes),
      retakePercentage: claimEvents.length > 0 ? (retakeCount / claimEvents.length) * 100 : 0,
      qaPercentage: claimEvents.length > 0 ? (qaCount / claimEvents.length) * 100 : 0,
      qaPassRate: qaCount > 0 ? (qaPassCount / qaCount) * 100 : 0,
      queueAgingNeedsHuman: claimsNeedingHuman.size,
      queueAgingQAReview: claimsInQA.size,
      totalClaims,
      totalApproved,
      totalEscalated,
      totalPending,
    };
  }, [auditEvents, claims]);

  return { metrics, isLoading, eventCount: auditEvents.length };
}
