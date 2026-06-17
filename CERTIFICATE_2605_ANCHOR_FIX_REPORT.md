# Certificate Anchor Fix Report — CERT-VALIDATION-2026-2605

**Date:** June 18, 2026  
**Status:** ✅ RESOLVED  

---

## Problem

Certificate `CERT-VALIDATION-2026-2605` (Student: **ali / AI220385**) existed in the system database with a valid SHA-256 hash, but was **not anchored to the Ethereum Sepolia blockchain**. The public verification portal at `/verify-certificate` returned:

- `foundLocal: true`
- `foundOnChain: false` ← **Not found on Sepolia**
- `hashMatches: false`
- `valid: false`

This meant the certificate showed an amber "Not found on Sepolia" badge instead of the green "Verified and Matched" badge.

---

## Root Cause

The E2E validation script (`validate-production-workflow.mjs`) generated certificate hashes and stored synthetic mock transaction hashes (prefixed `0x...`) in the database, but **did not actually submit a transaction to the Sepolia smart contract**. Only the three original demo certificates (`CERT-ITC-2026-0022`, `CERT-ITC-2026-0024`, `CERT-ITC-2026-0063`) had been live-anchored to the blockchain.

---

## Resolution

### Step 1 — Database Record Verification

| Field | Value |
| ----- | ----- |
| Certificate ID | `cbbaa3bf-e903-4139-b02b-76c7ebe0aa69` |
| Certificate No | `CERT-VALIDATION-2026-2605` |
| Student | ali (`AI220385`) |
| Event | ITC Career Readiness Workshop 2026 |
| Status | `issued` |
| Issued At | `2026-06-17T19:54:32.596` |

### Step 2 — SHA-256 Hash Calculation

The hash was computed using the canonical payload format:

```
ITC-CERTIFICATE-BLOCKCHAIN-V1|cbbaa3bf-e903-4139-b02b-76c7ebe0aa69|CERT-VALIDATION-2026-2605|ALI|ITC CAREER READINESS WORKSHOP 2026|2026-06-17T19:54:32.596Z
```

**Resulting SHA-256 Hash:**
```
9057dd4fac576af86e25cccc16391abbc5f54af6cc4459c09044cf2f53d68c76
```

### Step 3 — Ethereum Sepolia Anchoring

| Field | Value |
| ----- | ----- |
| Network | Ethereum Sepolia (Chain ID: 11155111) |
| Contract Address | `0x837Dc6837647b28538EDa60B08f67f09f670bD5C` |
| Contract Function | `addCertificate(certId, studentName, courseName, ipfsHash)` |
| Transaction Hash | `0xb8432a232efedf8c5f016656b0638d6496b4ed589041a58e1bd6eabb0df1d3e3` |
| Block Number | `11082161` |
| Transaction Status | **SUCCESS** |
| Etherscan Link | [View on Etherscan](https://sepolia.etherscan.io/tx/0xb8432a232efedf8c5f016656b0638d6496b4ed589041a58e1bd6eabb0df1d3e3) |

### Step 4 — Database Update

Updated the `certificates` table row:

| Column | Old Value | New Value |
| ------ | --------- | --------- |
| `certificate_hash` | `9057dd...` (unchanged) | `9057dd4fac576af86e25cccc16391abbc5f54af6cc4459c09044cf2f53d68c76` |
| `transaction_hash` | `0x07509e...` (synthetic) | `0xb8432a232efedf8c5f016656b0638d6496b4ed589041a58e1bd6eabb0df1d3e3` (real) |

### Step 5 — Production Verification Result

Verified via `POST /api/certificates/verify-sepolia`:

| Check | Result |
| ----- | ------ |
| `foundLocal` | `true` ✅ |
| `foundOnChain` | `true` ✅ |
| `hashMatches` | `true` ✅ |
| `valid` | `true` ✅ |

---

## Impact

- **Only** certificate `CERT-VALIDATION-2026-2605` was modified.
- **No** other certificates, accounts, or database records were touched.
- **No** seed scripts were executed.
- **No** account passwords were reset.

---

## Presentation-Ready Verification

The certificate can now be verified on the live site:

1. Navigate to: [https://itc-secure-document-verification-sy.vercel.app/verify-certificate](https://itc-secure-document-verification-sy.vercel.app/verify-certificate)
2. Enter: `CERT-VALIDATION-2026-2605`
3. Expected result: **Green "Verified and Matched" badge** with full blockchain details.
