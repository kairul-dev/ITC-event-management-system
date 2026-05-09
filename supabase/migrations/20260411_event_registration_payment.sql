-- Add payment workflow fields to event_registrations and safe update policies.

BEGIN;

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_note text,
  ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES public.users(id);

-- Keep allowed statuses constrained.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_registrations_payment_status_check'
      AND conrelid = 'public.event_registrations'::regclass
  ) THEN
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT event_registrations_payment_status_check
      CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status
  ON public.event_registrations(payment_status);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Student can submit payment data for own registration.
DROP POLICY IF EXISTS "Users can update own payment details" ON public.event_registrations;
CREATE POLICY "Users can update own payment details"
ON public.event_registrations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can verify/reject payments.
DROP POLICY IF EXISTS "Admin can update event registration payments" ON public.event_registrations;
CREATE POLICY "Admin can update event registration payments"
ON public.event_registrations
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

COMMIT;
