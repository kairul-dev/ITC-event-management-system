# Event Discovery & Notification System - Implementation Guide

## Overview
This document outlines the new event discovery system and email notification features added to the ITC Secure Document Verification System.

## Features Implemented

### 1. **Enhanced Event Discovery Page** (`/student/events`)

#### View Modes
- **Grid View** (📋): Beautiful card-based layout with visual highlights
- **List View** (📝): Compact, information-dense layout
- **Calendar View** (📅): Monthly calendar showing event dates

#### Search & Filtering
- **Search**: Find events by title, purpose, or objective
- **Sort Options**:
  - 🔥 Most Popular (trending based on registration count)
  - 📅 Upcoming First (sorted by start date)
  - ✨ Newest First (recently posted events)
- **Location Filter**: Filter events by venue/location
- **Price Filter**: Show free or paid events only

#### Visual Indicators
- **Registration Progress**: Visual capacity bar showing spots filled
- **Trending Badges**: 
  - 🔥 Trending (20+ registrations)
  - 📈 Popular (10+ registrations)
- **Spots Remaining**: Real-time spot availability with color coding:
  - Green: Plenty of spots available
  - Yellow: Limited spots (< 5 remaining)
  - Red: Event is full

### 2. **Enhanced Event Detail Page** (`/student/events/[id]`)

#### Rich Information Display
- Event status badge (Upcoming/Ended)
- Detailed event information
- Event objective and description
- Location, date, time, and fee information
- Real-time capacity tracking with visual progress bar

#### Smart Actions
- Direct registration from detail page
- "Spots filling up quickly" warning when nearing capacity
- Registration status display for already-registered users
- Link to registered events for easy management

### 3. **Email Notification System**

#### Notification Types
1. **New Event Broadcast** 📢
   - Sent to all students when new event is approved
   - Helps students discover events without visiting the site
   
2. **Event Reminders** ⏰
   - Sent to registered students as event approaches
   - Customizable based on preferences

3. **Spots Filling Alert** 🔥
   - Alerts registered students when spots are running out
   - Helps prevent FOMO (Fear of Missing Out)

#### Email Features
- Professional HTML templates with brand colors
- Personalized greeting with student name
- Direct links to event pages
- Mobile-responsive design
- Action buttons for easy access

### 4. **Notification Preferences** (Student Dashboard)

Students can manage their email notification preferences:
- ✅ New Events: Opt-in/out of new event announcements
- ✅ Event Reminders: Choose whether to receive event reminders
- ✅ Spots Filling Alerts: Control urgent notification alerts

Component: `NotificationPreferences.tsx`
Location: Add to student profile/dashboard pages

## Database Schema

### New Tables

#### `event_notification_preferences`
Stores individual student notification preferences
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- new_events (Boolean, Default: true)
- event_reminders (Boolean, Default: true)
- spots_filling_alerts (Boolean, Default: true)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `notification_logs`
Tracks all notification sending activity
```sql
- id (UUID, Primary Key)
- event_id (UUID, Foreign Key)
- notification_type (Text)
- total_recipients (Integer)
- sent_count (Integer)
- failed_count (Integer)
- created_at (Timestamp)
- updated_at (Timestamp)
```

## API Endpoints

### 1. Send Notifications to Registered Students
**POST** `/api/notifications/event`

Request Body:
```json
{
  "eventId": "uuid-of-event",
  "notificationType": "closing_soon" | "spots_filling"
}
```

Response:
```json
{
  "message": "Notifications sent successfully",
  "total": 45,
  "sent": 44,
  "failed": 1
}
```

### 2. Broadcast Event to All Students
**POST** `/api/notifications/broadcast`

Request Body:
```json
{
  "eventId": "uuid-of-event"
}
```

Response:
```json
{
  "message": "Event broadcast notifications sent successfully",
  "total": 250,
  "sent": 248,
  "failed": 2
}
```

## Setup Instructions

### 1. Environment Variables
Add these to your `.env.local`:
```env
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password
```

