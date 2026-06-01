# Screenshot Checklist

Purpose: definitive screenshot collection guide for the final report, UAT evidence, and FYP presentation.

Recommended capture standard:

- Desktop: 1440 x 900 or 1366 x 768.
- Mobile backup: 390 x 844 for login, student, feedback, certificate, and verification pages.
- Do not capture `.env.local`, API keys, private keys, service role keys, database passwords, or access tokens.
- Use the demo certificate `CERT-FYP-DEMO-20260601` where certificate or blockchain evidence is required.
- Use transaction `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c` for Sepolia anchoring evidence.
- Use contract `0x837Dc6837647b28538EDa60B08f67f09f670bD5C` for blockchain contract evidence.

## Full Screenshot Catalogue

| Screenshot ID | Module | User Role | Route/Page | Description | Required for Chapter 4 | Required for UAT | Required for Presentation |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Authentication | Public | `/login` | Login page showing role selection and sign-in form. | Yes | Yes | Yes |
| AUTH-02 | Authentication | Admin | `/login?role=admin` -> `/admin` | Successful Admin login redirect to Admin Dashboard. | Yes | Yes | No |
| AUTH-03 | Authentication | Committee | `/login?role=committee` -> `/committee` | Successful Committee matrix-based login redirect to Committee Dashboard. | Yes | Yes | Yes |
| AUTH-04 | Authentication | High Council | `/login?role=high_council` -> `/high-council` | Successful High Council login redirect. | Yes | Yes | No |
| AUTH-05 | Authentication | Club Advisor | `/login?role=club_advisor` -> `/club-advisor` | Successful Club Advisor login redirect. | Yes | Yes | No |
| AUTH-06 | Authentication | Student | `/login?role=student` -> `/student` | Successful Student login redirect. | Yes | Yes | No |
| AUTH-07 | Role-Based Access Control | Committee | Restricted admin route such as `/admin/users` | Unauthorized role is blocked or redirected from Admin-only page. | Yes | Yes | No |
| AUTH-08 | Role-Based Access Control | Student | Restricted approval route such as `/high-council/events` | Student cannot access High Council review page. | Yes | Yes | No |
| ADM-01 | Admin | Admin | `/admin` | Admin Dashboard overview with system statistics and quick actions. | Yes | Yes | Yes |
| ADM-02 | Admin | Admin | `/admin/users` | User Management page showing accounts, roles, and account status controls. | Yes | Yes | Yes |
| ADM-03 | Admin | Admin | `/admin/users` | Assign or update user role control visible to Admin only. | Yes | Yes | No |
| ADM-04 | Admin | Admin | `/admin/users` | Lock/unlock or account status management evidence. | Yes | Yes | No |
| ADM-05 | Admin | Admin | `/admin/report` | Reports and Statistics dashboard. | Yes | Yes | Yes |
| ADM-06 | Admin | Admin | `/admin/approval-status` | System records or approval status overview. | No | Yes | No |
| COM-01 | Committee | Committee | `/committee` | Committee Dashboard with operational event/certificate actions. | Yes | Yes | Yes |
| COM-02 | Committee | Committee | `/committee/event?mode=paperwork` | Event Creation form before submission. | Yes | Yes | Yes |
| COM-03 | Committee | Committee | `/committee/event?mode=events` | Event Editing page for an existing draft or rejected event. | Yes | Yes | No |
| COM-04 | Committee | Committee | `/committee/event?mode=paperwork` | Event submission action showing Pending Approval state. | Yes | Yes | Yes |
| COM-05 | Committee | Committee | `/committee/approval-status` | Committee view of approval status after submission. | Yes | Yes | No |
| COM-06 | Committee | Committee | `/committee/certificates` | Certificate draft generation page for paid/eligible participants. | Yes | Yes | Yes |
| HC-01 | High Council Review | High Council | `/high-council/events` | High Council Event Review list with pending events. | Yes | Yes | Yes |
| HC-02 | High Council Review | High Council | `/high-council/events` | Event details review before approval. | Yes | Yes | No |
| HC-03 | High Council Review | High Council | `/high-council/events` | Event forwarded by High Council to Club Advisor. | Yes | Yes | Yes |
| HC-04 | High Council Review | High Council | `/high-council/events` | Event rejected with reason or rejection state. | Yes | Yes | Yes |
| ADV-06 | Club Advisor Approval | Club Advisor | `/club-advisor/certificates` | Certificate draft review before issuance/anchoring. | Yes | Yes | Yes |
| ADV-01 | Club Advisor Approval | Club Advisor | `/club-advisor` | Club Advisor Dashboard. | Yes | Yes | Yes |
| ADV-02 | Club Advisor Approval | Club Advisor | `/club-advisor/events` | Final event approval review page. | Yes | Yes | Yes |
| ADV-03 | Club Advisor Approval | Club Advisor | `/club-advisor/events` | Final event approval success state. | Yes | Yes | Yes |
| ADV-04 | Club Advisor Approval | Club Advisor | `/club-advisor/events` | Final event rejection state. | Yes | Yes | Yes |
| ADV-05 | Club Advisor Approval | Club Advisor | `/club-advisor/certificates` | Final certificate approval and Sepolia anchoring action. | Yes | Yes | Yes |
| EVT-01 | Event Management | Admin/Committee | `/committee/event?mode=events` or `/events` | Event List showing title, date, organizer, and status. | Yes | Yes | Yes |
| EVT-02 | Event Management | Public/Student | `/events/[id]` | Event Details page for a published event. | Yes | Yes | Yes |
| EVT-03 | Event Management | Committee | `/committee/event?mode=events` | Draft event status shown. | Yes | Yes | No |
| EVT-04 | Event Management | High Council | `/high-council/events` | Pending Approval event status shown. | Yes | Yes | No |
| EVT-05 | Event Management | Committee/Admin | `/committee/event?mode=events` or `/admin/approval-status` | Approved or Published event status shown. | Yes | Yes | Yes |
| EVT-06 | Event Management | Committee/Admin | `/committee/event?mode=events` or `/admin/approval-status` | Completed event status shown. | Yes | Yes | Yes |
| EVT-07 | Event Management | Committee/Admin | `/committee/event?mode=events` or `/admin/approval-status` | Rejected event status shown. | Yes | Yes | No |
| CAL-01 | Program Planning Calendar | Admin | `/admin/program-calendar` | Calendar Month View with color-coded event statuses. | Yes | Yes | Yes |
| CAL-02 | Program Planning Calendar | Committee | `/committee/program-calendar` | Calendar Week View with event title, date, organizer, and status. | Yes | Yes | Yes |
| CAL-03 | Program Planning Calendar | High Council | `/high-council/program-calendar` | Calendar List View with filters. | Yes | Yes | No |
| CAL-04 | Program Planning Calendar | Club Advisor | `/club-advisor/program-calendar` | Calendar visible to Club Advisor role. | Yes | Yes | No |
| CAL-05 | Program Planning Calendar | Admin/Committee | `/admin/program-calendar` or `/committee/program-calendar` | Color coding evidence: Draft gray, Pending yellow, Approved green, Published blue, Completed purple, Rejected red. | Yes | Yes | Yes |
| CAL-06 | Program Planning Calendar | Admin/Committee | Event create/edit flow | Overlapping event conflict warning shown without blocking submission. | Yes | Yes | Yes |
| CAL-07 | Program Planning Calendar | Admin/Committee/high-council/Advisor | Program Calendar page | Dashboard statistics: events this month, pending approvals, upcoming events, completed events. | Yes | Yes | No |
| CAL-08 | Program Planning Calendar | Admin/Committee/high-council/Advisor | Program Calendar page | Filters by month, status, and organizer. | Yes | Yes | No |
| STU-01 | Student Registration | Student/Public | `/student/events` or `/events` | Event Listing visible to students. | Yes | Yes | Yes |
| STU-02 | Student Registration | Student | `/student/events/[id]` or `/events/[id]` | Event Registration form or registration action. | Yes | Yes | Yes |
| STU-03 | Student Registration | Student | `/student/registered-events` | Registered Events list after registration. | Yes | Yes | Yes |
| STU-04 | Student Registration | Student | `/student` | Student Dashboard with registered events and certificates summary. | Yes | Yes | Yes |
| PAY-01 | Payment | Student | Registration flow for free event | Free Event Registration success or paid status using free event path. | Yes | Yes | Yes |
| PAY-02 | Payment | Student | `checkout.stripe.com/...` | Stripe Checkout Page for paid event using test mode. | Yes | Yes | Yes |
| PAY-03 | Payment | Student | `/student/registered-events?payment=success&session_id=...` | Payment Success Page or successful return state. | Yes | Yes | Yes |
| PAY-04 | Payment | Student/Admin | `/student/registered-events` or reports page | Paid registration status visible after payment/free event completion. | No | Yes | No |
| FB-01 | Feedback Module | Student/Public Link | `/feedback/89d4337f-2776-417e-8c67-455ab282f52a` | Feedback QR Page with public event feedback link. | Yes | Yes | Yes |
| FB-02 | Feedback Module | Student | `/feedback/[eventId]` | Feedback Form before submission for completed event. | Yes | Yes | Yes |
| FB-03 | Feedback Module | Student | `/feedback/[eventId]` | Feedback form showing anonymous option and rating/comment fields. | Yes | Yes | No |
| FB-04 | Feedback Module | Student | `/feedback/[eventId]` | Feedback Submission Success state. | Yes | Yes | Yes |
| FB-05 | Feedback Module | Student | `/feedback/[eventId]` | Feedback not open yet state for non-completed event. | No | Yes | No |
| FBA-01 | Feedback Analytics | Admin | `/admin/feedback` | Feedback analytics overview for Admin. | Yes | Yes | Yes |
| FBA-02 | Feedback Analytics | Committee | `/committee/feedback` | Feedback analytics overview for Committee. | Yes | Yes | Yes |
| FBA-03 | Feedback Analytics | Admin/Committee | `/admin/feedback` or `/committee/feedback` | Average Rating metric. | Yes | Yes | Yes |
| FBA-04 | Feedback Analytics | Admin/Committee | `/admin/feedback` or `/committee/feedback` | Total Responses metric. | Yes | Yes | Yes |
| FBA-05 | Feedback Analytics | Admin/Committee | `/admin/feedback` or `/committee/feedback` | Rating Distribution chart/list. | Yes | Yes | Yes |
| FBA-06 | Feedback Analytics | Admin/Committee | `/admin/feedback` or `/committee/feedback` | Recent Comments list with anonymous handling if applicable. | Yes | Yes | Yes |
| CERT-01 | Certificate Module | Student | `/student/certificates` | Certificate List page. | Yes | Yes | Yes |
| CERT-02 | Certificate Module | Student | `/student/certificates` | Pending Feedback state before feedback submission. | Yes | Yes | Yes |
| CERT-03 | Certificate Module | Student | `/student/certificates` | Certificate Available state after feedback submission. | Yes | Yes | Yes |
| CERT-04 | Certificate Module | Student | `/certificate/b07581d8-5025-4139-afd2-ba36189a29a1` | Certificate View page for `CERT-FYP-DEMO-20260601`. | Yes | Yes | Yes |
| CERT-05 | Certificate Module | Student | `/certificate/[id]` | Certificate Download button/action visible for issued certificate. | Yes | Yes | Yes |
| CERT-06 | Certificate Module | Student | `/certificate/[id]` | Locked certificate page redirects or prompts for feedback when feedback is missing. | Yes | Yes | No |
| VER-01 | Public Verification | Public Verifier | `/verify-certificate` | Verification Form with certificate ID/manual input. | Yes | Yes | Yes |
| VER-02 | Public Verification | Public Verifier | `/verify-certificate?certificateNo=CERT-FYP-DEMO-20260601` | Verification Success for demo certificate. | Yes | Yes | Yes |
| VER-03 | Public Verification | Public Verifier | `/verify-certificate` | Verification Failure for invalid or unknown certificate ID. | Yes | Yes | Yes |
| VER-04 | Public Verification | Public Verifier | QR scan result to `/verify-certificate` | QR-based verification path, if captured from certificate QR code. | Yes | Yes | Yes |
| BC-01 | Blockchain Verification | Club Advisor/high-council | `/club-advisor/certificates` | Anchoring Success after approving/anchoring certificate. | Yes | Yes | Yes |
| BC-02 | Blockchain Verification | Admin/Verifier | `/verify-certificate?certificateNo=CERT-FYP-DEMO-20260601` | Transaction Hash displayed or referenced in verification result. | Yes | Yes | Yes |
| BC-03 | Blockchain Verification | Public Verifier | `https://sepolia.etherscan.io/tx/0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c` | Sepolia explorer transaction page. | Yes | Yes | Yes |
| BC-04 | Blockchain Verification | Public Verifier | `https://sepolia.etherscan.io/address/0x837Dc6837647b28538EDa60B08f67f09f670bD5C` | Sepolia explorer contract page. | Yes | Yes | Yes |
| BC-05 | Blockchain Verification | Public Verifier | `/verify-certificate?certificateNo=CERT-FYP-DEMO-20260601` | Verified Certificate Result showing hash match or blockchain valid status. | Yes | Yes | Yes |
| BC-06 | Blockchain Verification | Developer/UAT Evidence | `/api/certificates/verify-sepolia` response evidence | Blockchain verification API returns valid result without exposing secrets. | No | Yes | No |
| DEMO-01 | Demo Evidence | Student/Public Verifier | `/certificate/b07581d8-5025-4139-afd2-ba36189a29a1` | Demo certificate page showing certificate number `CERT-FYP-DEMO-20260601`. | Yes | Yes | Yes |
| DEMO-02 | Demo Evidence | Public Verifier | `/verify-certificate?certificateNo=CERT-FYP-DEMO-20260601` | Public verification result for `CERT-FYP-DEMO-20260601`. | Yes | Yes | Yes |
| DEMO-03 | Demo Evidence | Public Verifier | Sepolia transaction URL | Transaction `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c` confirmed on Sepolia. | Yes | Yes | Yes |
| DEMO-04 | Demo Evidence | Public Verifier | Sepolia contract URL | Contract `0x837Dc6837647b28538EDa60B08f67f09f670bD5C` visible on Sepolia explorer. | Yes | Yes | Yes |
| DEMO-05 | Demo Evidence | Admin/Committee | `/admin/feedback` or `/committee/feedback` | Feedback analytics record for the demo completed event. | Yes | Yes | Yes |
| DEMO-06 | Demo Evidence | Student | `/student/registered-events` | Demo student registration for the published/completed demo event. | Yes | Yes | Yes |
| DEMO-07 | Demo Evidence | Admin/Committee | `/admin/program-calendar` or `/committee/program-calendar` | Demo event visible in Program Planning Calendar. | Yes | Yes | Yes |

