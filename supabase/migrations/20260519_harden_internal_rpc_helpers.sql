-- Remove unnecessary SECURITY DEFINER usage from internal role helpers.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TABLE(role text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_event_paperwork(
  p_event_id uuid,
  p_next_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_role text;
  normalized_role text;
  current_status text;
  cleaned_reason text;
BEGIN
  SELECT u.role
  INTO user_role
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to review paperwork.';
  END IF;

  normalized_role := regexp_replace(lower(btrim(user_role)), '[^a-z0-9]+', '_', 'g');

  SELECT e.status
  INTO current_status
  FROM public.events e
  WHERE e.id = p_event_id
  FOR UPDATE;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Paperwork not found.';
  END IF;

  cleaned_reason := NULLIF(btrim(COALESCE(p_rejection_reason, '')), '');

  IF p_next_status = 'Rejected' AND cleaned_reason IS NULL THEN
    RAISE EXCEPTION 'Rejection reason is required.';
  END IF;

  IF normalized_role = 'high_council' THEN
    IF current_status <> 'Pending High Council Approval'
      OR p_next_status NOT IN ('Pending Club Advisor Approval', 'Rejected') THEN
      RAISE EXCEPTION 'High Council cannot perform this paperwork transition.';
    END IF;
  ELSIF normalized_role IN ('club_advisor', 'president') THEN
    IF current_status <> 'Pending Club Advisor Approval'
      OR p_next_status NOT IN ('Approved', 'Rejected') THEN
      RAISE EXCEPTION 'Club Advisor cannot perform this paperwork transition.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only High Council or Club Advisor can review paperwork. Current role: %', user_role;
  END IF;

  UPDATE public.events
  SET
    status = p_next_status,
    rejection_reason = CASE WHEN p_next_status = 'Rejected' THEN cleaned_reason ELSE NULL END,
    approved_at = now()
  WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_event_paperwork(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_event_paperwork(uuid, text, text) TO authenticated;

COMMIT;