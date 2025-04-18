/*
  # Add Title and Multiple Periods to Schedules

  1. Changes
    - Add title column to schedules table
    - Add second period columns for start and end times
    - Update existing schedules to have default title

  2. Notes
    - Using DO block to safely handle column modifications
    - Second period times are optional
*/

DO $$ 
BEGIN
  -- Add title column
  ALTER TABLE schedules 
    ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Escala';

  -- Add second period columns
  ALTER TABLE schedules 
    ADD COLUMN IF NOT EXISTS start_time_2 time,
    ADD COLUMN IF NOT EXISTS end_time_2 time;

  -- Remove default from title after initial setup
  ALTER TABLE schedules 
    ALTER COLUMN title DROP DEFAULT;
END $$;