-- Adds secure club-advisor name lookup for pre-auth login flow.
-- The app still signs in with Supabase Auth email/password after resolving email.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_email_by_club_advisor_name(p_name text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.users u
  WHERE lower(trim(u.name)) = lower(trim(p_name))
    AND u.role IN ('club_advisor', 'president')
  ORDER BY u.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_club_advisor_name(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_club_advisor_name(text) TO authenticated;

COMMIT;
