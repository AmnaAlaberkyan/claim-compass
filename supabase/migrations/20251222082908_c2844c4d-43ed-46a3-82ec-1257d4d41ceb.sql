-- Drop existing overly permissive policies on audit_logs
DROP POLICY IF EXISTS "Allow public insert access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public read access to audit_logs" ON public.audit_logs;

-- Create secure RLS policies for audit_logs
-- Only authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can read audit logs
CREATE POLICY "Authenticated users can read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Note: No UPDATE or DELETE policies - audit logs are append-only