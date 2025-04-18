/*
  # Rebuild Schedule System
  
  1. Changes
    - Drop existing schedule-related tables and policies
    - Create new schedule tables with proper structure
    - Add RLS policies for secure access
    
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Ensure data integrity with constraints
*/

-- Drop existing tables and related objects
DROP TABLE IF EXISTS schedule_musicians CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- Create schedules table
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  start_time_2 time,
  end_time_2 time,
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  deleted_at timestamptz DEFAULT NULL
);

-- Create schedule_musicians table
CREATE TABLE schedule_musicians (
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  notes text,
  deleted_at timestamptz DEFAULT NULL,
  PRIMARY KEY (schedule_id, musician_id)
);

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_musicians ENABLE ROW LEVEL SECURITY;

-- Policies for schedules
CREATE POLICY "View own schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND deleted_at IS NULL) OR
    id IN (
      SELECT sm.schedule_id 
      FROM schedule_musicians sm
      JOIN musicians m ON m.id = sm.musician_id
      WHERE m.user_id = auth.uid() AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "Create own schedules"
  ON schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own schedules"
  ON schedules
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own schedules"
  ON schedules
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status != 'confirmed');

-- Policies for schedule_musicians
CREATE POLICY "Schedule owners can manage musicians"
  ON schedule_musicians
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.id = schedule_id
      AND s.user_id = auth.uid()
      AND s.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.id = schedule_id
      AND s.user_id = auth.uid()
      AND s.deleted_at IS NULL
    )
  );

CREATE POLICY "Musicians can view their assignments"
  ON schedule_musicians
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM musicians m
      WHERE m.id = musician_id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
    )
  );

-- Function to prevent confirmed schedule deletion
CREATE OR REPLACE FUNCTION prevent_confirmed_schedule_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'confirmed' THEN
    RAISE EXCEPTION 'Não é possível excluir uma escala confirmada';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent confirmed schedule deletion
CREATE TRIGGER prevent_confirmed_schedule_deletion
  BEFORE DELETE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION prevent_confirmed_schedule_deletion();

-- Function to handle musician status changes
CREATE OR REPLACE FUNCTION enforce_musician_update_restrictions()
RETURNS TRIGGER AS $$
BEGIN
  -- If instrument is changed, reset status to pending
  IF NEW.instrument_id IS DISTINCT FROM OLD.instrument_id THEN
    NEW.status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for musician updates
CREATE TRIGGER enforce_musician_updates
  BEFORE UPDATE ON schedule_musicians
  FOR EACH ROW
  EXECUTE FUNCTION enforce_musician_update_restrictions();