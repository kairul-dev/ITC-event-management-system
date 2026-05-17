-- Adds role-scoped matrix lookup so staff accounts cannot sign in through student login.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_email_by_matrix_and_role(p_matrix text, p_role text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.users u
  WHERE upper(trim(u.matrix_number)) = upper(trim(p_matrix))
    AND u.role = p_role
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_matrix_and_role(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_matrix_and_role(text, text) TO authenticated;

COMMIT;
