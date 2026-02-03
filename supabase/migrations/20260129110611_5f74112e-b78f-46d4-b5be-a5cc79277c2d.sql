-- Mettre à jour la fonction get_user_role pour prioriser super_admin
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1 
      WHEN 'doctor' THEN 2 
      WHEN 'secretary' THEN 3 
      WHEN 'patient' THEN 4 
    END
  LIMIT 1
$$;

-- Ajouter politique RLS pour super_admin sur profiles
CREATE POLICY "Super_admin full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Supprimer les anciennes politiques utilisant has_role avec text
DROP POLICY IF EXISTS "Super_admin full access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Super_admin full access to doctors" ON public.doctors;
DROP POLICY IF EXISTS "Super_admin full access to patients" ON public.patients;
DROP POLICY IF EXISTS "Super_admin full access to user_roles" ON public.user_roles;

-- Recréer les politiques avec le bon type app_role
CREATE POLICY "Super_admin full access to appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super_admin full access to doctors"
ON public.doctors
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super_admin full access to patients"
ON public.patients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super_admin full access to user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));