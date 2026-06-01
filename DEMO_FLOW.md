# Demo Flow

Use this sequence for the FYP demonstration. Test accounts and seed data are listed in `TEST_ACCOUNTS.md`.

## 1. Public Landing And Verification

1. Open `/`.
2. Open `/events` and show only published events are public.
3. Open `/verify-certificate`.
4. Search demo certificate `CERT-FYP-DEMO-20260601`.
5. Show `Verified and matched`.
6. Open the generated Sepolia contract link.
7. If needed, reference anchor transaction `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c`.

## 2. Admin System Management

1. Log in as Admin.
2. Show Admin Dashboard statistics.
3. Open Users and show role/status management.
4. Open Program Calendar.
5. Switch Month, Week, and List views.
6. Show status color coding and filters.
7. Open Feedback Analytics and show the seeded feedback summary.

## 3. Committee Event Operations

1. Log in as Club Committee using matrix `AI220386`.
2. Open Create Events.
3. Show the prepared demo event `FYP Demo UAT Event 20260601`.
4. Demonstrate overlap warning by selecting dates that conflict with an existing event if creating an additional throwaway draft.
5. Show Approval Status and explain the demo event has already moved through approval for the final walkthrough.

## 4. High Council Review

1. Log in as High Council.
2. Open Review Paperwork.
3. Review submitted event details.
4. Approve one prepared pending event if available, or show approval history for the demo UAT event.
5. Reject another event with a reason if prepared.
6. Open Program Calendar and show management visibility.

## 5. Club Advisor Approval

1. Log in as Club Advisor.
2. Open Review Paperwork or Certificates according to the configured approval stage.
3. Approve a pending certificate draft if available.
4. Show the demo issued certificate `CERT-FYP-DEMO-20260601`.

## 6. Student Registration And Payment

1. Log in as Student.
2. Open Available Events.
3. Register for a published event if demonstrating live registration.
4. Open My Registrations.
5. For the controlled UAT path, use the free demo event registration already marked paid with reference `FREE-DEMO-EVENT`.
6. Explain Stripe test checkout separately if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is added for a client-side Stripe path.

## 7. Certificate And Feedback Unlock

1. Open Student > My Certificates.
2. Show the issued demo certificate for `FYP Demo UAT Event 20260601`.
3. Open the event feedback QR/public link.
4. Show the seeded rating response.
5. Return to My Certificates.
6. Show certificate is Available because feedback exists.
7. Open and download the certificate.

## 8. Admin/Committee Feedback Analytics

1. Log in as Admin or Committee.
2. Open Feedback Analytics.
3. Show average rating, total responses, rating distribution, recent comments, and QR link.
4. Confirm anonymous feedback hides student identity when anonymous responses are present.

## Demo Close

End by showing:

- Role-based dashboards.
- Approval workflow.
- Calendar planning.
- Stripe payment readiness.
- Certificate feedback gate.
- Public blockchain-backed verification.
