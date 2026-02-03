-- 1. Activer la publication Realtime pour la table doctors
-- C'est indispensable pour que le client reçoive les événements
alter publication supabase_realtime add table doctors;

-- 2. Configuration des Politiques de Sécurité (RLS)
-- Activer RLS sur la table doctors si ce n'est pas déjà fait
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Autoriser TOUT LE MONDE (authentifiés et anonymes) à voir les médecins
-- Cela permet aux patients de voir le statut 'is_online'
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.doctors FOR SELECT 
USING ( true );

-- Autoriser les médecins à mettre à jour leur PROPRE profil
CREATE POLICY "Doctors can update own profile" 
ON public.doctors FOR UPDATE 
USING ( auth.uid() = profile_id );

-- Vérifier que la colonne is_online existe bien (rappel)
-- DO $$ 
-- BEGIN 
--     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'is_online') THEN 
--         ALTER TABLE public.doctors ADD COLUMN is_online boolean DEFAULT false; 
--     END IF;
-- END $$;
