# Certificate Verification Improvement Report

Date: 2026-06-06

## Summary

Improved the certificate verification experience without adding QR code functionality. The certificate page and public verification portal now show clear blockchain proof for examiners, including Ethereum Sepolia network details, the smart contract address, transaction hash, and Etherscan actions.

## Files Changed

- `app/certificate/[id]/page.tsx`
- `app/verify-certificate/page.tsx`
- `app/api/certificates/anchor-sepolia/route.ts`
- `app/api/certificates/verify-sepolia/route.ts`
- `supabase/migrations/20260606013556_add_certificate_transaction_hash.sql`
- `CERTIFICATE_VERIFICATION_IMPROVEMENT_REPORT.md`

## Database Review

Live `public.certificates` schema was inspected before changing the database.

Existing relevant column:

- `certificate_hash text null`

Missing column:

- `transaction_hash`

Migration applied:

- `supabase/migrations/20260606013556_add_certificate_transaction_hash.sql`

SQL changes:

- Added `public.certificates.transaction_hash text` with `IF NOT EXISTS`.
- Added `idx_certificates_transaction_hash` index with `IF NOT EXISTS`.

Safe migration workflow:

- Applied individually with `npx.cmd supabase db query --linked --file supabase/migrations/20260606013556_add_certificate_transaction_hash.sql`.
- Repaired only the new migration version with `npx.cmd supabase migration repair --linked --status applied 20260606013556`.
- Did not run normal `supabase db push`.
- No tables or columns were dropped.
- No destructive data changes were performed.

Verification:

- `certificate_hash`: exists.
- `transaction_hash`: exists.
- `idx_certificates_transaction_hash`: exists.

## Data Repair

The previous anchoring implementation returned transaction hashes but did not store them. Two known demo certificates already anchored on Sepolia were repaired with their real transaction hashes:

- `CERT-FYP-DEMO-20260601`
  - Transaction: `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c`
- `CERT-CODEX-FIX-20260605133535`
  - Transaction: `0x6205ab19865c453ffe89e33cd5229a9c86443a180e23861b4a8a7662a3157f4e`

The data repair only filled `transaction_hash` where it was previously null for those specific certificates.

## Certificate Page Improvements

Implemented:

- Keeps Certificate ID.
- Keeps Blockchain Hash.
- Adds Blockchain Network: Ethereum Sepolia.
- Adds Smart Contract Address: `0x837Dc6837647b28538EDa60B08f67f09f670bD5C`.
- Displays student name in title case.
- Improves long hash display using monospace wrapping.
- Adds Copy buttons for:
  - Certificate ID
  - Blockchain Hash
  - Contract Address
- Adds transaction Etherscan button when `transaction_hash` exists.

## Public Verification Page Improvements

Implemented success result layout:

- Verification Status: `Verified and Matched`
- Certificate Information:
  - Certificate ID
  - Student Name
  - Event Name
  - Issue Date
- Blockchain Information:
  - Certificate Hash
  - Contract Address
  - Transaction Hash
  - Network: Ethereum Sepolia

Implemented verification messages:

- Verified: `Certificate is authentic. The blockchain record matches the issued certificate.`
- Invalid: `Certificate verification failed. The blockchain record does not match the certificate.`
- Not Found: `Certificate does not exist.`

## Etherscan Integration

Implemented:

- View Transaction on Etherscan
  - `https://sepolia.etherscan.io/tx/{transactionHash}`
- View Smart Contract on Etherscan
  - `https://sepolia.etherscan.io/address/{contractAddress}`

Etherscan link checks:

- Demo transaction URL returned HTTP 200.
- Smart contract URL returned HTTP 200.

## Blockchain Audit

Certificate tested:

- `CERT-FYP-DEMO-20260601`

Verification API result:

- `configured`: true
- `chainId`: 11155111
- `contractAddress`: `0x837Dc6837647b28538EDa60B08f67f09f670bD5C`
- `transactionHash`: `0x9fbad15f7ed4b426a2ffa3cce81c324e32557172bba46eb801488eefa25b1b2c`
- `foundLocal`: true
- `foundOnChain`: true
- `hashMatches`: true
- `valid`: true

Certificate hash:

- `84753b93f2a38b30cc9659e09ff74251918bf0f73686a0e12169781db8b8931b`

Blockchain verification behavior:

- Uses the configured Sepolia RPC.
- Reads the smart contract through `ethers`.
- Compares the local certificate hash with the on-chain certificate hash.
- The smart contract logic was not modified.
- No QR code functionality was added.

## Validation Results

Commands run:

- `npm.cmd run lint`
  - Passed with existing warnings only.
- `npm.cmd run build`
  - Passed.

API tests:

- Valid certificate verification passed.
- Not-found certificate verification returned `foundLocal=false`, `foundOnChain=false`, `valid=false`.

Page route test:

- `/verify-certificate?certificateNo=CERT-FYP-DEMO-20260601` returned HTTP 200 locally.

Browser note:

- The browser MCP session was unavailable during this run, so UI validation was performed through the production build, local page route, API response, and Etherscan link checks.

## Remaining Issues

- Existing lint warnings remain in unrelated files. No lint errors were introduced.
- Older certificates that were anchored before this fix may not have `transaction_hash` unless repaired or re-anchored. New anchors will store the transaction hash automatically.

## Readiness

Certificate verification proof is now clearer for FYP demonstration and examiner review.

Readiness status: Ready for demo after deployment.
