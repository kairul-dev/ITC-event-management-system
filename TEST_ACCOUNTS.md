# Test Accounts

Do not commit real production passwords or service credentials. Demo passwords should be shared through a secure handoff, not written into this file.

## Demo-Ready Accounts

| Role | Matrix Number | Name | Status |
| --- | --- | --- | --- |
| Admin | `AI220382` | khairul | Ready |
| Club Committee | `AI220386` | Demo Committee | Ready |
| High Council | `AI220383` | akmal | Ready |
| Club Advisor | `ADVISOR-SURIAWATI` | suriawati | Ready |
| Student | `AI220385` | ali | Ready |

## Notes

- The Committee account was prepared specifically for final demo readiness.
- Committee uses matrix-based login and redirects to `/committee`.
- Club Advisor uses matrix-based login and redirects to `/club-advisor`.
- Passwords are intentionally omitted from this repository file.

## Demo Data Identifiers

| Data | Identifier |
| --- | --- |
| Demo UAT event | `FYP Demo UAT Event 20260601` |
| Demo event status | `Completed` |
| Demo event ID | `89d4337f-2776-417e-8c67-455ab282f52a` |
| Demo certificate number | `CERT-FYP-DEMO-20260601` |
| Demo student | `AI220385` |
| Demo payment path | Free event, marked paid with `FREE-DEMO-EVENT` reference |
| Demo feedback | Rating `5`, non-anonymous |

## Required Seed Data Status

- Published event: Available in database.
- Completed event: Available in database.
- Student registration: Available for demo UAT event.
- Feedback response: Available for demo UAT event.
- Issued certificate: Available as `CERT-FYP-DEMO-20260601`.
- Feedback analytics record: Available through the demo feedback response.

## External Test Configuration

Present:

- Supabase URL
- Supabase anon key
- Supabase service role key
- Stripe secret key
- Stripe webhook secret
- Sepolia RPC URL
- Sepolia contract address

Missing:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Current code uses server-side Stripe Checkout session creation and does not currently read `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Add it before the demo if a client-side Stripe publishable-key path is introduced.
