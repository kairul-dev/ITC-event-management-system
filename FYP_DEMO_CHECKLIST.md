# UTHM ITC Secure Document Verification System
## Final FYP Demonstration Checklist & Runbook

This document serves as your official runbook for the 15-20 minute Final Year Project (FYP) demonstration. It is structured from an **Examiner's Perspective**, detailing the exact steps to demonstrate the end-to-end event and certificate lifecycle, critical checkpoints, backup options, and defensive Q&As.

---

## 📊 Feature Importance Ranking

Before presenting, understand which elements are critical to pass the grading rubrics:

| Feature | Category | Importance Rank | Description |
| --- | --- | --- | --- |
| **Blockchain Verification** | Core Thesis | **CRITICAL** | Checking issued certificates against the Ethereum Sepolia smart contract. |
| **Role-Based Access Control (RBAC)** | Security | **CRITICAL** | Enforcement of routes and RPC queries based on database roles. |
| **Certificate Feedback Gate** | Business Logic | **CRITICAL** | Unlocking certificate downloads only after feedback submission. |
| **Event Overlap Check** | Scheduling | **IMPORTANT** | System preventing venue booking conflicts at the same time/date. |
| **Payment Verification** | Finance | **IMPORTANT** | Student Stripe payment reference tracking and Admin verification flow. |
| **Row Level Security (RLS)** | Database | **IMPORTANT** | Postgres RLS policies preventing students from seeing other students' certificates. |
| **Interactive Program Calendar** | Visualization | **OPTIONAL** | Color-coded events visual calendar displaying schedule densities. |
| **Feedback Analytics** | Analytics | **OPTIONAL** | Dashboard charts displaying ratings and distribution of event reviews. |

---

## ⏱️ Presentation Timeline (15-20 Minutes)

```mermaid
gantt
    title FYP Presentation Timeline Allocation
    dateFormat  M
    axisFormat %M
    section Intro
    Introduction & System Architecture : active, 0, 2
    section Student Workflow
    Registration to Verification : 2, 7
    section Committee Workflow
    Event Proposal & Overlap Checks : 7, 10
    section Approval Workflow
    High Council & Advisor Review : 10, 14
    section Public Portal
    Public Verification & Explorer : 14, 16
    section Q&A
    Examiner Interrogation & Defensive Q&A : 16, 20
```

---

## 🛠️ Step-by-Step Demo Sequence

### Sequence 1: The Student Experience (5 Minutes)
*Demonstrates: Registration -> Payment -> Attendance -> Feedback -> Certificate Unlock*

1. **Step 1: Student Login**
   * **URL:** `/login` (Select **Student** card)
   * **Action:** Login using Email: `student2@uthm.edu.my` or Matrix Number: `AI220002` (Password: `Student@12345`).
   * **Expected Output:** Redirects to `/student`. Dashboard displays registered events count, certificates count, and upcoming events list.
   * **Key Detail to Mention:** *"The system supports login using either matrix number or institutional email for student convenience."*

2. **Step 2: Event Registration & Payment**
   * **URL:** `/student` -> Click **Register** on *Blockchain Certificate Verification Seminar* (Upcoming paid event).
   * **Action:** Open `/student/registrations`. Input a payment reference (e.g. `PAY-STRIPE-SEC-12345`) and click Submit.
   * **Expected Output:** Registration status changes to **Pending Verification**.

3. **Step 3: Feedback Gate & Certificate Download**
   * **URL:** `/student/certificates` (or click *Certificates* on navbar).
   * **Action:** Locate *Cybersecurity Awareness Workshop* (Completed event). Show that the certificate download is **Locked** (Feedback required). Click **Submit Feedback**. Rate 5 stars and submit.
   * **Expected Output:** The certificate instantly unlocks. Click **Download PDF**.
   * **Key Detail to Mention:** *"To ensure maximum student survey engagement, the system locks certificate generation until qualitative feedback is submitted."*

---

### Sequence 2: Committee & Venue Collision Control (3 Minutes)
*Demonstrates: Event Creation -> Overlap Conflict System*

1. **Step 1: Committee Login**
   * **URL:** `/login` (Select **Club Committee** card)
   * **Action:** Login using Matrix Number: `AI220384` (Password: `student` or `Student@12345`).
   * **Expected Output:** Redirects to `/club-committee`. Displays event creation statistics.

2. **Step 2: Proposing a New Event & Overlap Detection**
   * **URL:** `/club-committee` -> Click **Create Event**.
   * **Action:** Try to create an event with a time that overlaps with a completed or published event at the same location (e.g., *Computer Lab 2, FSKTM* on `2026-06-10` from `09:00` to `17:00`).
   * **Expected Output:** The system throws an overlay banner or inline message warning of a venue scheduling conflict.
   * **Key Detail to Mention:** *"The venue allocation system audits scheduled times and prevents booking collisions, saving administrative coordination overhead."*

---

### Sequence 3: The Multi-Stage Approval Chain (4 Minutes)
*Demonstrates: High Council Review -> Club Advisor Sign-off -> Certificate Issuance*

