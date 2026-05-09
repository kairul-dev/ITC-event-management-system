# Supabase RLS Policies for ITC Secure Document Verification System

## Issue
The error "infinite recursion detected in policy for relation 'users'" occurs because the RLS policy on the `users` table has a circular dependency.

## Recommended Policies

### Users Table Policies

1. **Allow users to read their own profile:**
```sql
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (auth.uid() = id);
```

2. **Allow authenticated users to read all users (for admin/user lookup):**
```sql
CREATE POLICY "Authenticated users can read all users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');
```

3. **Allow users to update their own profile:**
```sql
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);
```

4. **Allow service role to insert users (for registration):**
```sql
-- This should be done via service role or a function
-- Or allow authenticated users to insert with their own ID
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);
```

## Steps to Fix in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Policies** (or **Table Editor** → select `users` table → **RLS**)
3. Delete the existing problematic policy
4. Create new policies using the SQL above
5. Test by logging in again

## Quick Fix (Temporary - for development only)

If you need a quick fix for development/testing:

```sql
-- DISABLE RLS temporarily (NOT RECOMMENDED FOR PRODUCTION)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Warning:** Only use this for development. Always enable RLS in production.

## Alternative: Use Database Functions

You could also create a database function that bypasses RLS for specific queries:

```sql
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = user_id);
END;
$$;
```

Then call it from your application instead of querying the table directly.

## Fix User Delete FK Errors (Admin)

If admin delete fails with a foreign key error like:

`update or delete on table "users" violates foreign key constraint "fk_event_registrations_user"`

use the SQL below.

### 1) Add admin delete policies for child tables

Run this first so admin can delete related rows before deleting a user.

```sql
-- Ensure RLS is enabled
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Admin can delete event registrations
DROP POLICY IF EXISTS "Admin can delete event registrations" ON public.event_registrations;
CREATE POLICY "Admin can delete event registrations"
ON public.event_registrations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- Admin can delete certificates
DROP POLICY IF EXISTS "Admin can delete certificates" ON public.certificates;
CREATE POLICY "Admin can delete certificates"
ON public.certificates
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- Admin can delete users
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
CREATE POLICY "Admin can delete users"
ON public.users
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);
```

### 2) Stronger fix: make FK constraints cascade on user delete

This avoids manual child-row cleanup and makes deletes safer.

```sql
-- event_registrations -> users(id)
ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS fk_event_registrations_user;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT fk_event_registrations_user
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- certificates -> users(id)
ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS fk_certificates_user;

ALTER TABLE public.certificates
  ADD CONSTRAINT fk_certificates_user
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
```

### 3) Check actual FK names before altering (recommended)

If your FK names differ, run this to list them:

```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('event_registrations', 'certificates')
  AND ccu.table_name = 'users';
```

### 4) Optional: also delete auth account record

Deleting from `public.users` does not automatically remove `auth.users`.
For full account removal, use Supabase Admin API (service role) in a secure server-side function.

