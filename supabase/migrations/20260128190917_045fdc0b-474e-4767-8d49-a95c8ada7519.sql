-- Insert missing patient roles for existing users who don't have roles yet
INSERT INTO public.user_roles (user_id, role)
SELECT p.profile_id, 'patient'::app_role
FROM public.patients p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.profile_id
);

-- Add policy for users to insert their own role during registration
-- (Drop first if exists to avoid duplicate)
DROP POLICY IF EXISTS "Users can insert their own role during registration" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;

CREATE POLICY "Users can insert their own role during registration"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);