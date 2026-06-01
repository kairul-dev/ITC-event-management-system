# Codex Test Runbook

## Purpose

This file is the single source of truth for testing and verification in the ITC Secure Document Verification System. Use it whenever Codex changes code, database schema, access control, workflows, UI routes, payments, certificates, feedback, verification, or role dashboards.

It consolidates and supersedes:

- `TEST_PLAN_INSTRUCTIONS.md`
- `TESTING_INSTRUCTIONS_FOR_CODEX.md`
- `SYSTEM_TEST_REPORT.md`

## Core Verification Rules

1. Run the smallest reliable checks for the change, then broaden if the change touches shared workflow or role access.
2. Prefer browser testing for workflows that involve auth, RLS, Supabase API calls, UI state, payments, certificates, or role redirects.
3. For Supabase schema work, follow safe migration mode:
   - Inspect live schema first.
   - Create a unique migration only if schema changes are required.
   - Do not run `supabase db push` while local migration history has duplicate versions.
   - Apply individual migrations with `npx.cmd supabase db query --linked --file <migration-file>`.
   - Repair only the new migration version after successful SQL.
   - Verify tables, columns, constraints, indexes, functions, and RLS policies after applying.
4. Do not modify production data unless the test explicitly requires a new test record.
5. Do not print or commit secrets.
6. When browser testing, verify both the UI result and the underlying API/database effect where possible.

## Standard Local Checks

Run these after most code changes:

```powershell
npm.cmd run lint
npm.cmd run build
```

Known current behavior:

- Lint may pass with warnings from existing files, especially hook dependency warnings and `<img>` usage warnings.
- Build should pass before work is considered complete.

For frontend route changes, also start the local server and smoke test the relevant route:

```powershell
npm.cmd run dev -- --port 3000
```

Open:

```text
http://localhost:3000
```

If port `3000` is already in use, use another available port and report it.

## Standard API And Database Checks

Use these checks whenever the changed feature has an API route, database write, RLS policy, or server-side role check.

### API Checks

1. Identify every touched API route under `app/api`.
2. Test the route with:
   - no token, if it should be protected
   - a valid token for an allowed role
   - a valid token for a disallowed role
   - malformed input
   - missing required fields
3. Confirm API responses use the expected status codes:
   - `200` or `201` for success
   - `400` for invalid request payloads
   - `401` for missing or invalid auth
   - `403` for wrong role
   - `404` for missing records
   - `409` for workflow conflicts that should not be silently accepted
4. Confirm responses do not expose service role keys, database passwords, private user data, or stack traces.
5. Confirm browser UI handles API errors with a clear message.

### Database Validation Checks

For changed database behavior, verify the relevant records directly in Supabase:

1. Confirm expected tables and columns exist.
2. Confirm constraints, foreign keys, indexes, triggers, and functions are present when relevant.
3. Confirm RLS is enabled on public tables.
4. Confirm policies match the intended role access.
5. Confirm inserted or updated records preserve existing data.
6. Confirm timestamps, status values, user IDs, event IDs, certificate IDs, hashes, and payment fields are correct.
7. Confirm unauthorized role queries fail or return no rows.
8. Confirm duplicate submission rules work where applicable.

Never use destructive verification queries on production data.

## Test Accounts

Use these known accounts when available:

- Admin: `AI220382` / `123456aA`
- High Council: `AI220383` / `123456aA`
- Club Advisor: `suriawati` / `suriawati123`
- Student: `AI220385` / `123456aA`

Historical or older certificate-workflow test account:

- Admin: `A12345678` / `password123`

If a login fails, do not assume the feature is broken. Check whether the test user exists in Supabase and whether the role/status values match the current RBAC model.

## Baseline Workflow Test

Use a unique event name for every workflow test:

```text
Workflow Test Event YYYYMMDD-HHMM
```

### 1. Admin Or Committee Submits Paperwork

1. Log in as the event-creating role.
2. Go to the event or paperwork creation page.
3. Fill in all required paperwork fields.
4. Upload the required paperwork file.
5. Click `Submit Paperwork`.
6. Go to the event list or approval status page.
7. Confirm the event status is pending approval.

Expected result:

- A new event exists in `events`.
- The event has the correct title, dates, creator, and pending approval status.
- The event appears in the High Council review queue.

### 2. High Council Review Path

