-- Move admin role helper out of the exposed public API schema.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
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

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
CREATE POLICY "Admin can delete users"
ON public.users
FOR DELETE
USING (private.is_admin());

DROP POLICY IF EXISTS "Admin can delete event registrations" ON public.event_registrations;
CREATE POLICY "Admin can delete event registrations"
ON public.event_registrations
FOR DELETE
USING (private.is_admin());

DROP POLICY IF EXISTS "Admin can delete certificates" ON public.certificates;
CREATE POLICY "Admin can delete certificates"
ON public.certificates
FOR DELETE
USING (private.is_admin());

DROP FUNCTION IF EXISTS public.is_admin();

COMMIT;
