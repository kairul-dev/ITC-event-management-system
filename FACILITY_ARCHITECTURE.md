# Facility Management System - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ROLES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  FACILITY MANAGER              ADMIN              STUDENT        │
│  (Role: facility_manager)   (Role: admin)   (Role: student)     │
│                                                                   │
│  - Manage Rooms             - Create Events    - Register       │
│  - Set Availability         - Select Rooms     - View Events    │
│  - Track Bookings           - Verify Payments - Pay Fees        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │   facilities     │      │ event_registr... │                 │
│  ├──────────────────┤      ├──────────────────┤                 │
│  │ id (PK)          │      │ id (PK)          │                 │
│  │ name ★           │      │ event_id (FK)    │                 │
│  │ description      │      │ user_id (FK)     │                 │
│  │ capacity         │      │ payment_status   │                 │
│  │ location         │      │ payment_ref      │                 │
│  │ created_by       │      │ registered_at    │                 │
│  │ created_at       │      └──────────────────┘                 │
│  └────────┬─────────┘                                            │
│           │ (1)                                                   │
│           │                                                       │
│           │ (Many) ┌──────────────────────┐                      │
│           ├────────│ facility_availability│                      │
│           │        ├──────────────────────┤                      │
│           │        │ id (PK)              │                      │
│           │        │ facility_id (FK)  ★  │                      │
│           │        │ start_date ★         │                      │
│           │        │ end_date ★           │                      │
│           │        │ status ★             │                      │
│           │        │   - "available"      │                      │
│           │        │   - "unavailable"    │                      │
│           │        │   - "booked"         │                      │
│           │        │ booking_note         │                      │
│           │        │ created_by           │                      │
│           │        │ created_at           │                      │
│           │        └──────────────────────┘                      │
│           │                                                       │
│           │        ┌──────────────────┐                          │
│           └────────│     events       │                          │
│                    ├──────────────────┤                          │
│                    │ id (PK)          │                          │
│                    │ title ★          │                          │
│                    │ facility_id (FK) │ ← NEW COLUMN             │
│                    │ start_date ★     │                          │
│                    │ end_date ★       │                          │
│                    │ location         │                          │
│                    │ fee_amount       │                          │
│                    │ status           │                          │
│                    │ created_at       │                          │
│                    └──────────────────┘                          │
│                                                                   │
│  ★ = Required field                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
FACILITY MANAGER WORKFLOW:
═════════════════════════

Step 1: Create Facilities
┌──────────────────────┐
│ Facility Manager     │
│ visits              │
│ /facility-manager/  │
│ facilities          │
└──────────┬───────────┘
           │ fills form
           ↓
     ┌──────────────┐
     │ + Add        │
     │   "Audit A"  │
     │   500 cap    │
     │   Building A │
     └──────┬───────┘
            │ submit
            ↓
    ┌───────────────────┐
    │ INSERT INTO       │
    │ facilities (...)  │
    └────────┬──────────┘
             ↓
   ┌─────────────────────┐
   │ facilities table    │
   │ created_at: now     │
   │ created_by: mgr_id  │
   └─────────────────────┘

