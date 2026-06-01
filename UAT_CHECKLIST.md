# UAT Checklist

Use this checklist for user acceptance testing before the final demo.

## Environment

- [ ] `.env.local` is present locally and not committed.
- [ ] Supabase project is linked.
- [ ] Supabase Auth users exist for all required roles.
- [ ] Stripe test mode is configured.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is added if client-side Stripe publishable key is needed.
- [ ] Sepolia RPC and certificate contract address are configured.
- [ ] `npm.cmd run lint` passes with no errors.
- [ ] `npm.cmd run build` passes.

## Role-Based Access Control

- [ ] Admin logs in and lands on `/admin`.
- [ ] Committee logs in and lands on `/committee`.
- [ ] High Council logs in and lands on `/high-council`.
- [ ] Club Advisor logs in and lands on `/club-advisor`.
- [ ] Student logs in and lands on `/student`.
- [ ] Logged-out users are redirected from protected dashboards.
- [ ] Student cannot access Admin, Committee, High Council, or Club Advisor routes.
- [ ] Admin can manage users and roles.
- [ ] Committee can create/edit events.
- [ ] High Council can forward submitted events to Club Advisor or reject them.
- [ ] Club Advisor can perform configured approval/certificate review.

## Dashboards

- [ ] Admin dashboard loads stats and quick actions.
- [ ] Committee dashboard loads operational navigation.
- [ ] High Council dashboard loads approval navigation.
- [ ] Club Advisor dashboard loads review navigation.
- [ ] Student dashboard loads registrations/certificates.
- [ ] No tested dashboard shows browser console errors.

## Event Management

- [ ] Committee can create Draft event.
- [ ] Demo Committee account `AI220386` can access `/committee`.
- [ ] Committee can submit event for approval.
- [ ] Required fields show validation errors.
- [ ] Event date overlap warning appears.
- [ ] Event overlap warning does not block submission.
- [ ] Rejected event can be edited and resubmitted.
- [ ] Approved event can be published.
- [ ] Published event appears on `/events`.

## Approval Workflow

- [ ] High Council sees submitted events.
- [ ] High Council can forward event to Club Advisor.
- [ ] High Council can reject event with reason.
- [ ] Club Advisor sees relevant approval queue if configured.
- [ ] Club Advisor can approve/reject where configured.
- [ ] Approval status updates in creator dashboard.
- [ ] Approval history is recorded if enabled.

## Program Planning Calendar

- [ ] Admin can open Program Calendar.
- [ ] Committee can open Program Calendar.
- [ ] High Council can open Program Calendar.
- [ ] Club Advisor can open Program Calendar.
- [ ] Student cannot open Program Calendar.
- [ ] Month view works.
- [ ] Week view works.
- [ ] List view works.
- [ ] Status colors match requirements.
- [ ] Month/status/organizer filters work.
- [ ] Stats cards load.

## Student Registration And Stripe Payment

- [ ] Student can open published event details.
- [ ] Student can register for event.
- [ ] Duplicate registration is prevented or handled gracefully.
- [ ] Student can start Stripe checkout.
- [ ] Free event path can be demonstrated without Stripe charge.
- [ ] Cancelled checkout does not mark registration paid.
- [ ] Successful checkout marks registration paid.
- [ ] Admin can view paid payment record.

## Certificate Workflow

- [ ] Certificate draft can be generated for eligible paid student.
- [ ] Duplicate certificate generation is prevented or handled.
- [ ] Club Advisor can approve certificate draft.
- [ ] Unauthorized roles cannot approve certificate.
- [ ] Issued certificate appears for student.
- [ ] Certificate download works after unlock.

## Feedback QR And Analytics

- [ ] Public feedback QR link opens without login.
- [ ] Logged-out feedback page prompts student login.
- [ ] Feedback is only open for Completed/Closed events.
- [ ] Registered student can submit rating 1-5.
- [ ] Invalid rating is rejected.
- [ ] Duplicate feedback is prevented.
- [ ] Certificate changes from Pending Feedback to Available.
- [ ] Admin can view feedback analytics.
- [ ] Committee can view feedback analytics.
- [ ] Seeded demo feedback for `FYP Demo UAT Event 20260601` appears in analytics.
- [ ] Anonymous comments hide student identity.

## Public Verification And Blockchain

- [ ] Public verifier can open `/verify-certificate`.
- [ ] Invalid certificate returns invalid result.
- [ ] Known issued certificate returns local certificate data.
- [ ] Sepolia configuration is detected.
- [ ] Missing on-chain record does not show valid.
- [ ] Hash mismatch shows invalid.
- [ ] No private user/payment/feedback data is exposed publicly.

## UI/UX

- [ ] Desktop layout is readable.
- [ ] Mobile layout is readable.
- [ ] Tables scroll horizontally when needed.
- [ ] Buttons and labels do not overflow.
- [ ] Loading states are visible.
- [ ] Empty states are clear.
- [ ] Error states are clear.
- [ ] Status colors are readable.
