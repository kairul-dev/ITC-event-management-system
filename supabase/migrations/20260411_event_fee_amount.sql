-- Add explicit payable fee per event so students know exactly how much to pay.

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_fee_amount_non_negative'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_fee_amount_non_negative
      CHECK (fee_amount >= 0);
  END IF;
END $$;

COMMIT;
