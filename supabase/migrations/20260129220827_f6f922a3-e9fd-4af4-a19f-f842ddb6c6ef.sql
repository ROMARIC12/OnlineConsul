-- Fix role helper functions: app_role enum compared to text caused runtime errors in RLS

CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id
      AND user_roles.role::text = role_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(user_id uuid, role_names text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = has_any_role.user_id
      AND user_roles.role::text = ANY(role_names)
  );
END;
$$;
