-- 1. Création de la table des sessions si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.teleconsultation_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_name text NOT NULL,
    access_code text NOT NULL,
    status text DEFAULT 'waiting'::text, -- 'waiting', 'paid', 'active', 'finished'
    amount numeric,
    token text
);

-- 2. Activation du Realtime pour cette table (Crucial pour le médecin !)
ALTER PUBLICATION supabase_realtime ADD TABLE public.teleconsultation_sessions;

-- 3. Sécurité (RLS)
ALTER TABLE public.teleconsultation_sessions ENABLE ROW LEVEL SECURITY;

-- Les patients peuvent créer une session
CREATE POLICY "Patients can create sessions" 
ON public.teleconsultation_sessions FOR INSERT 
WITH CHECK (true);

-- Les médecins et patients concernés peuvent voir la session
CREATE POLICY "Users can view their own sessions" 
ON public.teleconsultation_sessions FOR SELECT 
USING (true); -- Pour simplifier le debug, on autorise la lecture. En prod, filter par auth.uid()

-- Les médecins peuvent mettre à jour le statut
CREATE POLICY "Doctors can update sessions" 
ON public.teleconsultation_sessions FOR UPDATE 
USING (true);

-- 4. Rappel : Activer le temps réel sur la table doctors aussi
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
