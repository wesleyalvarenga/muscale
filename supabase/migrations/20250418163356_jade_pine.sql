/*
  # Add rehearsal date and time to schedules

  1. Changes
    - Add `rehearsal_date` (date) to schedules table
    - Add `rehearsal_start_time` (time) to schedules table
    - Add `rehearsal_end_time` (time) to schedules table

  2. Notes
    - All fields are nullable since not all schedules may have rehearsals
*/

ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS rehearsal_date date,
ADD COLUMN IF NOT EXISTS rehearsal_start_time time,
ADD COLUMN IF NOT EXISTS rehearsal_end_time time;

-- Add constraint to ensure rehearsal end time is after start time when both are set
ALTER TABLE schedules
ADD CONSTRAINT schedules_rehearsal_time_check 
CHECK (
  (rehearsal_start_time IS NULL AND rehearsal_end_time IS NULL) OR
  (rehearsal_start_time < rehearsal_end_time)
);