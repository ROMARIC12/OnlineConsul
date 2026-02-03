-- Permettre à tout le monde de voir les profils des médecins vérifiés
CREATE POLICY "Everyone can view doctor profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (SELECT profile_id FROM doctors WHERE is_verified = true)
);