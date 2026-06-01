# Migration History Note

## Repository Migration Files

The repository currently includes these migration files:

- `supabase/migrations/20260411_admin_update_user_roles.sql`
- `supabase/migrations/20260411_admin_user_delete_cascade.sql`
- `supabase/migrations/20260411_event_fee_amount.sql`
- `supabase/migrations/20260411_event_registration_payment.sql`
- `supabase/migrations/20260411_login_matrix_lookup_rpc.sql`
- `supabase/migrations/20260411_users_rls_recursion_hotfix.sql`
- `supabase/migrations/20260422_facility_management.sql`
- `supabase/migrations/20260422_users_add_facility_manager_role.sql`
- `supabase/migrations/20260423_event_notifications.sql`
- `supabase/migrations/20260514_users_add_high_council_role.sql`
- `supabase/migrations/20260516_event_approval_workflow.sql`
- `supabase/migrations/20260517_club_advisor_name_login_rpc.sql`
- `supabase/migrations/20260517_events_rls_workflow_policies.sql`
- `supabase/migrations/20260517_fix_high_council_event_review_policy.sql`
- `supabase/migrations/20260517_fix_review_event_paperwork_role_variable.sql`
- `supabase/migrations/20260517_normalize_review_event_paperwork_rpc_roles.sql`
- `supabase/migrations/20260517_review_event_paperwork_rpc.sql`
- `supabase/migrations/20260517_role_scoped_matrix_login_rpc.sql`
- `supabase/migrations/20260519_certificates_rls_policies.sql`
- `supabase/migrations/20260519_harden_internal_rpc_helpers.sql`
- `supabase/migrations/20260519_harden_matrix_login_rpcs.sql`
- `supabase/migrations/20260519_restore_review_event_paperwork_security_definer.sql`
- `supabase/migrations/20260521_harden_is_admin_helper.sql`
- `supabase/migrations/20260521_harden_users_select_policy.sql`
- `supabase/migrations/20260601124500_add_event_feedback_module.sql`
- `supabase/migrations/20260601_align_role_workflow_access.sql`

## Recorded Supabase Migration Versions

The linked Supabase project currently records only these applied versions in `supabase_migrations.schema_migrations`:

- `20260411`
- `20260601`
- `20260601124500`

## Known Migration History Mismatch

- The repository contains a full sequence of migration files, but the live Supabase migration ledger records only three versions.
- The live schema already contains later tables, functions, and RLS policies, so the database state is ahead of the recorded ledger.
- This means the current project cannot be fully reconstructed from the remote migration history alone.

## Why The Historical Migrations Were Preserved

- They document the schema and RLS evolution that produced the current application state.
- They preserve recovery context if the project needs to be rebuilt, audited, or re-linked later.
- They provide a source of truth for future `supabase db diff` or recovery workflows.

## Current Live Schema Status

The linked database currently exposes the expected application objects, including:

- Core tables such as `approval_history`, `certificates`, `event_feedback`, `event_registrations`, `events`, `facilities`, `facility_availability`, and `users`.
- Helper routines such as `get_current_user_role`, `get_email_by_matrix`, `get_email_by_matrix_and_role`, `is_admin`, and `review_event_paperwork`.
- RLS policies for admin, staff, committee, student, and public access paths.

That confirms the live schema is functionally present, but the migration ledger is incomplete.

## Recovery Recommendation

- Keep all migration files committed.
- Do not repair, squash, or rewrite the history unless the remote project ledger is intentionally reconstructed first.
- For future recovery, treat the repository migration files plus a fresh schema dump as the baseline reference set.
- Before any future reconciliation, compare the live schema to the repo migrations and archive the result.