## Chapter 4 Minimum Screenshot Set

Recommended order:

1. AUTH-01 - Login Page.
2. AUTH-03 - Committee role-based dashboard redirect.
3. ADM-01 - Admin Dashboard.
4. ADM-02 - User Management.
5. COM-01 - Committee Dashboard.
6. COM-02 - Event Creation.
7. COM-04 - Event Submission / Pending Approval.
8. HC-01 - High Council Event Review list.
9. HC-03 - High Council forwarded-to-advisor state.
10. ADV-02 - Club Advisor Final Approval review.
11. EVT-01 - Event List.
12. EVT-02 - Event Details.
13. CAL-01 - Program Calendar Month View.
14. CAL-06 - Conflict Warning.
15. STU-02 - Student Event Registration.
16. PAY-01 - Free Event Registration success.
17. FB-01 - Feedback QR Page.
18. FB-02 - Feedback Form.
19. FB-04 - Feedback Submission Success.
20. FBA-03 - Average Rating.
21. FBA-05 - Rating Distribution.
22. CERT-02 - Pending Feedback State.
23. CERT-03 - Certificate Available State.
24. CERT-04 - Certificate View.
25. VER-01 - Public Verification Form.
26. VER-02 - Public Verification Success.
27. VER-03 - Public Verification Failure.
28. BC-05 - Blockchain verified certificate result.
29. DEMO-03 - Sepolia transaction evidence.
30. DEMO-04 - Sepolia contract evidence.

