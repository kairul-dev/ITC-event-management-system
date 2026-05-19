-- Add missing RLS policies for certificates table to allow club advisors and presidents to view and approve certificates

BEGIN;

-- Allow club advisors and presidents to read all certificates
DROP POLICY IF EXISTS "Club advisors and presidents can read certificates" ON public.certificates;
CREATE POLICY "Club advisors and presidents can read certificates"
ON public.certificates
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
);

-- Allow club advisors and presidents to update certificate status
DROP POLICY IF EXISTS "Club advisors and presidents can update certificates" ON public.certificates;
CREATE POLICY "Club advisors and presidents can update certificates"
ON public.certificates
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
);

-- Allow admin to insert certificates
DROP POLICY IF EXISTS "Admin can insert certificates" ON public.certificates;
CREATE POLICY "Admin can insert certificates"
ON public.certificates
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role = 'admin'
  )
);

-- Allow students to read their own approved certificates
DROP POLICY IF EXISTS "Students can read their own certificates" ON public.certificates;
CREATE POLICY "Students can read their own certificates"
ON public.certificates
FOR SELECT
USING (
  (auth.uid() = user_id AND status = 'approved') OR
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
);

COMMIT;
