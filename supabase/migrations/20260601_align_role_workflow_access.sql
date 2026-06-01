-- Align role-based workflow access for the ITC Event Management System.
-- Preserves existing records and only normalizes legacy role/status values
-- needed by the current application workflow.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE public.users
SET role = CASE
  WHEN role = 'facility_manager' THEN 'committee'
  WHEN role = 'high_council' THEN 'president'
  WHEN role IN ('admin', 'committee', 'president', 'club_advisor', 'student') THEN role
  ELSE 'student'
END
WHERE role NOT IN ('admin', 'committee', 'president', 'club_advisor', 'student');

UPDATE public.users
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'locked');

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'committee', 'president', 'club_advisor', 'student'));

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'locked'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id);

UPDATE public.events
SET status = CASE
  WHEN status IN ('pending', 'Pending High Council Approval', 'Pending Club Advisor Approval') THEN 'Pending Approval'
  WHEN status = 'approved' THEN 'Published'
  WHEN status = 'completed' THEN 'Completed'
  ELSE status
END
WHERE status IN ('pending', 'Pending High Council Approval', 'Pending Club Advisor Approval', 'approved', 'completed');

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (
    status IN (
      'Draft',
      'Pending Approval',
      'Approved',
      'Rejected',
      'Published',
      'Closed',
      'Completed'
    )
  );

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS certificate_hash text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id);

UPDATE public.certificates
SET student_id = user_id
WHERE student_id IS NULL AND user_id IS NOT NULL;

UPDATE public.certificates
SET status = CASE
  WHEN status IN ('approved', 'issued') THEN 'issued'
  WHEN status IN ('pending', 'pending_approval') THEN 'pending_approval'
  WHEN status = 'rejected' THEN 'rejected'
  ELSE 'pending_approval'
END
WHERE status IS NULL OR status IN ('approved', 'issued', 'pending', 'pending_approval', 'rejected');

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_status_check;

ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_status_check
  CHECK (status IN ('pending_approval', 'issued', 'rejected'));

CREATE TABLE IF NOT EXISTS public.approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('event', 'certificate')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted', 'issued')),
  actor_id uuid REFERENCES public.users(id),
  actor_role text,
  from_status text,
  to_status text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_entity
ON public.approval_history(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_created_by
ON public.events(created_by);

CREATE INDEX IF NOT EXISTS idx_events_approved_by
ON public.events(approved_by);

CREATE INDEX IF NOT EXISTS idx_certificates_student_id
ON public.certificates(student_id);

CREATE INDEX IF NOT EXISTS idx_certificates_approved_by
ON public.certificates(approved_by);

CREATE SCHEMA IF NOT EXISTS private;

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
    AND COALESCE(u.status, 'active') = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

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
      AND u.role IN ('admin', 'committee', 'president', 'club_advisor')
      AND COALESCE(u.status, 'active') = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_role(required_role text)
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
      AND u.role = required_role
      AND COALESCE(u.status, 'active') = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_any_role(required_roles text[])
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
      AND u.role = ANY(required_roles)
      AND COALESCE(u.status, 'active') = 'active'
  );
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.current_user_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_has_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_has_any_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_user_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_has_any_role(text[]) TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all users" ON public.users;
DROP POLICY IF EXISTS "Staff can read user profiles" ON public.users;
DROP POLICY IF EXISTS "Admin can update users" ON public.users;

CREATE POLICY "Staff can read user profiles"
ON public.users
FOR SELECT
TO authenticated
USING (private.current_user_is_staff());

CREATE POLICY "Admin can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (private.current_user_has_role('admin'))
WITH CHECK (private.current_user_has_role('admin'));

DROP POLICY IF EXISTS "Admin can create events" ON public.events;
DROP POLICY IF EXISTS "Admin create events" ON public.events;
DROP POLICY IF EXISTS "Admin view all events" ON public.events;
DROP POLICY IF EXISTS "Admins can create paperwork" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Admins can read all events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Club advisor can read assigned paperwork" ON public.events;
DROP POLICY IF EXISTS "Club advisor can review paperwork" ON public.events;
DROP POLICY IF EXISTS "High council can read assigned paperwork" ON public.events;
DROP POLICY IF EXISTS "High council can review paperwork" ON public.events;
DROP POLICY IF EXISTS "President can approve events" ON public.events;
DROP POLICY IF EXISTS "President update events" ON public.events;
DROP POLICY IF EXISTS "President view pending events" ON public.events;
DROP POLICY IF EXISTS "Student read approved events only" ON public.events;
DROP POLICY IF EXISTS "Students view approved events" ON public.events;
DROP POLICY IF EXISTS "authenticated_can_read_approved_events" ON public.events;
DROP POLICY IF EXISTS "admin_can_manage_events" ON public.events;

