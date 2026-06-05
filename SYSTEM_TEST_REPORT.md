# System Test Report

**System:** ITC Secure Document Verification System  
**Environment:** Production Vercel deployment  
**Production URL:** https://itc-secure-document-verification-sy.vercel.app  
**Test Date:** 5 June 2026  
**Tester:** Codex automated QA with browser, API, Supabase, Stripe sandbox, and Sepolia checks  

## 1. Test Summary

| Item | Result |
| --- | --- |
| Total checks executed | 74 |
| Passed | 60 |
| Failed | 6 |
| Warnings / partially verified | 8 |
| Overall status | Partially ready |
| Production build status | Passed |
| Lint status | Passed with existing warnings |
| Latest deployed fix | `d340ce4 Fix certificate blockchain timestamp hashing` |
| Vercel deployment | `dpl_Dnhmn3ohHnzVqZLZb5iqok4X6hWi` |

The system is suitable for controlled FYP demonstration after choosing demo paths that avoid the current approval-forward and automatic Stripe-return issues. Public certificate verification and Sepolia hash validation are working after the timestamp hashing fix.

## 2. Workflow Validation

| Phase | Status | Evidence / Notes |
| --- | --- | --- |
| Authentication | Passed | Admin, Club Committee, High Council, Club Advisor, and Student accounts successfully authenticated with prepared demo credentials. Invalid passwords were rejected. |
| Role-based redirect | Passed | Correct roles redirect to their dashboards. Student access to `/admin` redirects back to `/student`. |
| Profile module | Partial | Profile routes are accessible. Full edit/save testing was not performed for every role to avoid unnecessary production profile mutation. |
| Event management | Partial | Event list, detail, and dashboard routes load. Existing event data can be browsed. |
| High Council approval | Failed | Forwarding paperwork to Club Advisor fails with database check constraint error. |
| Club Advisor approval | Blocked | Cannot complete live workflow from High Council because the previous handoff fails. Existing Club Advisor pages load. |
| Student registration | Failed | Registration row exists in database, but Student "My Registrations" UI showed empty state for the registered paid event. |
| Payment testing | Partial | Stripe sandbox payment completed successfully. Manual confirmation API updated registration to `paid`; automatic return flow did not confirm payment because the user landed on login. |
| Certificate generation | Partial | Existing issued demo certificate is available. New certificate generation was not executed because workflow was intentionally stopped at known blockers. |
| Certificate approval | Partial | Existing certificate approval data is present. End-to-end new approval was blocked by event approval issue. |
| Blockchain verification | Passed | Demo certificate validates against Sepolia after the deployed hash normalization fix. |
| Student certificate viewing | Passed | Student certificate list and certificate detail page render issued demo certificate. |
| Public verification | Passed | Public verification page reports "Verified and matched" for the demo certificate. |
| Reports | Partial | Admin reports route loads. Export/filter behavior was not fully exercised. |
| UI button audit | Partial | Major navigation and primary workflow buttons were tested. Broken actions found in approval forward and payment/registration flow. |
| Security | Passed with warning | Protected pages and APIs reject unauthenticated or wrong-role access in tested paths. One admin role API returned 405 for POST and needs method-specific API test coverage. |

## 3. Verified Test Accounts

| Role | Login ID | Status |
| --- | --- | --- |
| Admin | `AI220382` | Login works |
| Club Committee | `AI220384` | Login works |
| High Council | `AI220383` | Login works |
| Club Advisor | `suriawati` | Login works |
| Student | `AI220385` | Login works |

All listed accounts authenticated with the prepared demo password. Secret values are intentionally not included in this report.

## 4. Database Validation

| Table / Area | Result |
| --- | --- |
| `users` | 9 records found. Role profiles exist for all demo roles. |
| `events` | 38 records found. Demo completed event exists. |
| `event_registrations` | 17 records found. Paid-event registration exists for the student after Stripe confirmation. |
| `certificates` | 8 records found. Demo certificate exists and is issued. |
| `event_feedback` | 2 records found. Demo feedback response exists with `is_anonymous = false`. |
| `approval_history` | 3 records found. Approval tracking table exists. |

Demo certificate:

