-- Assigner le rôle super_admin à jesus.ndri@groupecerco.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('65a58dc0-a870-49b4-9d17-483e0b80dae4', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;