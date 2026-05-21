-- Restrict user profile reads. The previous broad policy allowed any
-- authenticated user to read every row in public.users.

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_user_is_staff()
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
      AND u.role IN (
        'admin',
        'club_advisor',
        'president',
        'high_council',
        'facility_manager'
      )
  );
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.current_user_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_user_is_staff() TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read all users" ON public.users;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff can read user profiles" ON public.users;
CREATE POLICY "Staff can read user profiles"
ON public.users
FOR SELECT
USING (private.current_user_is_staff());

DROP FUNCTION IF EXISTS public.current_user_is_staff();

COMMIT;
