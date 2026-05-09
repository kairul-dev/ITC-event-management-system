# Facility Management System Setup Guide

## Overview
The facility management system allows faculty staff to manage room/place availability and helps admins select appropriate venues when creating events.

## Components Created

### 1. Database Migration
**File:** `supabase/migrations/20260422_facility_management.sql`

This migration creates:
- `facilities` table - stores room information
- `facility_availability` table - tracks availability periods
- Adds `facility_id` column to `events` table
- RLS policies for facility managers and admins

**To Apply:**
1. Copy the SQL content
2. Go to your Supabase project → SQL Editor
3. Paste and run the SQL
4. Or apply via migration tools if you're using a deployment system

### 2. New User Role
A new role has been added to the system:
- **facility_manager** - Can manage facilities and their availability

To create a facility manager user:
1. Go to Supabase → Auth → Users
2. Create a new user
3. Go to your `public.users` table
4. Update the `role` column to `facility_manager` for that user

### 3. Facility Manager Dashboard
**URL:** `/facility-manager`

The facility manager can access:
- **Manage Facilities** - Add, view, and delete rooms
  - Room name (required)
  - Description (optional)
  - Capacity (optional)
  - Location (optional)

- **Manage Availability** - Set room availability
  - Select a facility
  - Set start date/time
  - Set end date/time
  - Set status: Available, Unavailable (maintenance), or Booked
  - Add optional notes

### 4. Admin Event Creation Enhancement
**URL:** `/admin/event`

Admins now see an additional field: **"Pilih Tempat/Ruang (Optional)"**
- Dropdown shows only facilities available for the selected event date range
- If dates overlap with unavailable/booked periods, those facilities won't appear
- Selection is optional - admins can still create events without assigning a facility

## Workflow Example

### As a Facility Manager:
1. **Create Facilities First**
   - Go to Facility Manager → Manage Facilities
   - Add "Auditorium A" - Capacity: 500, Location: Building A
   - Add "Multi-Purpose Hall" - Capacity: 200, Location: Building B

2. **Set Availability Periods**
   - Go to Facility Manager → Manage Availability
   - Mark "Auditorium A" as available for April 22-25, 2026
   - Mark "Auditorium A" as unavailable for April 26-27 (maintenance)

3. **Monitor Bookings**
   - Review availability table to see which events use which facilities
   - Update availability as needed

### As an Admin:
1. **Create Event**
   - Go to Admin → Manage Events
   - Fill in all event details
   - Select event dates (e.g., April 22-23, 2026)
   - After selecting dates, dropdown shows available facilities
   - Select "Auditorium A" for the event
   - Submit the event

2. **Result**
   - Event is created with facility assigned
   - Facility is marked as "booked" for those dates
   - Events list shows "✓ Assigned" in Facility column

## Technical Notes

### Database Relationships
```
facilities (1) ←→ (Many) facility_availability
facilities (1) ←→ (Many) events
```

### Availability Logic
A facility is shown as available if:
- It exists in the `facilities` table
- AND it has no overlapping availability records with status "booked" or "unavailable"

### RLS Policies
- Anyone can read facilities and availability (public information)
- Only `facility_manager` or `admin` roles can create/update/delete facilities and availability

## Future Enhancements

Potential improvements to consider:
1. **Edit Facilities** - Allow facility managers to update existing facilities
2. **Recurring Availability** - Set weekly/monthly availability patterns
3. **Auto-Mark Booked** - Automatically mark facilities as "booked" when event is approved
4. **Facility Notifications** - Notify facility managers when events are assigned
5. **Capacity Checking** - Warn if event participants exceed facility capacity
6. **Facility Reports** - Generate facility usage reports
7. **Equipment Management** - Track equipment availability per facility

## Troubleshooting

### No facilities appear in dropdown:
- Check that at least one facility has been created in Facility Manager
- Verify event dates are selected
- Check that no availability records mark all facilities as unavailable for those dates

### Can't access Facility Manager:
- Verify user role is set to `facility_manager` in Supabase
- Check RLS policies are properly applied
- Ensure user is logged in with facility manager account

### Facility marked as booked but event was deleted:
- Manually delete the availability record from Facility Manager
- Or create a new availability record to override it

## Security

The system uses Supabase Row Level Security (RLS) to ensure:
- Only authenticated facility managers and admins can modify facilities
- Everyone can read facility information (for event creation)
- Each facility manager's records are isolated
- Audit trail via `created_by` and timestamp fields
