-- Allow the new facility_manager role in public.users

BEGIN;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'president', 'facility_manager'));

COMMIT;
