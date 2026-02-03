-- =====================================================
-- MIGRATION: Gestion Multi-Centres de Santé
-- =====================================================

-- 1. Créer la table clinic_secretaries pour lier secrétaires aux centres
CREATE TABLE public.clinic_secretaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  secretary_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(clinic_id, secretary_id)
);

-- 2. Ajouter clinic_id à urgent_requests (optionnel pour l'instant)
ALTER TABLE public.urgent_requests 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id);

-- 3. Activer RLS sur clinic_secretaries
ALTER TABLE public.clinic_secretaries ENABLE ROW LEVEL SECURITY;

-- 4. Policies pour clinic_secretaries

-- Super Admin et Admin peuvent tout gérer
CREATE POLICY "Admins can manage clinic secretaries"
ON public.clinic_secretaries
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- Les secrétaires peuvent voir leur propre affectation
CREATE POLICY "Secretaries can view their own assignment"
ON public.clinic_secretaries
FOR SELECT
USING (secretary_id = auth.uid());

-- Permettre l'insertion lors de l'inscription
CREATE POLICY "Users can insert their own clinic assignment during registration"
ON public.clinic_secretaries
FOR INSERT
WITH CHECK (secretary_id = auth.uid());

-- 5. Mettre à jour les policies des appointments pour les secrétaires
-- D'abord supprimer l'ancienne policy
DROP POLICY IF EXISTS "Staff can manage all appointments" ON public.appointments;

-- Créer une nouvelle policy qui limite les secrétaires à leur centre
CREATE POLICY "Staff can manage appointments"
ON public.appointments
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR
  (
    has_role(auth.uid(), 'secretary') AND 
    clinic_id IN (
      SELECT cs.clinic_id FROM clinic_secretaries cs 
      WHERE cs.secretary_id = auth.uid() AND cs.is_active = true
    )
  )
);

-- 6. Mettre à jour les policies des urgent_requests pour les secrétaires
DROP POLICY IF EXISTS "Staff can manage urgent requests" ON public.urgent_requests;

CREATE POLICY "Staff can manage urgent requests"
ON public.urgent_requests
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'doctor') OR
  (
    has_role(auth.uid(), 'secretary') AND 
    (
      clinic_id IS NULL OR 
      clinic_id IN (
        SELECT cs.clinic_id FROM clinic_secretaries cs 
        WHERE cs.secretary_id = auth.uid() AND cs.is_active = true
      )
    )
  )
);

-- 7. Fonction helper pour obtenir le clinic_id d'un secrétaire
CREATE OR REPLACE FUNCTION public.get_secretary_clinic_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM clinic_secretaries
  WHERE secretary_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- 8. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_clinic_secretaries_secretary_id 
ON public.clinic_secretaries(secretary_id);

CREATE INDEX IF NOT EXISTS idx_clinic_secretaries_clinic_id 
ON public.clinic_secretaries(clinic_id);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON public.appointments(clinic_id);

CREATE INDEX IF NOT EXISTS idx_urgent_requests_clinic_id 
ON public.urgent_requests(clinic_id);