Step 2: Set Availability
┌──────────────────────┐
│ Facility Manager     │
│ visits              │
│ /facility-manager/  │
│ availability        │
└──────────┬───────────┘
           │ selects facility
           │ sets dates
           │ mark: "available"
           ↓
     ┌──────────────────────────┐
     │ + Add Availability       │
     │   Facility: "Audit A"    │
     │   From: 2026-04-22       │
     │   To: 2026-04-25         │
     │   Status: "available"    │
     └──────────┬───────────────┘
                │ submit
                ↓
    ┌───────────────────────────┐
    │ INSERT INTO               │
    │ facility_availability (...│
    └────────┬──────────────────┘
             ↓
   ┌─────────────────────────────┐
   │ facility_availability table │
   │ facility_id: audit_a_id     │
   │ start_date: 2026-04-22      │
   │ end_date: 2026-04-25        │
   │ status: "available"         │
   │ created_at: now             │
   └─────────────────────────────┘

ADMIN EVENT CREATION WORKFLOW:
═════════════════════════════

Step 1: Fill Event Form
┌─────────────┐
│ Admin       │
│ visits      │
│ /admin/     │
│ event       │
└──────┬──────┘
       │ fills form
       │ (title, dates, etc)
       ↓
   ┌──────────────────────┐
   │ Event Form           │
   │ Title: "Workshop"    │
   │ From: 2026-04-22     │
   │ To: 2026-04-23       │
   └──────────┬───────────┘
              │

Step 2: Facility Dropdown Populates
       │
       ↓ (on date change)
┌────────────────────────────────┐
│ QUERY: Get Available Facilities │
│                                │
│ SELECT * FROM facilities       │
│ WHERE id NOT IN (              │
│   SELECT facility_id FROM      │
│   facility_availability        │
│   WHERE status IN ('booked',   │
│         'unavailable')         │
│   AND start_date <= '2026-04-23'
│   AND end_date >= '2026-04-22' │
│ )                              │
└────────────────┬───────────────┘
                 │
                 ↓
          ┌─────────────────┐
          │ Found:          │
          │ - Audit A ✓     │
          │                 │
          │ (Room B is      │
          │  unavailable)   │
          └────────┬────────┘
                   │

Step 3: Admin Selects Facility
       │
       ↓
   ┌──────────────────────┐
   │ Admin clicks         │
   │ "Audit A" from list  │
   │ facility_id = abc123 │
   └──────────┬───────────┘
              │ submit event
              ↓
     ┌────────────────────────────┐
     │ INSERT INTO events (        │
     │   title: "Workshop",        │
     │   facility_id: "abc123", ← │
     │   start_date: "2026-04-22", │
     │   ...                       │
     │ )                           │
     └────────┬───────────────────┘
              │
              ↓
    ┌──────────────────────┐
    │ Event Created!       │
    │ + Auto-update:       │
    │ Mark Audit A as      │
    │ "booked" for dates   │
    └──────────────────────┘

RESULT:
──────
Event (Workshop) → assigned to Facility (Audit A)
✓ No double-booking possible
✓ Event has venue
✓ Students see where event is held
```

## Status Values in facility_availability

```
Status: "available"
  └─ Facility CAN be assigned to events
  └─ Available in admin dropdown
  └─ Shows as GREEN in UI

Status: "unavailable"
  └─ Facility CANNOT be assigned
  └─ Maintenance, closed, or reserved
  └─ NOT in admin dropdown
  └─ Shows as RED in UI

Status: "booked"
  └─ Facility is assigned to an event
  └─ CANNOT be assigned to another event
  └─ NOT in admin dropdown
  └─ Shows as AMBER in UI
```

## RLS (Row Level Security) Rules

```
┌─ facilities table
│  - SELECT: Anyone (for dropdown)
│  - INSERT: facility_manager OR admin only
│  - UPDATE: facility_manager OR admin only
│  - DELETE: facility_manager OR admin only
│
├─ facility_availability table
│  - SELECT: Anyone (public info)
│  - INSERT: facility_manager OR admin only
│  - UPDATE: facility_manager OR admin only
│  - DELETE: facility_manager OR admin only
│
└─ events table (updated)
   - facility_id column added
   - Only admins can set/change facility_id
```

## Integration Points

```
1. USER MANAGEMENT
   Supabase → users table → role = 'facility_manager'
                           └─ Access to /facility-manager pages

2. EVENT CREATION
   Admin Form → selects dates
             → queries available_facilities
             → selects room
             → saves facility_id to events table

3. PAYMENT SYSTEM (existing)
   No changes needed - works with facilities
   Event registrations still track payments

4. CERTIFICATE GENERATION (existing)
   Can show facility/venue in certificate
   (optional future enhancement)

5. REPORTS (existing)
   Can include facility information
   (optional future enhancement)
```

## URL Routes

```
FACILITY MANAGER:
/facility-manager              - Dashboard home
/facility-manager/facilities   - Manage rooms
/facility-manager/availability - Manage schedules

ADMIN (UPDATED):
/admin/event - Event creation (now with facility selector)

STUDENT (NO CHANGE):
/student/registered-events - Shows venue location
```

## File Structure

```
app/
├── admin/
│   └── event/
│       └── page.tsx ← UPDATED (facility dropdown added)
├── facility-manager/           ← NEW SECTION
│   ├── layout.tsx              ← Auth guard
│   ├── page.tsx                ← Dashboard
│   ├── facilities/
│   │   └── page.tsx            ← Manage rooms
│   └── availability/
│       └── page.tsx            ← Manage schedules
│
supabase/
└── migrations/
    └── 20260422_facility_management.sql ← Database schema
```

## Next: Implementation Checklist

- [ ] Apply database migration in Supabase
- [ ] Create facility_manager user in Supabase Auth
- [ ] Test facility creation (/facility-manager/facilities)
- [ ] Test availability setup (/facility-manager/availability)
- [ ] Test admin event creation with facility selector
- [ ] Verify facilities appear/disappear in dropdown based on dates
- [ ] Test with overlapping availability periods
- [ ] Verify RLS permissions work correctly
