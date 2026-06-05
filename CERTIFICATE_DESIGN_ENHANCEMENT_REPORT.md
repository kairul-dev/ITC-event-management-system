# Certificate Design Enhancement Report

Date: 2026-06-06

## Summary

Improved the issued certificate design for FYP presentation and real-world verification use. No QR code functionality was added.

The certificate now shows clearer student identity, event information, issue date, certificate reference, verification URL, blockchain hash proof, and digital approval information.

## Files Changed

- `app/certificate/[id]/page.tsx`
- `lib/CertificateTemplate.tsx`
- `CERTIFICATE_DESIGN_ENHANCEMENT_REPORT.md`

## New Fields Displayed

The certificate page and printable certificate now display:

- Student Name
- Matric Number
- Event Date or Event Period
- Issue Date
- Certificate ID
- Verification URL
- Certificate Type: `Certificate of Participation`
- Digital approval section
- Blockchain Verified label
- Ethereum Sepolia Network
- Certificate Hash with wrapping

The certificate page also keeps:

- Copy Certificate ID
- Copy Hash
- Copy Verification URL
- Download PDF
- Verify Certificate link

## Verification Page Consistency

No QR code functionality was added.

The public verification page remains the place for detailed blockchain proof:

- Contract Address
- Transaction Hash
- Ethereum Sepolia
- View Transaction on Etherscan
- View Smart Contract on Etherscan

The full contract address and full transaction hash are not displayed directly on the certificate.

## Demo Certificate Used

- Certificate ID: `CERT-FYP-DEMO-20260601`
- Certificate database ID: `b07581d8-5025-4139-afd2-ba36189a29a1`
- Student matric number: `AI220385`
- Event date: `15 June 2026`
- Issue date: `01 June 2026`

## Validation Results

Production preview route tested locally after `npm.cmd run build`:

- `http://localhost:3011/certificate/b07581d8-5025-4139-afd2-ba36189a29a1`

Verified:

- Student name displays correctly as `ALI`.
- Matric number displays as `AI220385`.
- Event date displays.
- Issue date displays.
- Certificate ID displays prominently.
- Verification URL displays.
- Blockchain hash displays with wrapping.
- Copy Hash button changes to `Copied`.
- Blockchain section shows `Blockchain Verified` and `Ethereum Sepolia`.
- Browser console errors: 0.

Approver note:

- The certificate has an approver ID in the database.
- Student-side RLS does not expose the approver user record to the certificate page, so the certificate safely falls back to `Club Advisor`.

## Build Results

Commands run:

- `npm.cmd run lint`
  - Passed with existing warnings only.
- `npm.cmd run build`
  - Passed.

No database migration was required.

## Screenshots Required

Recommended screenshots for FYP evidence:

- Certificate page header showing student name, matric number, event date, issue date, certificate ID, hash, and verification URL.
- Full printable certificate preview.
- Copy Hash success state.
- Verification page for the same certificate showing blockchain transaction and contract proof.

Temporary validation screenshot captured during testing:

- `certificate-design-preview.png`

The screenshot was used for local visual QA and should be recaptured cleanly for the final report screenshot set.

## Readiness

Status: Ready for deployment after commit and push.
