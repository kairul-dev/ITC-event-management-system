-- Allow the event paperwork workflow to operate under RLS.

BEGIN;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published events" ON public.events;
CREATE POLICY "Anyone can read published events"
ON public.events
FOR SELECT
USING (status = 'Published');

DROP POLICY IF EXISTS "Admins can read all events" ON public.events;
CREATE POLICY "Admins can read all events"
ON public.events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.get_current_user_role() r
    WHERE r.role = 'admin'
  )
);

DROP POLICY IF EXISTS "High council can read assigned paperwork" ON public.events;
CREATE POLICY "High council can read assigned paperwork"
ON public.events
FOR SELECT
USING (
  status = 'Pending High Council Approval'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'high_council'
  )
);

DROP POLICY IF EXISTS "Club advisor can read assigned paperwork" ON public.events;
CREATE POLICY "Club advisor can read assigned paperwork"
ON public.events
FOR SELECT
USING (
  status = 'Pending Club Advisor Approval'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'club_advisor'
  )
);

DROP POLICY IF EXISTS "Admins can create paperwork" ON public.events;
CREATE POLICY "Admins can create paperwork"
ON public.events
FOR INSERT
WITH CHECK (
  status IN ('Draft', 'Pending High Council Approval')
  AND EXISTS (
    SELECT 1
    FROM public.get_current_user_role() r
    WHERE r.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events"
ON public.events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.get_current_user_role() r
    WHERE r.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.get_current_user_role() r
    WHERE r.role = 'admin'
  )
);

DROP POLICY IF EXISTS "High council can review paperwork" ON public.events;
CREATE POLICY "High council can review paperwork"
ON public.events
FOR UPDATE
USING (
  status = 'Pending High Council Approval'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'high_council'
  )
)
WITH CHECK (
  status IN ('Pending Club Advisor Approval', 'Rejected')
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'high_council'
  )
);

DROP POLICY IF EXISTS "Club advisor can review paperwork" ON public.events;
CREATE POLICY "Club advisor can review paperwork"
ON public.events
FOR UPDATE
USING (
  status = 'Pending Club Advisor Approval'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'club_advisor'
  )
)
WITH CHECK (
  status IN ('Approved', 'Rejected')
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'club_advisor'
  )
);

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
ON public.events
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.get_current_user_role() r
    WHERE r.role = 'admin'
  )
);

COMMIT;
