-- Add human review request fields to claims table
ALTER TABLE public.claims 
ADD COLUMN human_review_requested boolean NOT NULL DEFAULT false,
ADD COLUMN human_review_reason text,
ADD COLUMN intake_preference text NOT NULL DEFAULT 'ai_first';

-- Add a check constraint to validate intake_preference values
ALTER TABLE public.claims 
ADD CONSTRAINT claims_intake_preference_check 
CHECK (intake_preference IN ('ai_first', 'human_requested'));

-- Add a new status value for human requested claims
-- Note: We'll use 'review' status but the human_review_requested flag will differentiate