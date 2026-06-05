-- Fix production workflow blockers without removing data.
-- 1. Allow the full event approval handoff statuses used by the app.
-- 2. Add optional registration tracking fields selected by student/committee pages.

begin;

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (
    status in (
      'Draft',
      'Pending Approval',
      'Pending High Council Approval',
      'Pending Club Advisor Approval',
      'Approved',
      'Rejected',
      'Published',
      'Closed',
      'Completed'
    )
  );

alter table public.event_registrations
  add column if not exists status text not null default 'registered',
  add column if not exists checked_in_at timestamptz;

alter table public.event_registrations
  drop constraint if exists event_registrations_status_check;

alter table public.event_registrations
  add constraint event_registrations_status_check
  check (
    status in (
      'registered',
      'attended',
      'checked_in',
      'completed',
      'cancelled'
    )
  );

commit;
