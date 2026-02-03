
-- Permettre à tout le monde (y compris les utilisateurs non authentifiés) de voir les cliniques publiques
CREATE POLICY "Anyone can view public clinics"
ON public.clinics
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- Supprimer l'ancienne politique qui ne fonctionnait que pour les authentifiés
DROP POLICY IF EXISTS "Everyone can view public clinics" ON public.clinics;