| Field | Value |
| --- | --- |
| Certificate No | `CERT-FYP-DEMO-20260601` |
| Certificate ID | `b07581d8-5025-4139-afd2-ba36189a29a1` |
| Status | `issued` |
| Certificate hash | `84753b93f2a38b30cc9659e09ff74251918bf0f73686a0e12169781db8b8931b` |

Demo paid registration:

| Field | Value |
| --- | --- |
| Event | `Cybersecurity Capture The Flag Night` |
| Event ID | `50f7276e-6df6-4c02-a97c-2e7830ed9f80` |
| Student user ID | `356e6cc2-2cbc-4651-897c-43182eb7dce4` |
| Registration ID | `fda776cc-77a8-4f23-9b3d-077ef15135de` |
| Payment status | `paid` |
| Payment reference | `pi_3Tewt34RgPFT8TKS1DXNBDpr` |

## 5. Blockchain Verification

| Check | Result |
| --- | --- |
| Certificate found | Yes |
| Certificate hash exists | Yes |
| Anchored on Sepolia | Yes |
| Public verification working | Yes |
| Hash match | Yes |
| Explorer URL generated | Yes |

Blockchain evidence:

| Field | Value |
| --- | --- |
| Certificate | `CERT-FYP-DEMO-20260601` |
| Contract | `0x837Dc6837647b28538EDa60B08f67f09f670bD5C` |
| Transaction | `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c` |
| Verified hash | `84753b93f2a38b30cc9659e09ff74251918bf0f73686a0e12169781db8b8931b` |
| Explorer | https://sepolia.etherscan.io/address/0x837Dc6837647b28538EDa60B08f67f09f670bD5C |

Fix applied during QA:

- File changed: `lib/certificateBlockchain.ts`
- Root cause: certificate hash generation interpreted a timezone-less `issued_at` timestamp differently between local Malaysia time and Vercel UTC.
- Fix: normalize timezone-less certificate timestamps as Malaysia time (`+08:00`) before hashing.
- Result: production API now returns `valid: true` and `hashMatches: true` for `CERT-FYP-DEMO-20260601`.

## 6. Payment Validation

| Check | Result |
| --- | --- |
| Paid event found | Yes |
| Student registration created | Yes |
| Stripe checkout session created | Yes |
| Stripe sandbox payment completed | Yes |
| Payment confirmation API works with valid token | Yes |
| Automatic return confirmation | Failed |

Stripe evidence:

| Field | Value |
| --- | --- |
| Stripe checkout session | `cs_test_a12Afloru013FWLoPAbamZrs3shu9hzqMfjumGdGwDTCMjE3JRfAUByBM6` |
| Stripe session status | `complete` |
| Stripe payment status | `paid` |
| Registration payment status after manual confirmation | `paid` |

Issue: after successful Stripe payment, the app returned to `/login?role=student` before client-side confirmation could run. The existing confirmation API works when called with a valid student token, so the payment backend is usable but the return/session flow needs correction.

## 7. Route and Security Audit

Routes smoke-tested without server crashes:

- Public: `/`, `/login`, `/register`, `/verify`, `/verify-certificate`, `/events`
- Student: `/student`, `/student/events`, `/student/registered-events`, `/student/certificates`
- Committee: `/committee`, `/committee/event?mode=events#event-details`, `/committee/approval-status`, `/committee/certificates`, `/committee/feedback`
- High Council: `/high-council`, `/high-council/events`
- Club Advisor: `/club-advisor`, `/club-advisor/events`, `/club-advisor/certificates`
- Admin: `/admin`, `/admin/users`, `/admin/report`, `/admin/payments`, `/admin/feedback`, `/admin/program-calendar`

Protected API checks:

| API | Unauthenticated result |
| --- | --- |
| `/api/payments/create-checkout-session` | 401 |
| `/api/payments/confirm-checkout-session` | 401 |
| `/api/events/review-paperwork` | 401 |
| `/api/admin/users/role` with POST | 405, method-specific follow-up recommended |

Security findings:

- Unauthenticated dashboard access redirects to login.
- Wrong-role admin access with student credentials is blocked.
- Public verifier remains accessible without login.
- Payment and approval APIs require authentication tokens.

