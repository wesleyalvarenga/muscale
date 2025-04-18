/*
  # Add schedule times table

  1. New Tables
    - `schedule_times`
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `start_time` (time)
      - `end_time` (time)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Remove `start_time` and `end_time` from `schedules` table
    - Add foreign key constraint from `schedule_times` to `schedules`

  3. Security
    - Enable RLS on `schedule_times` table
    - Add policies for admin access
*/

-- Remove time columns from schedules
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' 
    AND column_name IN ('start_time', 'end_time')
  ) THEN
    ALTER TABLE schedules 
    DROP COLUMN start_time,
    DROP COLUMN end_time;
  END IF;
END $$;

-- Create schedule_times table
CREATE TABLE IF NOT EXISTS schedule_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT schedule_times_time_check CHECK (start_time < end_time)
);

-- Enable RLS
ALTER TABLE schedule_times ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage schedule times"
ON schedule_times
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
CREATE INDEX IF NOT EXISTS schedule_times_schedule_id_idx ON schedule_times(schedule_id);