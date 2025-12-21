-- Add annotations_json column to claims table for storing bounding box detections
ALTER TABLE public.claims 
ADD COLUMN annotations_json JSONB DEFAULT NULL;

-- Add a comment explaining the structure
COMMENT ON COLUMN public.claims.annotations_json IS 'Stores damage detection bounding boxes: { detections: [{ id, label, part, severity, confidence, box: { x, y, w, h } }], notes: string }';