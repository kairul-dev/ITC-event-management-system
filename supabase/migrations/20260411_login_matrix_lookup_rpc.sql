-- Adds secure matrix-number lookup RPC for pre-auth login flow.
-- This avoids direct anon SELECT on public.users when RLS is enabled.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_email_by_matrix(p_matrix text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.users u
  WHERE upper(trim(u.matrix_number)) = upper(trim(p_matrix))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_matrix(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_matrix(text) TO authenticated;

COMMIT;
