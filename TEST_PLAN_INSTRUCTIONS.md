# Test Plan Instructions

## Purpose

Use this checklist to verify the ITC Secure Document Verification System workflow from paperwork submission through certificate approval.

## Test Accounts

- Admin: `AI220382` / `123456aA`
- High Council: `AI220383` / `123456aA`
- Club Advisor: `suriawati` / `suriawati123`
- Student: `AI220385` / `123456aA`

## Before Testing

1. Start the local development server:

   ```bash
   npm run dev
   ```

2. Open:

   ```text
   http://localhost:3000
   ```

3. Use a new test event name, for example:

   ```text
   Workflow Test Event YYYYMMDD-HHMM
   ```

## Workflow Test

### 1. Admin Submits Paperwork

1. Log in as Admin.
2. Go to `Admin > Paperwork`.
3. Fill in all required paperwork fields.
4. Click `Submit Paperwork`.
5. Go to `Admin > Events`.
6. Confirm the event status is `Pending High Council Approval`.

### 2. High Council Approval Path

1. Log in as High Council.
2. Go to `Review Paperwork`.
3. Confirm the submitted event appears in the queue.
4. Click `Send to Club Advisor`.
5. Confirm the event is removed from the High Council queue.

### 3. Club Advisor Approval Path

1. Log in as Club Advisor.
2. Go to `Review Paperwork`.
3. Confirm the event appears in the Club Advisor queue.
4. Click `Approve Paperwork`.
5. Log in as Admin.
6. Go to `Admin > Events`.
7. Confirm the event status is `Approved`.

### 4. Rejection Checks

High Council rejection:

1. Submit another test paperwork as Admin.
2. Log in as High Council.
3. Enter a rejection reason.
4. Click `Reject Paperwork`.
5. Log in as Admin and confirm status is `Rejected` and the reason is visible.

Club Advisor rejection:

1. Submit another test paperwork as Admin.
2. Approve it from High Council.
3. Log in as Club Advisor.
4. Enter a rejection reason.
5. Click `Reject Paperwork`.
6. Log in as Admin and confirm status is `Rejected` and the reason is visible.
7. Click `Resubmit` if you want to send it back through the approval flow.

### 5. Publish Event

1. Log in as Admin.
2. Go to `Admin > Events`.
3. For an `Approved` event, click `Show on Main Page`.
4. Open `/events`.
5. Confirm the event appears on the public event page.

### 6. Student Registration And Payment

1. Log in as Student.
2. Go to `Available Events`.
3. Open the published test event.
4. Register for the event.
5. Go to `My Registrations`.
6. Click `Pay by Card` and complete Stripe Checkout.
7. Return to `My Registrations`.
8. Confirm payment status is `paid`.
9. Log in as Admin.
10. Go to `Participants`.
11. Confirm the paid card payment record appears.

### 7. Certificate Flow

1. Log in as Admin.
2. Go to `Certificates`.
3. Select the test event.
4. Generate a certificate for the paid student.
5. Log in as Club Advisor.
6. Go to `Certificates`.
7. Approve the pending certificate.
8. Log in as Student.
9. Go to `My Certificates`.
10. Confirm the approved certificate is visible and can be opened.

## Expected Results

- Paperwork can move from Admin to High Council to Club Advisor.
- High Council and Club Advisor can reject with visible reasons.
- Admin can resubmit rejected paperwork.
- Approved events can be published to `/events`.
- Students can register for published events.
- Paid card payments appear in Admin payment/participant views.
- Admin can generate certificates for registered students.
- Club Advisor can approve certificates.
- Students can view approved certificates.

## Known Behavior

After certificate approval, the event status is changed to `completed`. Completed events no longer appear on the public `/events` page unless the app is changed to include completed events publicly. Certificates should only be generated for paid registrations.
