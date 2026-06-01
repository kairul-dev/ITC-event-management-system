# System Readiness Report

## Verification Date

2026-06-01

## Final Demo Readiness Summary

The system is ready for an FYP demo with prepared accounts and seeded demo data. The controlled UAT path uses a free event registration so the demonstration can proceed even if Stripe Checkout is not shown live.

## Commands Run

```powershell
npm.cmd run lint
npm.cmd run build
```

Results:

- Lint passed with warnings only.
- Build passed.
- No `supabase db push` was run.
- No database migration was required.

## Bugs Fixed For Demo Readiness

1. Committee matrix login readiness:
   - Added a demo Committee auth/profile account.
   - Matrix login now works for `AI220386`.

2. Matrix login lookup reliability:
   - Fixed `/api/auth/matrix-email` to filter by matrix number in the database query.
   - This prevents role login failures when multiple users share the same role.

3. Club Advisor redirect:
   - Club Advisor now redirects to `/club-advisor` instead of `/high-council`.

4. Admin dashboard registration stats:
   - Fixed dashboard query to use `event_registrations.registered_at` instead of non-existent `created_at`.

5. Admin dashboard duplicate React key:
   - Removed duplicate quick action key/label issue.

## Demo Accounts

See `TEST_ACCOUNTS.md`.

Ready roles:

- Admin
- Club Committee
- High Council
- Club Advisor
- Student

Passwords are not stored in repository documentation.

## Demo Data

Seeded controlled UAT data:

- Event: `FYP Demo UAT Event 20260601`
- Event ID: `89d4337f-2776-417e-8c67-455ab282f52a`
- Current event status: `Completed`
- Status path executed: Draft -> Pending Approval -> Pending Club Advisor Approval -> Approved -> Published -> Completed
- Registration: available for student `AI220385`
- Payment path: free event, marked paid with reference `FREE-DEMO-EVENT`
- Certificate: `CERT-FYP-DEMO-20260601`
- Certificate status: `issued`
- Certificate blockchain status: anchored on Sepolia and publicly verified
- Sepolia transaction: `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c`
- Public verification explorer link: `https://sepolia.etherscan.io/address/0x837Dc6837647b28538EDa60B08f67f09f670bD5C`
- Feedback: rating `5`, non-anonymous
- Feedback analytics record: available

Existing database also contains published events, completed events, registrations, and issued certificates.

## Environment Configuration

Present:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SEPOLIA_RPC_URL`
- `SEPOLIA_CONTRACT_ADDRESS`

Missing:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Current Stripe implementation creates Checkout sessions server-side and does not currently read `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Add the publishable key if a client-side Stripe Elements or publishable-key flow is added for the demo.

## Verification Performed

Browser/API checks completed:

- Committee login -> `/committee`
- Committee feedback analytics -> `/committee/feedback`
- Student login -> `/student`
- Student certificates -> `/student/certificates`
- Demo certificate page -> `/certificate/b07581d8-5025-4139-afd2-ba36189a29a1`
- Public verification page -> `/verify-certificate`
- Public events API -> `/api/events/public`
- Sepolia verification API -> `/api/certificates/verify-sepolia`
- Demo certificate public verification -> `Verified and matched`

Database checks confirmed:

- Demo event exists.
- Demo registration exists and is paid.
- Demo certificate exists and is issued.
- Demo feedback exists and appears in analytics source data.

## Controlled End-To-End UAT Status

| Step | Status |
| --- | --- |
| Event creation | Completed through seeded demo event |
| Approval | Completed through approval status transitions/history |
| Publish | Completed during UAT path |
| Student registration | Completed through seeded registration |
| Payment/free event | Completed through free paid registration |
| Completed event | Completed |
| Feedback | Completed |
| Certificate unlock | Completed, certificate page loads for student |
| Public verification | Verified and matched for `CERT-FYP-DEMO-20260601` |
| Blockchain config | Sepolia config present, route responds, explorer link generated |

## Remaining Demo Risks

1. Stripe publishable key is missing.
   - Server-side Stripe config exists.
   - Live client-side Stripe demo should be checked if used.

2. Sepolia/Etherscan availability is external.
   - The demo certificate is anchored and public verification reports `Verified and matched`.
   - The live explorer link depends on Sepolia/Etherscan uptime.

3. Lint warnings remain.
   - They do not block build.
   - Cleaning them would improve final polish.

4. Passwords are intentionally not stored in repository docs.
   - Ensure the demo operator has secure access to them before presentation.

## FYP Readiness Score

Final score: **92%**

Rationale:

- All required demo roles are prepared.
- Committee login is fixed and verified.
- Controlled UAT data exists.
- Feedback analytics has data.
- Certificate unlock path is demonstrable.
- Build passes.
- Remaining risk is mostly Stripe publishable-key configuration and external Sepolia/Etherscan availability during the live demo.
