-- Create estimates table for storing pricing estimates with citations
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching claims table pattern)
CREATE POLICY "Allow public read access to estimates"
ON public.estimates
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to estimates"
ON public.estimates
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups by claim_id
CREATE INDEX idx_estimates_claim_id ON public.estimates(claim_id);