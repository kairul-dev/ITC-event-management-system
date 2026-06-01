# ITC Secure Document Verification System Use Case Diagram

This use case diagram is derived from the current Next.js App Router pages, API routes, Supabase table usage, migrations, and role checks in the codebase.

## Mermaid Flowchart

```mermaid
flowchart LR
    PublicVerifier["Public Verifier"]
    Student["Student"]
    Admin["Admin"]
    Committee["Club Committee"]
    HighCouncil["High Council"]
    ClubAdvisor["Club Advisor"]
    Stripe["Stripe Payment Gateway"]
    Supabase["Supabase Auth, Database, Storage"]
    Email["Email Notification Service"]
    Sepolia["Ethereum Sepolia Contract"]

    subgraph System["ITC Secure Document Verification System"]
        direction TB

        subgraph AuthModule["Authentication and Profile Module"]
            UC01(["Register account"])
            UC02(["Login by role, matrix number, or club advisor name"])
            UC03(["Reset or recover password"])
            UC04(["Manage profile and notification preferences"])
            UC05(["Manage users and assign roles"])
        end

        subgraph EventModule["Event and Paperwork Module"]
            UC06(["Create event paperwork"])
            UC07(["Upload paperwork file"])
            UC08(["Track approval status"])
            UC09(["Review paperwork"])
            UC10(["Approve, forward, or reject paperwork"])
            UC11(["Edit or delete event"])
            UC12(["Upload event poster"])
            UC13(["Publish approved event"])
            UC14(["View public published events"])
            UC15(["View event details"])
            UC16(["Manage facilities and availability"])
        end

        subgraph RegistrationModule["Registration and Payment Module"]
            UC17(["Register for event"])
            UC18(["View own registrations"])
            UC19(["Create Stripe checkout session"])
            UC20(["Confirm card payment"])
            UC21(["Receive payment webhook"])
            UC22(["View card payment records"])
        end

        subgraph CertificateModule["Certificate and Verification Module"]
            UC23(["Generate certificates for paid students"])
            UC24(["Review pending certificates"])
            UC25(["Approve or reject certificate"])
            UC26(["View own certificates"])
            UC27(["View certificate by link"])
            UC28(["Anchor certificate on Sepolia"])
            UC29(["Verify certificate locally and on-chain"])
            UC30(["Email approved certificate"])
        end

        subgraph ReportingModule["Notification and Reporting Module"]
            UC31(["View dashboard metrics and alerts"])
            UC32(["Send event notification"])
            UC33(["Broadcast notification to students"])
            UC34(["Generate event report"])
        end
    end

    PublicVerifier --- UC14
    PublicVerifier --- UC15
    PublicVerifier --- UC29

    Student --- UC02
    Student --- UC03
    Student --- UC04
    Student --- UC14
    Student --- UC15
    Student --- UC17
    Student --- UC18
    Student --- UC19
    Student --- UC20
    Student --- UC26
    Student --- UC27

    Admin --- UC02
    Admin --- UC03
    Admin --- UC04
    Admin --- UC05
    Admin --- UC08
    Admin --- UC22
    Admin --- UC31
    Admin --- UC34

    Committee --- UC02
    Committee --- UC03
    Committee --- UC04
    Committee --- UC06
    Committee --- UC07
    Committee --- UC08
    Committee --- UC11
    Committee --- UC12
    Committee --- UC13
    Committee --- UC23
    Committee --- UC31
    Committee --- UC32
    Committee --- UC33

    HighCouncil --- UC02
    HighCouncil --- UC03
    HighCouncil --- UC04
    HighCouncil --- UC09
    HighCouncil --- UC10
    HighCouncil --- UC31

    ClubAdvisor --- UC02
    ClubAdvisor --- UC03
    ClubAdvisor --- UC04
    ClubAdvisor --- UC09
    ClubAdvisor --- UC10
    ClubAdvisor --- UC24
    ClubAdvisor --- UC25
    ClubAdvisor --- UC28
    ClubAdvisor --- UC31

    UC01 --- Supabase
    UC02 --- Supabase
    UC04 --- Supabase
    UC05 --- Supabase
    UC07 --- Supabase
    UC12 --- Supabase
    UC17 --- Supabase
    UC23 --- Supabase
    UC19 --- Stripe
    UC20 --- Stripe
    UC21 --- Stripe
    UC28 --- Sepolia
    UC29 --- Sepolia
    UC30 --- Email
    UC32 --- Email
    UC33 --- Email

    UC06 --> UC09
    UC09 --> UC10
    UC10 --> UC13
    UC13 --> UC14
    UC17 --> UC19
    UC20 --> UC22
    UC22 --> UC23
    UC23 --> UC24
    UC24 --> UC25
    UC25 --> UC26
    UC25 --> UC30
```

