-- Add facility/room management tables and update events table

BEGIN;

-- Create facilities table to store rooms/places in the faculty
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  capacity INT,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_facilities_creator
    FOREIGN KEY (created_by)
    REFERENCES public.users(id)
    ON DELETE SET NULL
);

-- Create facility availability table to track room bookings/availability
CREATE TABLE IF NOT EXISTS public.facility_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'available', -- 'available', 'unavailable', 'booked'
  booking_note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_availability_facility
    FOREIGN KEY (facility_id)
    REFERENCES public.facilities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_availability_creator
    FOREIGN KEY (created_by)
    REFERENCES public.users(id)
    ON DELETE SET NULL,
  CONSTRAINT valid_date_range
    CHECK (start_date <= end_date)
);

-- Add facility_id column to events table if it doesn't exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS facility_id UUID;

-- Add foreign key constraint to facility if not already there
ALTER TABLE public.events ADD CONSTRAINT fk_events_facility
  FOREIGN KEY (facility_id)
  REFERENCES public.facilities(id)
  ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facility_availability_facility_id
  ON public.facility_availability(facility_id);

CREATE INDEX IF NOT EXISTS idx_facility_availability_dates
  ON public.facility_availability(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_events_facility_id
  ON public.events(facility_id);

-- Enable RLS on new tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policy for facilities: Everyone can read, only facility managers/admins can modify
CREATE POLICY "Anyone can read facilities"
ON public.facilities
FOR SELECT
USING (true);

CREATE POLICY "Admin and facility_manager can insert facilities"
ON public.facilities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.role = 'facility_manager')
  )
);

CREATE POLICY "Admin and facility_manager can update facilities"
ON public.facilities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.role = 'facility_manager')
  )
);

CREATE POLICY "Admin and facility_manager can delete facilities"
ON public.facilities
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.role = 'facility_manager')
  )
);

-- RLS Policy for facility_availability
CREATE POLICY "Anyone can read facility_availability"
ON public.facility_availability
FOR SELECT
USING (true);

CREATE POLICY "Admin and facility_manager can insert availability"
ON public.facility_availability
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.role = 'facility_manager')
  )
);

CREATE POLICY "Admin and facility_manager can update availability"
ON public.facility_availability
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.role = 'facility_manager')
  )
);

CREATE POLICY "Admin and facility_manager can delete availability"
ON public.facility_availability
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.role = 'facility_manager')
  )
);

COMMIT;
