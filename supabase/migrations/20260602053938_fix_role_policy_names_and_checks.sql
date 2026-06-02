drop policy if exists "Approvers can read certificate drafts" on public.certificates;
drop policy if exists "Approvers can issue certificates" on public.certificates;
drop policy if exists "Club Advisor can read certificate drafts" on public.certificates;
drop policy if exists "Club Advisor can issue certificates" on public.certificates;

create policy "Club Advisor can read certificate drafts"
on public.certificates
for select
to authenticated
using (private.current_user_has_any_role(array['club_advisor']));

create policy "Club Advisor can issue certificates"
on public.certificates
for update
to authenticated
using (
  private.current_user_has_any_role(array['club_advisor'])
  and status = 'pending_approval'
)
with check (
  private.current_user_has_any_role(array['club_advisor'])
  and status in ('issued', 'rejected')
);

drop policy if exists "Staff can read feedback analytics" on public.event_feedback;
drop policy if exists "Admin and Committee can read feedback analytics" on public.event_feedback;

create policy "Admin and Committee can read feedback analytics"
on public.event_feedback
for select
to authenticated
using (private.current_user_has_any_role(array['admin', 'committee']));

drop policy if exists "staff_read_all" on public.event_registrations;
drop policy if exists "Admin and Committee can read registrations" on public.event_registrations;

create policy "Admin and Committee can read registrations"
on public.event_registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('admin', 'committee')
  )
);

drop policy if exists "Approvers can read events" on public.events;
drop policy if exists "Approvers can approve pending events" on public.events;
drop policy if exists "High Council and Club Advisor can read events" on public.events;
drop policy if exists "High Council and Club Advisor can review events" on public.events;

create policy "High Council and Club Advisor can read events"
on public.events
for select
to authenticated
using (private.current_user_has_any_role(array['high_council', 'club_advisor']));

create policy "High Council and Club Advisor can review events"
on public.events
for update
to authenticated
using (
  (
    private.current_user_has_any_role(array['high_council'])
    and status in ('Pending Approval', 'Pending High Council Approval')
  )
  or (
    private.current_user_has_any_role(array['club_advisor'])
    and status = 'Pending Club Advisor Approval'
  )
)
with check (
  (
    private.current_user_has_any_role(array['high_council'])
    and status in ('Pending Club Advisor Approval', 'Rejected')
  )
  or (
    private.current_user_has_any_role(array['club_advisor'])
    and status in ('Approved', 'Rejected')
  )
);