## Actors Identified

| Actor | Evidence in current code | Main responsibility |
| --- | --- | --- |
| Public Verifier | `/verify-certificate`, certificate QR links, `/certificate/[id]` | Verify certificates publicly without login. |
| Student | `/student/*`, `AuthGuard requiredRole="student"` | Register for events, pay via Stripe, view registrations and certificates. |
| Admin | `/admin/*`, `AdminGuard`, admin-only API role checks | Manage users, roles, account status, system records, and reports. |
| Club Committee | `/committee/*`, `role === "committee"` | Create/edit event paperwork, upload participants, generate certificate drafts, submit for approval, and view feedback analytics. |
| High Council | `/high-council/*`, `role === "high_council"` | Review paperwork in `Pending High Council Approval` and forward or reject it. |
| Club Advisor | `/club-advisor/*`, `role === "club_advisor"` | Final paperwork approval and certificate approval/anchoring. |
| Stripe Payment Gateway | `/api/payments/*` | Processes card checkout and webhook payment updates. |
| Supabase | `lib/supabase.ts`, `lib/supabaseAdmin.ts`, migrations | Auth, database, RLS, storage buckets for paperwork and posters. |
| Email Notification Service | notification and certificate send APIs | Sends event notifications and certificate emails. |
| Ethereum Sepolia Contract | `/api/certificates/anchor-sepolia`, `/api/certificates/verify-sepolia` | Stores and verifies certificate hashes on-chain. |

## Modules And Main Tables

| Module | Routes/pages | Main tables or storage |
| --- | --- | --- |
| Authentication and Profile | `/login`, `/register`, `/forgot-password`, `/reset-password`, role profile pages | `users`, Supabase Auth, `event_notification_preferences` |
| Event and Paperwork | `/committee/event`, `/committee/approval-status`, `/high-council/events`, `/club-advisor/events`, `/events`, `/events/[id]` | `events`, `paperwork-files` storage, event poster storage |
| Registration and Payment | `/student/events`, `/student/registered-events`, `/admin/payments`, `/api/payments/*` | `event_registrations`, Stripe checkout/webhook metadata |
| Certificates | `/admin/certificates`, `/club-advisor/certificates`, `/student/certificates`, `/certificate/[id]`, `/verify-certificate` | `certificates`, `users`, `events`, Sepolia contract |
| Notifications and Reports | `/admin/report`, `/api/notifications/*`, dashboard summary APIs | `notification_logs`, `event_notification_preferences`, `events`, `event_registrations` |
| Facility Management | RLS migrations only | `facilities`, `facility_availability`, `events.facility_id` |

## Role-Based Access Summary

| Role | Current access pattern |
| --- | --- |
| `student` | Protected by `AuthGuard`; can read published events, create own event registrations, start/confirm own payments, and view own approved certificates. |
| `admin` | Protected by `AdminGuard` and `requireApiRole(["admin"])`; can manage users, roles, account status, system records, and reports. |
| `committee` | Protected in Committee layout; can create event paperwork, submit approvals, generate certificate drafts, and review feedback analytics. |
| `high_council` | Protected in layout and API checks; can view paperwork waiting for High Council and transition it to `Pending Club Advisor Approval` or `Rejected`. |
| `club_advisor` | Protected in layout and API checks; can view paperwork waiting for final approval, approve/reject paperwork, and approve/reject certificates. |

## Core Workflow

1. Club Committee creates event/program paperwork.
2. High Council reviews paperwork and forwards it to Club Advisor or rejects it with a reason.
3. Club Advisor gives final paperwork approval or rejection.
4. Event is published after final approval.
5. Student registers for a published event and pays through Stripe when required.
6. Event is completed.
7. Student submits feedback.
8. Certificate becomes available after feedback.
9. Club Advisor approves/issues and anchors certificates using the existing Sepolia workflow.
10. Public Verifier verifies the certificate by QR code or certificate ID.
