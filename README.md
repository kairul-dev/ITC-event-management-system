This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install dependencies first:

```bash
npm install
```

If you want approved certificates to be emailed to students, add these environment variables in `.env.local`:

```bash
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

Use a Gmail App Password, not your normal Gmail password.

To enable Stripe sandbox checkout for event payments, add:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Then run Stripe webhook forwarding during local development:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Use Stripe test card `4242 4242 4242 4242` with any future expiry date and any CVC.

Then run the development server:

```bash
npm run dev
```

Development modes:

- `npm run dev`: Uses Webpack (default, recommended on Windows for this project).
- `npm run dev:turbo`: Uses Turbopack (faster when compatible in your environment).

Certificate emails are sent automatically when a president approves a certificate.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
