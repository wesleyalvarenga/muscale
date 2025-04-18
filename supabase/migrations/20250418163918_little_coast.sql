/*
  # Update rehearsal schedule structure

  1. Changes
    - Create new schedule_rehearsals table to store multiple rehearsal dates
    - Remove rehearsal columns from schedules table
    - Add RLS policies for admins

  2. Notes
    - Each schedule can have multiple rehearsal dates
    - Only start time is required for rehearsals
*/

-- Remove existing rehearsal columns from schedules
ALTER TABLE schedules
DROP CONSTRAINT IF EXISTS schedules_rehearsal_time_check,
DROP COLUMN IF EXISTS rehearsal_date,
DROP COLUMN IF EXISTS rehearsal_start_time,
DROP COLUMN IF EXISTS rehearsal_end_time;

-- Create schedule_rehearsals table
CREATE TABLE IF NOT EXISTS schedule_rehearsals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedule_rehearsals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage schedule rehearsals"
ON schedule_rehearsals
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_rehearsals_schedule_id_idx ON schedule_rehearsals(schedule_id);