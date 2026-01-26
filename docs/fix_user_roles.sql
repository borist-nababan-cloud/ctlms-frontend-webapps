-- FIX: Seed User Roles to resolve Foreign Key Constraint Error
-- The application expects specific Role IDs (1-7) to exist.
-- Run this script in your Supabase SQL Editor.

INSERT INTO public.user_roles (id, role_name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Super Administrator'),
  (2, 'Administrator'),
  (3, 'Manager'),
  (4, 'Supervisor'),
  (5, 'Staff'),
  (6, 'Operator'),
  (7, 'Unassigned')
ON CONFLICT (id) DO UPDATE 
SET role_name = EXCLUDED.role_name;

-- Reset the identity sequence to avoid future collision
SELECT setval('user_roles_id_seq', (SELECT MAX(id) FROM public.user_roles));
