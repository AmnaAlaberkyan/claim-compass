-- Create enum for claim status
CREATE TYPE claim_status AS ENUM ('pending', 'processing', 'approved', 'review', 'escalated');

-- Create claims table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_number TEXT NOT NULL,
  claimant_name TEXT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  incident_date DATE NOT NULL,
  incident_description TEXT NOT NULL,
  status claim_status NOT NULL DEFAULT 'pending',
  photo_url TEXT,
  quality_score INTEGER,
  quality_issues JSONB,
  damage_assessment JSONB,
  ai_summary TEXT,
  ai_recommendation TEXT,
  severity_score INTEGER,
  confidence_score INTEGER,
  cost_low DECIMAL(10,2),
  cost_high DECIMAL(10,2),
  safety_concerns TEXT[],
  fraud_indicators TEXT[],
  adjuster_decision TEXT,
  adjuster_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table for 100% audit logging
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('ai_quality', 'ai_damage', 'ai_triage', 'human')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for demo - no auth required)
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a demo app without auth)
CREATE POLICY "Allow public read access to claims" 
ON public.claims FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to claims" 
ON public.claims FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to claims" 
ON public.claims FOR UPDATE 
USING (true);

CREATE POLICY "Allow public read access to audit_logs" 
ON public.audit_logs FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to audit_logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_created_at ON public.claims(created_at DESC);
CREATE INDEX idx_audit_logs_claim_id ON public.audit_logs(claim_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);