## UAT Evidence Screenshot Set

Recommended order:

1. AUTH-02 - Admin login redirect.
2. AUTH-03 - Committee login redirect.
3. AUTH-04 - High Council login redirect.
4. AUTH-05 - Club Advisor login redirect.
5. AUTH-06 - Student login redirect.
6. AUTH-07 - Unauthorized Committee access blocked from Admin-only route.
7. AUTH-08 - Unauthorized Student access blocked from approval route.
8. ADM-02 - Admin user role/account management.
9. COM-02 - Committee creates event.
10. COM-04 - Committee submits event.
11. HC-03 - High Council forwards event.
12. HC-04 - High Council rejects event.
13. ADV-03 - Club Advisor final approval.
14. ADV-04 - Club Advisor final rejection.
15. CAL-01 - Month View.
16. CAL-02 - Week View.
17. CAL-03 - List View.
18. CAL-06 - Conflict Warning.
19. STU-02 - Student registration.
20. PAY-01 - Free event registration success.
21. PAY-02 - Stripe Checkout Page.
22. PAY-03 - Payment Success Page.
23. FB-02 - Feedback Form.
24. FB-04 - Feedback Submission Success.
25. FBA-01 - Admin feedback analytics.
26. FBA-02 - Committee feedback analytics.
27. CERT-02 - Certificate Pending Feedback.
28. CERT-03 - Certificate Available after feedback.
29. CERT-05 - Certificate Download.
30. VER-02 - Public verification success.
31. VER-03 - Public verification failure.
32. BC-06 - Blockchain verification API valid result.
33. DEMO-01 - Demo certificate evidence.
34. DEMO-02 - Demo public verification evidence.
35. DEMO-03 - Demo transaction evidence.

