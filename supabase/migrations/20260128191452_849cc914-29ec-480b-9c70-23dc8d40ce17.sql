-- Fix doctors table: Add INSERT policy for self-registration
-- The existing ALL policy with USING doesn't work for INSERT (needs WITH CHECK)
DROP POLICY IF EXISTS "Doctors can view and update their own data" ON public.doctors;

-- Create separate policies for better control
CREATE POLICY "Doctors can view their own data"
ON public.doctors
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Doctors can insert their own data"
ON public.doctors
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Doctors can update their own data"
ON public.doctors
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());