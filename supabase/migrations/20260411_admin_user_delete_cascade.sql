-- Admin delete + FK cascade fix (SQL-only)

BEGIN;

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.certificates ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role without recursive RLS policy evaluation.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  );
$$;

-- Restore core users policies required by app role checks.
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can read all users" ON public.users;
CREATE POLICY "Authenticated users can read all users"
ON public.users
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
CREATE POLICY "Admin can delete users"
ON public.users
FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete event registrations" ON public.event_registrations;
CREATE POLICY "Admin can delete event registrations"
ON public.event_registrations
FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete certificates" ON public.certificates;
CREATE POLICY "Admin can delete certificates"
ON public.certificates
FOR DELETE
USING (public.is_admin());

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS fk_event_registrations_user;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT fk_event_registrations_user
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS fk_certificates_user;

ALTER TABLE public.certificates
  ADD CONSTRAINT fk_certificates_user
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

COMMIT;
