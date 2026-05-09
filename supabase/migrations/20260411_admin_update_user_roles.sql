-- Allow admin to update user rows (e.g., role changes) under RLS.

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can update users" ON public.users;
CREATE POLICY "Admin can update users"
ON public.users
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
