-- Fix High Council -> Club Advisor paperwork transition under events RLS.

BEGIN;

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

COMMIT;