## 8. Bugs Found

### Critical: High Council cannot forward paperwork to Club Advisor

**Result:** Failed  
**Reproduction:** Login as High Council, open `/high-council/events`, select pending paperwork, click `Forward to Club Advisor`.  
**Observed error:** `new row for relation "events" violates check constraint "events_status_check"`  
**Likely root cause:** `app/api/events/review-paperwork/route.ts` writes status `Pending Club Advisor Approval`, but the database `events.status` check constraint does not allow that value.  
**Recommended fix:** Use a safe migration to update the `events_status_check` constraint to include all implemented workflow statuses, or align the API status names with the existing constraint values.

### Critical: Stripe success return does not automatically confirm payment

**Result:** Failed  
**Observed behavior:** Stripe sandbox payment completed, but the app returned to `/login?role=student`, so the success page did not confirm payment automatically.  
**Evidence:** Manual call to the existing confirmation API with a valid student token updated the registration to `paid`.  
**Recommended fix:** Add a webhook-backed payment confirmation or make the success return route/session handling robust enough to confirm without losing authentication state.

### High: Student registrations page does not show existing registration

**Result:** Failed  
**Observed behavior:** Database had a registration for `Cybersecurity Capture The Flag Night`, but `/student/registered-events` and `/student/registrations` showed the empty state.  
**Recommended fix:** Inspect the student registration query, event join, and RLS policy. Confirm it filters by the authenticated user's `users.id` and handles paid/unpaid rows.

### Medium: Profile edit/save not fully validated for all roles

**Result:** Partial  
**Reason:** Profile pages are accessible, but full data mutation for every role was not executed to avoid changing production account details unnecessarily.  
**Recommended fix:** Add a dedicated safe profile test field or test account reset script.

### Medium: Admin role update API needs method-specific API test

**Result:** Warning  
**Observed behavior:** Unauthenticated POST returned 405. This may be correct if the route expects another method.  
**Recommended fix:** Add explicit API tests for the exact method used by Admin User Management.

### Low: Lint warnings remain

**Result:** Warning  
**Observed behavior:** `npm.cmd run lint` passed with existing warnings.  
**Recommended fix:** Clean warnings after demo-critical workflow bugs are fixed.

## 9. UI Button Audit

| Area | Result |
| --- | --- |
| Login role selection | Passed |
| Dashboard navigation | Passed |
| Student certificate actions | Passed |
| Public verify action | Passed |
| High Council forward action | Failed |
| Student registration/payment path | Partial |
| Admin/report navigation | Passed route smoke |
| Mobile/responsive visual audit | Partial |

The most visible broken demo actions are the High Council forward button and the Student registration listing/payment return path.

## 10. Readiness Decision

| Area | Readiness |
| --- | --- |
| Authentication and RBAC | 90% |
| Dashboard UI and navigation | 85% |
| Event approval workflow | 55% |
| Student registration and payment | 60% |
| Certificate viewing | 85% |
| Blockchain verification | 95% |
| Public verification | 95% |
| Reports | 70% |
| Overall FYP readiness | 78% |

## 11. Recommended Next Fix Order

1. Fix `events_status_check` or align approval status values so High Council can forward paperwork to Club Advisor.
2. Fix student registration listing so database registrations appear in the student UI.
3. Add webhook or robust success-return confirmation for Stripe payments.
4. Run a fresh complete workflow from event submission to certificate unlock after the first three fixes.
5. Re-run full screenshot collection using `SCREENSHOT_CHECKLIST.md`.

## 12. Final QA Conclusion

The system has strong demo-ready areas: role login, dashboards, public verification, student certificate viewing, and Sepolia blockchain validation. The most important issue found during final QA was the blockchain hash mismatch, and it has been fixed, built, committed, pushed, deployed, and verified on the production site.

The complete operational workflow is not yet fully end-to-end ready because High Council approval handoff and the student registration/payment return flow still need fixes. For FYP presentation, use the verified issued demo certificate path for blockchain and public verification screenshots, and avoid presenting a fresh approval-to-payment flow until the remaining blockers are corrected.