1. Log in as High Council.
2. Go to `Review Paperwork`.
3. Confirm the submitted event appears in the queue.
4. Approve/forward it to Club Advisor final review, or reject it with a reason.
5. Confirm the event leaves the current queue.

Expected result:

- The event status advances to `Pending Club Advisor Approval` or becomes `Rejected`.
- The previous queue no longer shows the event.

### 3. Club Advisor Final Approval Path

1. Log in as Club Advisor.
2. Go to `Review Paperwork`.
3. Confirm the event appears in the queue.
4. Click `Approve Paperwork`.
5. Log in as Admin or Committee.
6. Confirm the event status is `Approved`.

Expected result:

- Approved events can be published.
- Rejected events show a rejection reason.

### 4. Rejection Checks

High Council rejection:

1. Submit another test paperwork.
2. Log in as High Council.
3. Enter a rejection reason.
4. Click `Reject Paperwork`.
5. Log in as the creator role and confirm status is `Rejected`.
6. Confirm the rejection reason is visible.

Club Advisor or final rejection:

1. Submit another test paperwork.
2. Move it to the Club Advisor final approval queue.
3. Log in as Club Advisor.
4. Enter a rejection reason.
5. Click `Reject Paperwork`.
6. Log in as the creator role and confirm status is `Rejected`.
7. Use `Resubmit` if the workflow supports resubmission.

### 5. Publish Event

1. Log in as Admin or the authorized publishing role.
2. Go to event management.
3. For an `Approved` event, click `Show on Main Page` or publish action.
4. Open `/events`.
5. Confirm the event appears on the public event page.

Expected result:

- Published events are visible publicly.
- Draft, pending, rejected, and completed events are not publicly visible unless the system is explicitly designed to show them.

### 6. Student Registration And Payment

1. Log in as Student.
2. Go to `Available Events`.
3. Open the published test event.
4. Register for the event.
5. Go to `My Registrations`.
6. Click `Pay by Card`.
7. Complete Stripe Checkout in sandbox mode.
8. Return to `My Registrations`.
9. Confirm payment status is `paid`.
10. Log in as Admin.
11. Go to payment or participant records.
12. Confirm the paid card payment record appears.

Expected result:

- The registration exists in `event_registrations`.
- Payment status updates to `paid`.
- Admin can see payment evidence or Stripe payment record.

Payment edge cases:

1. Cancel Stripe Checkout and confirm registration does not become `paid`.
2. Refresh or revisit the success page and confirm payment confirmation is idempotent.
3. Confirm unpaid students cannot receive certificates if the workflow requires paid registrations.
4. Confirm payment webhooks or confirmation APIs reject invalid sessions or missing session IDs.
5. Confirm Admin payment records show student, event, amount, reference, and status correctly.

### 7. Certificate Flow

1. Log in as Admin or authorized certificate creator.
2. Go to `Certificates`.
3. Select the test event.
4. Generate certificate drafts for paid students.
5. Log in as Club Advisor.
6. Go to `Certificates`.
7. Approve the pending certificate.
8. Log in as Student.
9. Go to `My Certificates`.
10. Confirm the approved certificate is visible.
11. If feedback gating is enabled, submit event feedback first.
12. Open and download the certificate.

Expected result:

- Certificate is created in `certificates`.
- Approval changes certificate status to issued or approved according to current workflow.
- Student can only view/download certificates they are allowed to access.
- Feedback-gated certificates show `Pending Feedback` until feedback exists.

## Certificate Workflow Specific Test

Use this focused test when changing certificate generation, approval, RLS, or certificate APIs.

### Step 1: Generate Certificate

- URL: `http://localhost:3000/admin/certificates`
- Login as Admin.
- Select an event.
- Select a student.
- Click `Generate Certificate`.

Expected result:

- A certificate record is created.
- Initial status is pending approval or the current configured draft status.

### Step 2: Approve Certificate

- URL: `http://localhost:3000/club-advisor/certificates`.
- Login as Club Advisor.
- Confirm pending certificates appear.
- Click `Approve`.

Expected result:

- Success message appears.
- Pending count decreases.
- Certificate leaves the pending list.

### Step 3: Verify Database/API Update

- Open or call `/api/certificates/all` with appropriate auth if required.
- Confirm certificate status changed correctly.

Certificate workflow validates:

- Frontend form submission.
- API endpoint receives request.
- Admin/service client authentication.
- Database update bypasses RLS only where intended.
- Response returns to frontend.
- UI refreshes after success.

