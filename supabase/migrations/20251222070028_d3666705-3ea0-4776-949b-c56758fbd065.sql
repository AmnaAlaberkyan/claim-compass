-- Create controls table for routing thresholds
CREATE TABLE public.controls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo purposes
CREATE POLICY "Allow public read access to controls" 
ON public.controls FOR SELECT USING (true);

CREATE POLICY "Allow public update access to controls" 
ON public.controls FOR UPDATE USING (true);

CREATE POLICY "Allow public insert access to controls" 
ON public.controls FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_controls_updated_at
BEFORE UPDATE ON public.controls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default controls
INSERT INTO public.controls (key, value, description) VALUES
  ('confidence_threshold', '{"value": 0.75}'::jsonb, 'Minimum confidence score for auto-approval'),
  ('severity_threshold', '{"value": 7}'::jsonb, 'Severity score at or above which claims escalate'),
  ('payout_cap_senior', '{"value": 3000}'::jsonb, 'Estimate above this requires senior review'),
  ('payout_cap_auto', '{"value": 1500}'::jsonb, 'Estimate below this can be auto-approved'),
  ('dual_review_enabled', '{"value": false}'::jsonb, 'Require two reviewers for approval'),
  ('qa_sample_rate', '{"value": 0.1}'::jsonb, 'Percentage of claims to route for QA review');

-- Add routing_reasons column to claims for storing decision reasons
ALTER TABLE public.claims ADD COLUMN routing_reasons jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.claims ADD COLUMN routing_snapshot jsonb;