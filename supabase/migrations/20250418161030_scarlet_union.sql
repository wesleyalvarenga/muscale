/*
  # Create schedules and related tables

  1. New Tables
    - `schedules`
      - Basic schedule information including title, date, time, and status
    - `schedule_musicians`
      - Links musicians to schedules with their assigned instruments
    - `locations`
      - Stores venue/location information for schedules

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create locations table
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  address text,
  notes text
);

-- Create schedules table
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location_id uuid REFERENCES locations(id),
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  deleted_at timestamptz DEFAULT NULL
);

-- Create schedule_musicians table
CREATE TABLE schedule_musicians (
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (schedule_id, musician_id)
);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_musicians ENABLE ROW LEVEL SECURITY;

-- Create policies for locations
CREATE POLICY "Admins can manage locations"
  ON locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create policies for schedules
CREATE POLICY "Admins can manage schedules"
  ON schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Musicians can view their schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedule_musicians sm
      JOIN musicians m ON m.id = sm.musician_id
      WHERE sm.schedule_id = schedules.id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
    )
  );

-- Create policies for schedule_musicians
CREATE POLICY "Admins can manage schedule_musicians"
  ON schedule_musicians
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
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

-- Create function to prevent deletion of confirmed schedules
CREATE OR REPLACE FUNCTION prevent_confirmed_schedule_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'confirmed' THEN
    RAISE EXCEPTION 'Não é possível excluir uma escala confirmada';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of confirmed schedules
CREATE TRIGGER prevent_confirmed_schedule_deletion
  BEFORE DELETE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION prevent_confirmed_schedule_deletion();