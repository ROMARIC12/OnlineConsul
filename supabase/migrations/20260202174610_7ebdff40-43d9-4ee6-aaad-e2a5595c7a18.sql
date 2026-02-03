-- Add is_teleconsultation_free column to doctors table
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS is_teleconsultation_free boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.doctors.is_teleconsultation_free IS 'If true, teleconsultation is free for patients';

-- Create teleconsultation_sessions table for tracking sessions
CREATE TABLE IF NOT EXISTS public.teleconsultation_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  channel_name text NOT NULL UNIQUE,
  access_code text NOT NULL UNIQUE,
  duration_minutes integer NOT NULL DEFAULT 30,
  amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'completed', 'cancelled')),
  payment_id uuid REFERENCES public.payments(id),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teleconsultation_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for teleconsultation_sessions
CREATE POLICY "Doctors can view their sessions"
ON public.teleconsultation_sessions FOR SELECT
USING (doctor_id IN (SELECT id FROM public.doctors WHERE profile_id = auth.uid()));

CREATE POLICY "Patients can view their sessions"
ON public.teleconsultation_sessions FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid()));

CREATE POLICY "Patients can insert sessions"
ON public.teleconsultation_sessions FOR INSERT
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid()));

CREATE POLICY "System can manage sessions"
ON public.teleconsultation_sessions FOR ALL
USING (true)
WITH CHECK (true);

-- Index for quick lookup by access code
CREATE INDEX IF NOT EXISTS idx_teleconsultation_sessions_access_code 
ON public.teleconsultation_sessions(access_code);

-- Index for finding pending sessions
CREATE INDEX IF NOT EXISTS idx_teleconsultation_sessions_status 
ON public.teleconsultation_sessions(status);