1. **Step 1: High Council Validation**
   * **URL:** `/login` (Select **High Council** card)
   * **Action:** Login using Matrix: `AI220383` (Password: `akmal` or `Student@12345`). Go to `/high-council/events`.
   * **Expected Output:** Review page shows events pending High Council review. Locate *UI/UX Design Mini Workshop* and approve.
   * **Audit Log:** Under the event card, point out the **Approval History Logs** displaying who submitted it and when.

2. **Step 2: Club Advisor Final Sign-Off**
   * **URL:** `/login` (Select **Club Advisor** card)
   * **Action:** Login using Matrix: `suriawati` (Password: `suriawati` or `Student@12345`). Go to `/club-advisor/events`.
   * **Expected Output:** Advisor dashboard displays event and certificate approvals. Approve the proposed *UI/UX Design Mini Workshop* and review the event approvals logs.

---

### Sequence 4: Trustless Public Verification (2 Minutes)
*Demonstrates: Public Portal -> Blockchain Verification -> Etherscan Explorer*

1. **Step 1: Public Verification Portal**
   * **URL:** `/verify` (No login required)
   * **Action:** Enter the live-anchored certificate number for Student 2: `CERT-ITC-2026-0024` and click **Verify**.
   * **Expected Output:** Status shows **Verified and Matched** with a green badge. Certificate details (Student Name: *Nurul Syahira Binti Azman*, Event: *Cybersecurity Awareness Workshop*) are fetched and displayed.
   * **Blockchain Proof:** The page renders the smart contract address, the certificate hash, and the transaction hash.

2. **Step 2: On-Chain Inspection**
   * **Action:** Click **View Transaction on Etherscan**.
   * **Expected Output:** Opens Etherscan Sepolia block explorer page for the transaction hash (`0xb37836880989c60f8a802855d658c1f30c4d513f2a77c6cdacddb34b9f50cabf`), proving the record has been permanently minted into the block ledger.

---

## 🚨 Presentation Contingency Plan (Backup)

What if the classroom internet drops, Sepolia RPC times out, or the transaction is delayed? **Do not panic.** Follow these contingency paths:

### Plan A: Smart Contract RPC Fails / Network Timeout
* **Symptom:** Verifying a certificate takes too long or displays an RPC connection error.
* **Backup Action:**
  1. Look up a seeded local-only certificate (e.g. `CERT-ITC-2026-0002` or `CERT-FYP-DEMO-20260601`).
  2. The portal will display **Not found on Sepolia (Local Only)** but will still calculate the matching local hash and retrieve the local database record.
  3. Explain that the local ledger matches the cryptographic hash, proving database integrity even when off-chain.

### Plan B: Local Database/Supabase Offline
* **Symptom:** Supabase connection fails or local docker containers stop responding.
* **Backup Action:**
  1. Open the fallback SQL schema files located in `supabase/migrations/` and the contract code in `scripts/anchor-latest.mjs` directly in the IDE code editor.
  2. Explain the logical implementation, showing how RLS policies and ERC-721/registry logic are structured.
  3. Walk the examiner through `DEMO_ACCOUNTS.md` which lists the pre-computed hashes and permanent Etherscan links.

---

## 🎓 Examiner Q&A Defense

Here are the most common technical questions examiners ask, along with brief, highly effective answers:

### Q1: "Why do we need a blockchain if we already have a secure database (Supabase) with RLS?"
* **Suggested Answer:** *"While a database is secure against external threats via Row Level Security, it remains centralized. A database administrator or a compromise of database credentials could tamper with records (e.g. inserting false certificates). By anchoring the cryptographic hash of the certificate on the public Ethereum blockchain, the record becomes immutable and tamper-proof. Any alteration of the database record will result in a hash mismatch during verification."*

### Q2: "How much does it cost in gas fees to anchor a certificate? Is it scalable?"
* **Suggested Answer:** *"Anchoring a single certificate on the Sepolia testnet/Ethereum mainnet requires an `addCertificate` transaction. In production, to prevent high gas costs on Ethereum Layer-1, we would utilize a Layer-2 rollup (such as Arbitrum or Polygon) where transaction costs are fractions of a cent, or implement 'batch anchoring' (Merkle Tree root anchoring) where one transaction secures 10,000+ certificates."*

### Q3: "What prevents a student from fabricating a certificate locally and uploading it?"
* **Suggested Answer:** *"The verification portal does not trust client-side inputs. When a certificate number is entered, the server recalculates the SHA-256 hash by joining key fields (`certNo + studentName + eventTitle + issuedAt`) retrieved from the database, and compares it directly with the hash stored in the Sepolia smart contract. If a student modifies a single letter in their local copy, the recalculated hash will not match the immutable blockchain record, causing verification to fail."*

### Q4: "How is Row Level Security (RLS) configured to protect student data?"
* **Suggested Answer:** *"We have enabled Postgres Row Level Security on the `certificates` and `event_registrations` tables. A student can only select records where `auth.uid() = user_id`. This prevents unauthorized API scraping, ensuring that students cannot access other students' certificate details or registration invoices, even if they guess their UUIDs."*

### Q5: "How does the Stripe integration work for paid events?"
* **Suggested Answer:** *"When a student registers for a paid event, they are redirected to a Stripe Checkout Session. Once payment is completed, Stripe sends a secure webhook event to `/api/payments/webhook`, which verifies the signature, marks the registration status as 'paid' in the database, and unlocks the student's entry ticket automatically."*
