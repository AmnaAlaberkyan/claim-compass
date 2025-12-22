-- Drop and recreate audit_logs table with full schema
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  session_id TEXT,
  request_id TEXT,
  model_provider TEXT,
  model_name TEXT,
  model_version TEXT,
  inputs_ref JSONB,
  metrics JSONB,
  decision JSONB,
  snapshots JSONB,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_event_hash TEXT,
  event_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast claim lookups
CREATE INDEX idx_audit_logs_claim_id ON public.audit_logs(claim_id);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_actor_type ON public.audit_logs(actor_type);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit logs (read and insert only - never update/delete)
CREATE POLICY "Allow public read access to audit logs"
ON public.audit_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);