**Note**: Use Gmail App Password, not your regular Gmail password
[How to create Gmail App Password](https://support.google.com/accounts/answer/185833)

### 2. Database Migration
Run the migration file:
```bash
supabase migration up 20260423_event_notifications.sql
```

Or manually execute the SQL commands in Supabase SQL Editor.

### 3. Add Notification Preferences to Student Profile
In `app/student/profile/page.tsx`, add:
```tsx
import NotificationPreferences from "@/lib/NotificationPreferences";

// Inside your profile component:
<NotificationPreferences />
```

### 4. Integrate Notification Triggers (Admin Panel)

For admins to send notifications when creating/approving events:

```tsx
// When approving an event in admin panel
const broadcastNewEvent = async (eventId: string) => {
  const response = await fetch('/api/notifications/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId })
  });
  const data = await response.json();
  console.log('Broadcast result:', data);
};

// When spots are filling up (can be called from admin dashboard)
const sendSpotFillingAlert = async (eventId: string) => {
  const response = await fetch('/api/notifications/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      eventId,
      notificationType: 'spots_filling'
    })
  });
  const data = await response.json();
  console.log('Alert result:', data);
};
```

## Usage Examples

### For Students

1. **Discover Events**
   - Navigate to `/student/events`
   - Use search, filters, and different view modes
   - Click cards to see detailed information
   - Register directly from detail page

2. **Manage Notifications**
   - Go to Student Profile
   - Scroll to "Notification Preferences"
   - Toggle preferences on/off
   - Click "Save Preferences"

### For Admins

1. **When Creating an Event**
   - Create and approve the event
   - Call the broadcast endpoint to notify all students
   - Specify the event ID

2. **Ongoing Event Management**
   - Monitor registration counts
   - Send reminders to registered students as event approaches
   - Send alerts when spots are filling up

## Performance Considerations

1. **Registration Count Caching**
   - Counts are fetched when events load
   - Consider adding caching for high-traffic scenarios

2. **Email Sending**
   - Uses async/await with error handling
   - Failed emails are logged but don't block
   - Consider implementing retry logic for production

3. **Database Indexes**
   - Indexes on `event_id` and `created_at` for fast queries
   - Consider adding indexes on `user_email` for large user bases

## Security Considerations

1. **RLS (Row Level Security)**
   - Notification preferences are user-scoped
   - Logs are admin-only
   - All API endpoints should include authentication

2. **Email Validation**
   - Emails are validated before sending
   - Failed sends are logged
   - No PII in logs

3. **Rate Limiting**
   - Consider implementing rate limiting on broadcast endpoint
   - Prevent abuse of notification system

## Testing

### Manual Testing Checklist

- [ ] Grid view displays events correctly
- [ ] List view is compact and readable
- [ ] Calendar view shows dates properly
- [ ] Search filters work for title, purpose, objective
- [ ] Location filter shows all unique locations
- [ ] Price filter separates free/paid events
- [ ] Sorting by trending/upcoming/newest works
- [ ] Capacity bars update in real-time
- [ ] Event detail page shows all information
- [ ] Registration from detail page works
- [ ] Notification preferences save correctly
- [ ] Emails are sent successfully (check Gmail)

### API Testing

```bash
# Test broadcast notification
curl -X POST http://localhost:3000/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{"eventId":"your-event-uuid"}'

# Test registered user notification
curl -X POST http://localhost:3000/api/notifications/event \
  -H "Content-Type: application/json" \
  -d '{"eventId":"your-event-uuid","notificationType":"spots_filling"}'
```

## Troubleshooting

### Emails Not Sending
1. Check Gmail credentials in `.env.local`
2. Verify App Password is correct (not regular password)
3. Check "Less secure apps" setting in Gmail account
4. Look at server logs for error messages

### Events Not Showing Counts
1. Ensure `event_registrations` table is accessible
2. Check Supabase RLS policies
3. Verify counts query returns results

### Notification Preferences Not Saving
1. Ensure user is logged in
2. Check Supabase connection
3. Verify `event_notification_preferences` table exists
4. Check RLS policies for insert/update

## Future Enhancements

1. **Push Notifications**: Add browser push notifications for real-time alerts
2. **SMS Notifications**: Text message reminders for high-priority events
3. **Calendar Integration**: Google Calendar, Outlook calendar sync
4. **Event Recommendations**: ML-based event suggestions based on past registrations
5. **Notification Analytics**: Track email open rates and click-through rates
6. **Event Categories**: Categorize events and allow filtering by interests
7. **Watch List**: Allow students to "watch" events before registering
8. **Notification Templates**: Admin-customizable email templates

## Support & Maintenance

- Monitor `notification_logs` table for delivery issues
- Review failed notification counts weekly
- Update email templates seasonally
- Test email delivery monthly
- Archive old notification logs quarterly

---

**Last Updated**: May 9, 2026
**Version**: 1.0