CREATE POLICY "Admin can read system event records"
ON public.events
FOR SELECT
TO authenticated
USING (private.current_user_has_role('admin'));

CREATE POLICY "Committee can manage events"
ON public.events
FOR ALL
TO authenticated
USING (private.current_user_has_role('committee'))
WITH CHECK (private.current_user_has_role('committee'));

CREATE POLICY "Approvers can read events"
ON public.events
FOR SELECT
TO authenticated
USING (private.current_user_has_any_role(ARRAY['president', 'club_advisor']));

CREATE POLICY "Approvers can approve pending events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  private.current_user_has_any_role(ARRAY['president', 'club_advisor'])
  AND status = 'Pending Approval'
)
WITH CHECK (
  private.current_user_has_any_role(ARRAY['president', 'club_advisor'])
  AND status IN ('Approved', 'Rejected')
);

DROP POLICY IF EXISTS "Club advisors and presidents can read certificates" ON public.certificates;
DROP POLICY IF EXISTS "Club advisors and presidents can update certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admin can insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Students can read their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "admin_can_insert_certificates" ON public.certificates;
DROP POLICY IF EXISTS "admin_can_update_certificates" ON public.certificates;
DROP POLICY IF EXISTS "admin_can_view_all_certificates" ON public.certificates;
DROP POLICY IF EXISTS "admin_insert_certificates" ON public.certificates;
DROP POLICY IF EXISTS "president_can_update_certificates" ON public.certificates;
DROP POLICY IF EXISTS "president_can_view_all_certificates" ON public.certificates;
DROP POLICY IF EXISTS "president_can_view_certificates" ON public.certificates;
DROP POLICY IF EXISTS "president_read_pending_certificates" ON public.certificates;
DROP POLICY IF EXISTS "student_read_approved_certificates" ON public.certificates;
DROP POLICY IF EXISTS "users_can_view_own_certificates" ON public.certificates;

CREATE POLICY "Admin can read certificate records"
ON public.certificates
FOR SELECT
TO authenticated
USING (private.current_user_has_role('admin'));

CREATE POLICY "Committee can create certificate drafts"
ON public.certificates
FOR INSERT
TO authenticated
WITH CHECK (
  private.current_user_has_role('committee')
  AND status = 'pending_approval'
);

CREATE POLICY "Committee can read certificate drafts"
ON public.certificates
FOR SELECT
TO authenticated
USING (private.current_user_has_role('committee'));

CREATE POLICY "Approvers can read certificate drafts"
ON public.certificates
FOR SELECT
TO authenticated
USING (private.current_user_has_any_role(ARRAY['president', 'club_advisor']));

CREATE POLICY "Approvers can issue certificates"
ON public.certificates
FOR UPDATE
TO authenticated
USING (
  private.current_user_has_any_role(ARRAY['president', 'club_advisor'])
  AND status = 'pending_approval'
)
WITH CHECK (
  private.current_user_has_any_role(ARRAY['president', 'club_advisor'])
  AND status IN ('issued', 'rejected')
);

CREATE POLICY "Students can read issued certificates"
ON public.certificates
FOR SELECT
TO authenticated
USING (
  auth.uid() = COALESCE(student_id, user_id)
  AND status = 'issued'
);

CREATE POLICY "Public can read issued certificates for verification"
ON public.certificates
FOR SELECT
TO anon
USING (status = 'issued');

DROP POLICY IF EXISTS "Staff can read approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Staff can write approval history" ON public.approval_history;

CREATE POLICY "Staff can read approval history"
ON public.approval_history
FOR SELECT
TO authenticated
USING (private.current_user_is_staff());

CREATE POLICY "Staff can write approval history"
ON public.approval_history
FOR INSERT
TO authenticated
WITH CHECK (private.current_user_is_staff());

COMMIT;
