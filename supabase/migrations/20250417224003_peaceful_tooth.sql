/*
  # Add soft deletes and improve metrics tracking

  1. Changes
    - Add deleted_at column to all relevant tables
    - Update RLS policies to exclude deleted records
    - Add tracking for musician replacements

  2. Tables Modified
    - musicians
    - schedules
    - schedule_musicians
    - notifications
*/

-- Add deleted_at column to musicians
ALTER TABLE musicians
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at column to schedules
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at column to schedule_musicians
ALTER TABLE schedule_musicians
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at column to notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Musicians are viewable by authenticated users" ON musicians;
DROP POLICY IF EXISTS "Schedules are viewable by authenticated users" ON schedules;
DROP POLICY IF EXISTS "Schedule musicians are viewable by authenticated users" ON schedule_musicians;
DROP POLICY IF EXISTS "Notifications are viewable by authenticated users" ON notifications;

-- Create new policies
CREATE POLICY "Musicians are viewable by authenticated users"
ON musicians FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND true);

CREATE POLICY "Schedules are viewable by authenticated users"
ON schedules FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND true);

CREATE POLICY "Schedule musicians are viewable by authenticated users"
ON schedule_musicians FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND true);

CREATE POLICY "Notifications are viewable by authenticated users"
ON notifications FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  musician_id IN (
    SELECT id
    FROM musicians
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Create musician_metrics table to track all changes
CREATE TABLE IF NOT EXISTS musician_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  schedule_id uuid REFERENCES schedules(id),
  musician_id uuid REFERENCES musicians(id),
  event_type text NOT NULL,
  old_status text,
  new_status text,
  CONSTRAINT musician_metrics_event_type_check CHECK (
    event_type IN ('replacement_needed', 'confirmation', 'status_change')
  )
);

-- Enable RLS on musician_metrics
ALTER TABLE musician_metrics ENABLE ROW LEVEL SECURITY;

-- Create function to handle musician replacements
CREATE OR REPLACE FUNCTION handle_musician_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes for metrics
  IF NEW.status != OLD.status THEN
    INSERT INTO musician_metrics (
      schedule_id,
      musician_id,
      event_type,
      old_status,
      new_status
    ) VALUES (
      NEW.schedule_id,
      NEW.musician_id,
      CASE
        WHEN NEW.status = 'declined' THEN 'replacement_needed'
        WHEN NEW.status = 'confirmed' AND OLD.status = 'pending' THEN 'confirmation'
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for musician_metrics
CREATE POLICY "Musician metrics are viewable by authenticated users"
ON musician_metrics FOR SELECT
TO authenticated
USING (
  schedule_id IN (
    SELECT id
    FROM schedules
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Create trigger for musician status changes
DROP TRIGGER IF EXISTS track_musician_replacements ON schedule_musicians;
CREATE TRIGGER track_musician_replacements
  BEFORE UPDATE ON schedule_musicians
  FOR EACH ROW
  EXECUTE FUNCTION handle_musician_status_change();