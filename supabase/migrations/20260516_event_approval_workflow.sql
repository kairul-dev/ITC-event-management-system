-- Normalize the ITC event approval workflow.
-- HEP is intentionally not part of this system.

BEGIN;

UPDATE public.events
SET status = CASE status
  WHEN 'pending' THEN 'Pending High Council Approval'
  WHEN 'high_council_approved' THEN 'Pending Club Advisor Approval'
  WHEN 'approved' THEN 'Published'
  WHEN 'completed' THEN 'Closed'
  WHEN 'draft' THEN 'Draft'
  WHEN 'rejected' THEN 'Rejected'
  ELSE status
END
WHERE status IN ('pending', 'high_council_approved', 'approved', 'completed', 'draft', 'rejected');

UPDATE public.users
SET role = 'club_advisor'
WHERE role = 'president';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'high_council', 'club_advisor'));

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (
    status IN (
      'Draft',
      'Pending High Council Approval',
      'Pending Club Advisor Approval',
      'Approved',
      'Rejected',
      'Published',
      'Closed'
    )
  );

COMMIT;
