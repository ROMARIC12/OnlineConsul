-- Allow users to insert their own role during registration
CREATE POLICY "Users can insert their own role during registration"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own role
CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);