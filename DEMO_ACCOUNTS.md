# Demo Accounts & Verification Details

This document details all test accounts, login credentials, and verification keys prepared for the UTHM ITC Event Management & Secure Document Verification System demo.

> [!NOTE]
> All student accounts support login using either their **Matrix Number** or their **Email Address** as the Username in the login interface.

## 1. Demo Student Login Accounts
All seeded student accounts use a common demo password.
* **Common Password:** `Student@12345`

| Student Name | Username (Matrix Number) | Email Address | Faculty | Course | Role | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **Ahmad Haris Bin Zulkifli** | `AI220001` | `student1@uthm.edu.my` | FSKTM | Software Engineering | Student | Active |
| **Nurul Syahira Binti Azman** | `AI220002` | `student2@uthm.edu.my` | FSKTM | Computer Security | Student | Active |
| **Chong Wei Keat** | `AI220003` | `student3@uthm.edu.my` | FSKTM | Multimedia Computing | Student | Active |
| **ali** | `AI220385` | `ali@example.com` | FSKTM | Software Engineering | Student | Active |

*Additionally, there are 37 other generated student accounts (`AI220004` to `AI220040` with email `ai220xxx@student.uthm.edu.my`) seeded for realistic dashboard metrics. They all use the same password `Student@12345`.*

---

## 2. Staff, Approver & Admin Accounts
The standard demo staff credentials are listed below:

| Role | Username (Matrix Number) | Email Address | Password | Name | Login Destination |
| --- | --- | --- | --- | --- | --- |
| **Admin** | `AI220382` | `khairul512003@gmail.com` | `123456aA` | khairul | `/admin` |
| **Club Committee** | `AI220384` | `kh@gmail.com` | `123456aA` | student | `/club-committee` |
| **High Council** | `AI220383` | `k@gmail.com` | `123456aA` | akmal | `/high-council` |
| **Club Advisor** | `suriawati` | `suriawati@itc.local` | `123456aA` | suriawati | `/club-advisor` |

---

## 3. Certificate Blockchain Anchoring (Ethereum Sepolia)
Three certificates have been live-anchored to the **Ethereum Sepolia** testnet using the deployed smart contract. The verification page `/verify` will pull these details directly from the Sepolia network.

### 📜 Live-Anchored Certificates (Ethereum Sepolia)

1. **Student 1: Ahmad Haris Bin Zulkifli**
   * **Certificate Number:** `CERT-ITC-2026-0022`
   * **Event Name:** `Web Development Bootcamp 2026`
   * **Certificate Hash:** `696fa2897690a4f673544ffbbe1baddf649ff1718dd6221667a93b65b567bff3`
   * **Transaction Hash:** `0xe583f8fb5d621f498d67e9d91797b23cdd12c6ad50a9a2754a927d0164313eda`
   * **Explorer Link:** [Etherscan Tx](https://sepolia.etherscan.io/tx/0xe583f8fb5d621f498d67e9d91797b23cdd12c6ad50a9a2754a927d0164313eda)

2. **Student 2: Nurul Syahira Binti Azman**
   * **Certificate Number:** `CERT-ITC-2026-0024`
   * **Event Name:** `Cybersecurity Awareness Workshop`
   * **Certificate Hash:** `cb8c1a99aeee20564b36dbca215fca910122918376ba26da1fb6447114b61e5f`
   * **Transaction Hash:** `0xb37836880989c60f8a802855d658c1f30c4d513f2a77c6cdacddb34b9f50cabf`
   * **Explorer Link:** [Etherscan Tx](https://sepolia.etherscan.io/tx/0xb37836880989c60f8a802855d658c1f30c4d513f2a77c6cdacddb34b9f50cabf)

3. **Student 3: Chong Wei Keat**
   * **Certificate Number:** `CERT-ITC-2026-0063`
   * **Event Name:** `Final Year Project Sharing Session`
   * **Certificate Hash:** `73f01d19cc9bb7e423624fc8c25de6c46b66cbb60fd534491d416570f9bbf110`
   * **Transaction Hash:** `0xd38f1c10a6c7e12f4e7b14b86da02a4a01d72919faa0214b992bb5f991ae40c1`
   * **Explorer Link:** [Etherscan Tx](https://sepolia.etherscan.io/tx/0xd38f1c10a6c7e12f4e7b14b86da02a4a01d72919faa0214b992bb5f991ae40c1)

---

### 💾 Seeded Database Certificates (Offline/Local Verification)
The remaining certificates are seeded directly in the local database with fully calculated SHA-256 cryptographic hashes and realistic fake transaction hashes starting with `0x`. They will verify perfectly against the system record.

* **Example local-only verification checks:**
  * `CERT-FYP-DEMO-20260601` (Issued to `ali` for `FYP Demo UAT Event 20260601`)
  * `CERT-ITC-2026-0002` (Issued to `Ahmad Haris Bin Zulkifli` for `FYP Demo UAT Event 20260601`)
  * `CERT-ITC-2026-0003` (Issued to `Nurul Syahira Binti Azman` for `FYP Demo UAT Event 20260601`)
  * `CERT-ITC-2026-0046` (Issued to `Ahmad Haris Bin Zulkifli` for `Final Year Project Sharing Session`)