Certificate edge cases:

1. Try generating a certificate for an unpaid or unregistered student.
2. Try generating a duplicate certificate for the same student/event.
3. Try approving a certificate as Committee or Student.
4. Try rejecting a certificate with and without a rejection reason, if rejection reasons are supported.
5. Confirm only issued certificates appear in the student's downloadable list.
6. Confirm certificate number and certificate hash remain stable after viewing/downloading.

## Feedback And Certificate Release Test

Use this when changing event feedback, QR feedback links, certificate access, or analytics.

1. Ensure an event is `Completed` or `Closed`.
2. Ensure the student is registered for the event.
3. Ensure a certificate is issued for that student/event.
4. Log in as Student.
5. Open `My Certificates`.
6. Confirm certificate shows `Pending Feedback`.
7. Open `/feedback/<eventId>`.
8. Submit a rating, optional comment, and optional anonymous flag.
9. Return to `My Certificates`.
10. Confirm status is `Available`.
11. Open and download the certificate.
12. Log in as Admin or Committee.
13. Open feedback analytics.
14. Confirm average rating, total responses, rating distribution, and recent comments update.

Expected result:

- Feedback row exists in `event_feedback`.
- Anonymous comments hide student identity in analytics.
- Certificate verification and blockchain verification remain unchanged.

Feedback edge cases:

1. Open `/feedback/<eventId>` while logged out and confirm login prompt appears.
2. Open feedback for a Draft, Pending Approval, Approved, Published, or Rejected event and confirm submission is not available.
3. Try submitting feedback for an event the student did not register for.
4. Try submitting a rating below `1`, above `5`, or a non-number.
5. Try submitting feedback twice for the same event/student.
6. Confirm duplicate feedback is prevented and the certificate remains unlocked after the first valid submission.
7. Confirm anonymous feedback hides name and email in analytics but still counts toward average and distribution.
8. Confirm Admin and Committee can view analytics.
9. Confirm High Council, Club Advisor, Student, and logged-out users cannot access analytics unless intentionally allowed.
10. Confirm the public QR link points to `/feedback/<eventId>` and works on a fresh browser session.

## Program Planning Calendar Test

Use this when changing calendar, event dates, event status, or organizer logic.

1. Log in as Admin, Committee, High Council, or Club Advisor.
2. Open the role's `Program Calendar`.
3. Switch between Month, Week, and List views.
4. Confirm each event displays:
   - title
   - date
   - organizer
   - status
5. Confirm status colors:
   - Draft = gray
   - Pending Approval = yellow
   - Approved = green
   - Published = blue
   - Completed = purple
   - Rejected = red
6. Test filters:
   - month
   - status
   - organizer
7. Confirm dashboard statistics:
   - events this month
   - pending approvals
   - upcoming events
   - completed events
8. Create or edit an event with overlapping dates.
9. Confirm a conflict warning appears.
10. Confirm submission is not blocked automatically.

Expected result:

- Calendar uses the existing `events` table.
- No new event table is created.
- Conflict detection warns but does not prevent saving.

Calendar edge cases:

1. Confirm multi-day events appear on every day in the range.
2. Confirm events without an organizer show a safe fallback such as `Unassigned`.
3. Confirm events without dates do not crash the calendar.
4. Confirm month filtering includes events that overlap the month, not only events that start in the month.
5. Confirm week view works at month boundaries.
6. Confirm list view remains readable on mobile.
7. Confirm conflict detection catches:
   - same start date
   - same end date
   - new event fully inside an existing event range
   - existing event fully inside the new event range
   - overlap across month boundaries
8. Confirm conflict detection ignores the event currently being edited.

## Public Verification Test

Use this when changing certificate verification, QR verification, hash generation, blockchain code, or certificate templates.

1. Open `/verify-certificate`.
2. Enter a known issued certificate ID or certificate number.
3. Confirm local certificate data loads.
4. If blockchain/Sepolia is configured, confirm on-chain verification runs.
5. Confirm result is valid only when:
   - certificate exists locally
   - certificate status is issued
   - hash matches blockchain record
6. Test an invalid certificate ID.
7. Confirm invalid result is clear and does not expose private data.

Expected result:

- Public verification does not require login.
- Only issued certificates can verify as valid.
- Hash and blockchain logic remain stable.

Blockchain verification checks:

