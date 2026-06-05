# Certificate Verification UI Fix Report

## Summary

The public certificate verification flow was updated to make invalid certificate results clearer and to show student matric numbers for valid certificates. No QR code functionality was added, no smart contract logic was changed, and no database migration was required.

## API Changes

- Updated `app/api/certificates/verify-sepolia/route.ts`.
- Extended the local certificate response to include `matricNumber`.
- The verification API now retrieves `users.matrix_number` together with the student name.
- Existing Sepolia verification, contract address, transaction hash handling, and hash matching logic were preserved.

## UI Changes

- Updated `app/verify-certificate/page.tsx`.
- Invalid/non-existing certificates now show only:
  - `Certificate Not Found`
  - `Certificate does not exist.`
- Invalid/non-existing certificates no longer show:
  - Certificate Information panel
  - Blockchain Information panel
  - Contract Address
  - Transaction Hash
  - Etherscan buttons
- Valid certificates now show Certificate Information:
  - Certificate ID
  - Student Name
  - Matric Number
  - Event Name
  - Issue Date
- Valid certificates now show Blockchain Information:
  - Certificate Hash
  - Contract Address
  - Transaction Hash
  - Network: Ethereum Sepolia
- Contract address and transaction hash are displayed in shortened format while Copy buttons retain the full values.
- View Transaction on Etherscan and View Smart Contract on Etherscan remain available for verified certificates.
- If a certificate exists locally but is not found on Sepolia, the UI shows a limited blockchain status panel and hides the transaction hash when unavailable.

## Certificate Page / PDF Changes

- No certificate page redesign changes were required for this fix.
- The existing certificate page/template was verified to display:
  - Student Name
  - Matric Number
  - Event Name
  - Event Date / Event Period
  - Issue Date
  - Certificate ID
  - Blockchain Verification Hash
  - Verification URL

## Validation Results

### Valid Certificate

Certificate tested: `CERT-FYP-DEMO-20260601`

- Verified and Matched: Pass
- Matric Number visible: Pass (`AI220385`)
- Certificate Information visible: Pass
- Blockchain Information visible: Pass
- Transaction Hash visible: Pass
- Contract Address visible: Pass
- Ethereum Sepolia network visible: Pass
- View Transaction on Etherscan visible: Pass
- View Smart Contract on Etherscan visible: Pass
- Copy buttons visible and state changes to `Copied`: Pass

### Invalid Certificate

Certificate tested: `CERT-FYP-DEMO-20260602`

- Certificate Not Found badge visible: Pass
- `Certificate does not exist.` message visible: Pass
- Certificate Information hidden: Pass
- Blockchain Information hidden: Pass
- Contract Address hidden: Pass
- Transaction Hash hidden: Pass
- Etherscan buttons hidden: Pass

### Certificate Page / PDF Display

Certificate route tested locally after student login:

- Matric Number visible: Pass
- Event Date visible: Pass
- Issue Date visible: Pass
- Certificate ID visible: Pass
- Verification URL visible: Pass
- Blockchain hash visible: Pass
- Existing certificate design improvements preserved: Pass

## Build Result

- `npm.cmd run lint`: Pass
- `npm.cmd run build`: Pass

## Database / Blockchain Notes

- Migration applied: None
- `supabase db push` run: No
- Smart contract logic modified: No
- QR code functionality added: No

