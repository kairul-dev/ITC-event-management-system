-- Hotfix: remove recursive users SELECT policies and provide RPC role lookup.

BEGIN;

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Drop all SELECT policies on users to clear any recursive definitions.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

-- Safe SELECT policies without self-referencing subqueries.
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read all users"
ON public.users
FOR SELECT
USING (auth.role() = 'authenticated');

-- SECURITY DEFINER RPC for current user role lookup (bypasses RLS recursion risk).
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TABLE(role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

COMMIT;