1. Confirm local hash generation uses the same payload fields as certificate issuance.
2. Confirm configured Sepolia RPC and contract address are used when present.
3. Confirm missing Sepolia config returns a clear configured/unconfigured response instead of crashing.
4. Confirm hash mismatch returns invalid.
5. Confirm issued local certificate with missing on-chain record is not shown as blockchain-valid.
6. Confirm public verification does not reveal private payment, feedback, or user account fields.

## Role Access Test

Use this after any auth, RBAC, dashboard, middleware, or route protection change.

### Required Roles

- Admin
- Committee
- High Council
- Club Advisor
- Student
- Public Verifier

### Checks

1. Log in as each available role.
2. Confirm redirect goes to the correct dashboard.
3. Try opening a page outside the user's role.
4. Confirm access is denied or redirected.
5. Confirm locked users cannot access protected pages.
6. Confirm only Admin can manage users and roles.
7. Confirm only Committee can create events and certificate drafts.
8. Confirm High Council can review/forward/reject paperwork and Club Advisor can give final approval/rejection.
9. Confirm Students can only view their own registrations and issued certificates.
10. Confirm Public Verifier can verify without login.

Expected result:

- Users cannot access pages outside their role.
- Route protection and API role checks agree.
- RLS policies do not expose unauthorized data.

### Role Access Matrix

Verify the following access expectations after RBAC changes:

| Area | Admin | Committee | High Council | Club Advisor | Student | Public |
| --- | --- | --- | --- | --- | --- | --- |
| Admin user management | Allow | Deny | Deny | Deny | Deny | Deny |
| Event creation/editing | Deny or system-only if configured | Allow | Deny | Deny | Deny | Deny |
| Event approval/rejection | Deny unless configured | Deny | Allow first review/forward/reject | Allow final approval/rejection | Deny | Deny |
| Certificate draft creation | Deny or system-only if configured | Allow | Deny | Deny | Deny | Deny |
| Certificate approval/rejection | Deny unless configured | Deny | Deny | Allow final approval/rejection | Deny | Deny |
| Student event registration | Deny | Deny | Deny | Deny | Allow | Deny |
| Stripe payment checkout | Deny | Deny | Deny | Deny | Allow | Deny |
| Feedback submission | Deny | Deny | Deny | Deny | Allow for own registered completed event | Deny |
| Feedback analytics | Allow | Allow | Deny unless configured | Deny unless configured | Deny | Deny |
| Program calendar | Allow | Allow | Allow | Allow | Deny | Deny |
| Certificate download | Deny | Deny | Deny | Deny | Allow own issued/unlocked only | Deny |
| Public certificate verification | Allow | Allow | Allow | Allow | Allow | Allow |

If the current product intentionally differs from this matrix, document the exception in the test summary.

## Dashboard Verification

Use this section whenever dashboard cards, nav, guards, or role redirects change.

### Admin Dashboard

1. Confirm Admin lands on `/admin` after login.
2. Confirm Admin navigation includes user management, reports, payments/system records, profile, feedback analytics, and program calendar.
3. Confirm system-level statistics load without exposing student-only or committee-only actions.
4. Confirm Admin can manage user roles and account status.
5. Confirm Admin-only pages deny Committee, High Council, Club Advisor, Student, and logged-out users.

### Committee Dashboard

1. Confirm Committee lands on `/committee` after login.
2. Confirm navigation includes create events, approval status, event details, certificate drafts, feedback analytics, profile, and program calendar.
3. Confirm Committee can create/edit events and submit paperwork.
4. Confirm Committee can view approval status and resubmit rejected events.
5. Confirm Committee cannot approve events/certificates or manage users unless explicitly configured.

### High Council Dashboard

1. Confirm High Council lands on `/high-council` after login.
2. Confirm navigation includes paperwork review, profile, and program calendar.
3. Confirm High Council can forward or reject submitted event paperwork.
4. Confirm High Council cannot approve/reject certificate drafts.
5. Confirm High Council cannot create events, manage users, submit student feedback, or download student certificates.

### Club Advisor Dashboard

1. Confirm Club Advisor lands on `/club-advisor` after login.
2. Confirm navigation includes paperwork review, certificates, profile, and program calendar.
3. Confirm Club Advisor can perform the configured approval stage.
4. Confirm Club Advisor cannot manage users, create committee events, or access student-only pages.

### Student Dashboard

