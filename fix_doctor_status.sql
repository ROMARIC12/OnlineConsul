-- 1. Réparer la table doctors (Ajout des colonnes si manquantes)
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_teleconsultation_free boolean DEFAULT false;

-- 2. Activer RLS (Sécurité)
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- 3. Nettoyer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctors;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.doctors;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.doctors;

-- 4. Créer les nouvelles politiques (Correctes)

-- Politique DE LECTURE : Tout le monde peut voir les médecins (pour que les patients voient le statut)
CREATE POLICY "Public read access"
ON public.doctors FOR SELECT
USING ( true );

-- Politique DE MISE À JOUR : Un médecin ne peut modifier QUE sa propre ligne
-- On utilise profile_id qui correspond à auth.uid()
CREATE POLICY "Doctors update own profile"
ON public.doctors FOR UPDATE
USING ( auth.uid() = profile_id )
WITH CHECK ( auth.uid() = profile_id );

-- 5. Activer le Realtime
-- Supprimer d'abord pour éviter les doublons puis rajouter
alter publication supabase_realtime drop table doctors;
alter publication supabase_realtime add table doctors;
