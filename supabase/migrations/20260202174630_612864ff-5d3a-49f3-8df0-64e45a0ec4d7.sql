-- Drop overly permissive policy
DROP POLICY IF EXISTS "System can manage sessions" ON public.teleconsultation_sessions;

-- Add specific policies for edge functions (service role will bypass RLS)
-- Update policy for doctors to manage their sessions
CREATE POLICY "Doctors can update their sessions"
ON public.teleconsultation_sessions FOR UPDATE
USING (doctor_id IN (SELECT id FROM public.doctors WHERE profile_id = auth.uid()));

-- Patients can update their own sessions
CREATE POLICY "Patients can update their sessions"
ON public.teleconsultation_sessions FOR UPDATE
USING (patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid()));