1. Confirm Student lands on `/student` after login.
2. Confirm navigation includes available events, registrations, certificates, and profile.
3. Confirm registered events and certificate counts load.
4. Confirm Student cannot access Admin, Committee, High Council, or Club Advisor dashboards.
5. Confirm Student sees `Pending Feedback` for issued certificates until feedback is submitted.

## Event Management Edge Cases

Use this section when changing event forms, event APIs, status handling, calendar, or public event listing.

1. Create event as Draft and confirm it is not public.
2. Create event as Pending Approval and confirm it appears in High Council queue.
3. Edit title, location, dates, capacity, fee, poster, and paperwork fields.
4. Confirm invalid required fields show clear errors.
5. Confirm end date before start date is rejected or clearly warned.
6. Confirm capacity cannot be negative or zero.
7. Confirm fee cannot be negative.
8. Confirm rejected event can be edited and resubmitted.
9. Confirm published event appears in `/events` and student event list.
10. Confirm completed event no longer appears publicly unless intentionally configured.
11. Confirm event creator/organizer is preserved in `created_by`.
12. Confirm poster upload errors and paperwork upload errors show clear messages.

## UI/UX Verification

Run these checks for visible UI changes:

1. Verify desktop and mobile viewport layouts.
2. Confirm text does not overlap, truncate awkwardly, or overflow buttons/cards/tables.
3. Confirm loading, empty, success, error, and unauthorized states are visible.
4. Confirm primary actions are disabled while submitting.
5. Confirm destructive or irreversible actions ask for confirmation.
6. Confirm navigation active states and redirects are correct.
7. Confirm forms preserve user input when validation fails where practical.
8. Confirm tables are horizontally scrollable on small screens.
9. Confirm color-coded statuses are still readable and accessible.
10. Confirm browser console has no new errors on tested routes.

## Known Historical Test Results

### Student Role

Credentials:

- Matrix Number: `AI220385`
- Password: `123456aA`

Previously verified:

- Login authentication works.
- Dashboard displays correctly.
- Registered events were visible.
- Certificates were visible.
- Navigation menu works.
- Sidebar toggle works.
- Notifications button appears.
- User profile menu appears.
- Logout works.

### Club Advisor Role

Credentials:

- Name: `suriawati`
- Password: `suriawati123`

Previously verified:

- Login authentication works.
- Dashboard displays correctly.
- Pending certificate and approval statistics display.
- Navigation menu works.
- Quick actions appear.
- Profile and logout work.
- Can access paperwork approval and certificate approval areas.

### Historical Issues

These may already be fixed, but check them if related tests fail:

- Older Admin credentials `A12345678` / `password123` failed because the matrix number was not found.
- High Council testing previously required valid credentials.
- High Council login previously appeared to share Club Advisor login behavior.
- Facility Manager routes existed historically but were not exposed in the login UI.

## Creating Test Users

Create test users only when needed and only in a safe test/development project. Do not overwrite production users.

### Auth User

1. Go to Supabase Console.
2. Open Authentication > Users.
3. Add a user with confirmed email and a test password.

### public.users Profile

Example Admin profile:

```sql
INSERT INTO public.users (
  id,
  email,
  matrix_number,
  name,
  role,
  created_at
)
SELECT
  id,
  email,
  'ADMIN001',
  'System Administrator',
  'admin',
  now()
FROM auth.users
WHERE email = 'admin@itc.test'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@itc.test'
);
```

Example High Council profile:

```sql
INSERT INTO public.users (
  id,
  email,
  matrix_number,
  name,
  role,
  created_at
)
SELECT
  id,
  email,
  'HC220001',
  'High Council Member',
  'high_council',
  now()
FROM auth.users
WHERE email = 'highcouncil@itc.test'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'highcouncil@itc.test'
);
```

Adjust role names to match the current database constraints and RBAC model.

## What To Report After Testing

Every verification summary should include:

- Commands run.
- Browser routes tested.
- User role used.
- Database queries or schema checks performed, if any.
- Tests passed.
- Tests not run and why.
- Any remaining warnings or known risks.
- Migration filename and database changes, if a migration was applied.

## Current Expected Result

The system should support:

- Role-based login and dashboards.
- Event paperwork submission and approval/rejection.
- Event publishing.
- Student registration and Stripe payment.
- Certificate draft generation and approval.
- Feedback before certificate access where enabled.
- Public certificate verification.
- Program planning calendar for management roles.

When a feature touches one of these areas, use the corresponding section in this runbook before marking the work complete.
