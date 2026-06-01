BEGIN;

CREATE TABLE IF NOT EXISTS public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments text,
  is_anonymous boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_feedback_event_user_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id
  ON public.event_feedback(event_id);

CREATE INDEX IF NOT EXISTS idx_event_feedback_user_id
  ON public.event_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_event_feedback_submitted_at
  ON public.event_feedback(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_feedback_rating
  ON public.event_feedback(rating);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.event_feedback TO authenticated;

DROP POLICY IF EXISTS "Students can submit feedback for completed registered events"
  ON public.event_feedback;

CREATE POLICY "Students can submit feedback for completed registered events"
ON public.event_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role = 'student'
      AND COALESCE(u.status, 'active') = 'active'
  )
  AND EXISTS (
    SELECT 1
    FROM public.event_registrations er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = event_feedback.registration_id
      AND er.user_id = (SELECT auth.uid())
      AND er.event_id = event_feedback.event_id
      AND e.status IN ('Completed', 'Closed')
  )
);

DROP POLICY IF EXISTS "Students can read own feedback"
  ON public.event_feedback;

CREATE POLICY "Students can read own feedback"
ON public.event_feedback
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Staff can read feedback analytics"
  ON public.event_feedback;

CREATE POLICY "Staff can read feedback analytics"
ON public.event_feedback
FOR SELECT
TO authenticated
USING (
  private.current_user_has_any_role(ARRAY['admin', 'committee', 'president', 'club_advisor'])
);

COMMIT;
