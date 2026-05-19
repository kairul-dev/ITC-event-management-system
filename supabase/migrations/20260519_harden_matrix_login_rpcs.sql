-- Matrix login lookup is now handled by a server route, so the public RPCs can be locked down.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_email_by_matrix(p_matrix text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.users u
  WHERE upper(trim(u.matrix_number)) = upper(trim(p_matrix))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_email_by_matrix(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_email_by_matrix(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_email_by_matrix(text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_email_by_matrix_and_role(p_matrix text, p_role text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.users u
  WHERE upper(trim(u.matrix_number)) = upper(trim(p_matrix))
    AND u.role = p_role
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_email_by_matrix_and_role(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_email_by_matrix_and_role(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_email_by_matrix_and_role(text, text) FROM authenticated;

COMMIT;