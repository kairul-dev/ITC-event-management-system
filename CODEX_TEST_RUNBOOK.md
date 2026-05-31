# Codex Test Runbook

Use this file whenever Codex needs to test, verify, or prepare the ITC Event Management System for FYP demo.

## Purpose

This runbook tells Codex what to test after code changes. It should be used instead of repeatedly asking the user for testing instructions.

## Main Rule

Do not add new major features unless the user explicitly requests them. Focus on stability, role access, workflow correctness, and demo readiness.

## Safe Database Rule

The project has old duplicate Supabase migration versions. Therefore:

- Do not run `supabase db push`.
- If a database change is required, create a uniquely timestamped migration using `YYYYMMDDHHMMSS_feature_name.sql`.
- Apply only the new migration using:

```bash
npx.cmd supabase db query --linked --file "supabase/migrations/<migration_file>.sql"
```

- After successful SQL execution, repair only the new migration version:

```bash
npx.cmd supabase migration repair --linked --status applied <migration_version>
```

- Do not repair old duplicate migrations unless the user explicitly approves.
- Do not drop tables, remove columns, or delete data without explicit confirmation.

## Required Commands After Changes

Run these commands after every meaningful code change:

```bash
npm.cmd run lint
npm.cmd run build
```

If either command fails, fix the issue before reporting completion.

## Role Access Checklist

Verify navigation and access control for these roles:

- Admin
- Committee
- President
- Club Advisor
- Student
- Public Verifier

Check that:

- Unauthenticated users are redirected to login for protected pages.
- Students cannot access staff dashboards.
- Committee cannot access admin-only user management.
- President and Club Advisor approval pages are separated clearly.
- Public verifier can access certificate verification without login.

## End-to-End FYP Demo Workflow

Test the full workflow in this order:

1. Admin or Committee creates event/program paperwork.
2. Event enters approval workflow.
3. President or High Council reviews event.
4. Club Advisor gives final approval.
5. Event becomes Approved or Published.
6. Student views available event.
7. Student registers for event.
8. If the event is paid, student completes Stripe test payment.
9. Event is marked Completed or Closed.
10. Student opens feedback QR/link.
11. Student submits event feedback.
12. Student certificate changes from Pending Feedback to Available.
13. Student views/downloads certificate.
14. Certificate can be verified through the public verification page.
15. Blockchain verification flow remains unchanged.

## Feature-Specific Tests

### Event Management

Check:

- Create event
- Edit event
- Submit for approval
- Reject event with reason
- Resubmit after rejection
- Publish event
- Complete or close event
- Conflict warning appears when event dates overlap

### Program Planning Calendar

Check these pages:

- `/admin/program-calendar`
- `/committee/program-calendar`
- `/president/program-calendar`
- `/club-advisor/program-calendar`

Verify:

- Month view works
- Week view works
- List view works
- Status colors display correctly
- Filters by month, status, and organizer work
- Dashboard statistics are correct

### Student Event Registration

Check:

- Student can view Published events only
- Student cannot register for full event
- Student cannot register after deadline
- Student cannot register twice
- Free event is automatically marked paid
- Paid event starts Stripe Checkout

Use Stripe test card:

```text
4242 4242 4242 4242
Any future expiry
Any CVC
```

### Feedback QR and Certificate Unlock

Check:

- `/feedback/<eventId>` loads event information
- Unauthenticated student is asked to log in
- Registered student can submit feedback only once
- Rating must be between 1 and 5
- Comments are optional
- `is_anonymous` works if available in UI
- Certificate is locked before feedback
- Certificate is available after feedback
- Admin and Committee feedback analytics pages load

Check these pages:

- `/admin/feedback`
- `/committee/feedback`

Verify:

- Average rating
- Total responses
- Rating distribution
- Recent comments

### Certificate and Blockchain Verification

Check:

- Certificate generation still works
- Approved/issued certificate appears in student dashboard
- Certificate remains locked until feedback is submitted
- Certificate view/download works after feedback
- Public verification page works without login
- Sepolia verification endpoint does not break existing local certificate verification

Do not modify blockchain contract or Sepolia logic unless there is a bug.

## Test Accounts

If test accounts are missing, create or request non-production demo accounts for:

- Admin
- Committee
- President or High Council
- Club Advisor
- Student

Do not commit real passwords.

If creating a document, use placeholders only:

```text
Role: Student
Email/Matrix: <demo_student>
Password: <demo_password>
```

## Reporting Format

After testing, report in this format:

```markdown
## Test Summary

### Commands
- npm.cmd run lint: Pass/Fail
- npm.cmd run build: Pass/Fail

### Workflow Tested
- Event creation: Pass/Fail
- Approval workflow: Pass/Fail
- Student registration: Pass/Fail
- Payment: Pass/Fail/Skipped
- Feedback submission: Pass/Fail
- Certificate unlock: Pass/Fail
- Certificate verification: Pass/Fail

### Role Access
- Admin: Pass/Fail
- Committee: Pass/Fail
- President: Pass/Fail
- Club Advisor: Pass/Fail
- Student: Pass/Fail
- Public Verifier: Pass/Fail

### Issues Fixed
- ...

### Remaining Issues
- ...

### Notes
- ...
```

## When to Stop

Stop and ask the user before:

- Running destructive database changes
- Repairing old duplicate migrations
- Changing blockchain contract logic
- Removing existing routes or modules
- Committing secrets
- Rewriting the whole system architecture