## Final Presentation Screenshot Set

Recommended order:

1. AUTH-01 - Login Page.
2. ADM-01 - Admin Dashboard.
3. COM-01 - Committee Dashboard.
4. COM-02 - Event Creation.
5. HC-03 - High Council Review.
6. ADV-03 - Club Advisor Final Approval.
7. CAL-01 - Program Calendar Month View.
8. CAL-06 - Conflict Warning.
9. STU-02 - Student Registration.
10. PAY-01 - Free Event Registration success.
11. FB-01 - Feedback QR Page.
12. FB-04 - Feedback Submission Success.
13. FBA-05 - Feedback Rating Distribution.
14. CERT-02 - Pending Feedback State.
15. CERT-04 - Demo Certificate View.
16. VER-02 - Verification Success.
17. BC-05 - Blockchain verified result.
18. DEMO-03 - Sepolia transaction.
19. DEMO-04 - Sepolia contract.

## Viva Backup Screenshot Set

Recommended order:

1. AUTH-07 - Committee blocked from Admin-only page.
2. AUTH-08 - Student blocked from approval page.
3. ADM-03 - Admin role assignment.
4. ADM-04 - Account lock/unlock or status management.
5. COM-03 - Committee edits rejected/draft event.
6. HC-04 - High Council rejection.
7. ADV-04 - Club Advisor rejection.
8. EVT-03 - Draft status.
9. EVT-04 - Pending Approval status.
10. EVT-05 - Approved/Published status.
11. EVT-06 - Completed status.
12. EVT-07 - Rejected status.
13. CAL-05 - Full status color coding.
14. CAL-08 - Calendar filters.
15. PAY-02 - Stripe Checkout Page.
16. PAY-04 - Paid registration status.
17. FB-05 - Feedback not open yet state.
18. FBA-06 - Recent Comments.
19. CERT-06 - Locked certificate requiring feedback.
20. VER-03 - Verification Failure.
21. VER-04 - QR verification path.
22. BC-01 - Anchoring Success.
23. BC-02 - Transaction Hash in verification result.
24. BC-03 - Sepolia transaction page.
25. BC-04 - Sepolia contract page.
26. BC-06 - Blockchain verification API response.
