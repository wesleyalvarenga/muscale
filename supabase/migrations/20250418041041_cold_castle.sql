/*
  # Add user roles and update permissions

  1. Changes
    - Add role column to profiles table
    - Update RLS policies to enforce role-based access
    - Add default role for new users (musician)

  2. Security
    - Only administrators can access admin features
    - Musicians can only view and update their own schedules
*/

-- Add role column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'musician'
CHECK (role IN ('admin', 'musician'));

-- Update policies for musicians table
DROP POLICY IF EXISTS "Musicians are viewable by authenticated users" ON musicians;
CREATE POLICY "Musicians are viewable by authenticated users"
ON musicians FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid() AND deleted_at IS NULL) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Update policies for schedules table
DROP POLICY IF EXISTS "Schedules are viewable by authenticated users" ON schedules;
CREATE POLICY "Schedules are viewable by authenticated users"
ON schedules FOR SELECT
TO authenticated
USING (
  (
    -- Musicians can view schedules they're part of
    EXISTS (
      SELECT 1 FROM schedule_musicians sm
      JOIN musicians m ON m.id = sm.musician_id
      WHERE sm.schedule_id = schedules.id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
    )
  ) OR (
    -- Admins can view all schedules
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- Update policies for schedule_musicians table
DROP POLICY IF EXISTS "Musicians can update notes on their schedules" ON schedule_musicians;
CREATE POLICY "Musicians can update own schedule notes"
ON schedule_musicians FOR UPDATE
TO authenticated
USING (
  -- Musicians can only update notes on their own assignments
  EXISTS (
    SELECT 1 FROM musicians
    WHERE musicians.id = schedule_musicians.musician_id
    AND musicians.user_id = auth.uid()
    AND musicians.deleted_at IS NULL
  ) OR (
    -- Admins can update everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  -- Musicians can only update notes
  (
    EXISTS (
      SELECT 1 FROM musicians
      WHERE musicians.id = schedule_musicians.musician_id
      AND musicians.user_id = auth.uid()
      AND musicians.deleted_at IS NULL
    )
  ) OR (
    -- Admins can update everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- Create a trigger function to enforce musician update restrictions
CREATE OR REPLACE FUNCTION enforce_musician_update_restrictions()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  -- For musicians, only allow updating notes
  IF NEW.musician_id != OLD.musician_id OR
     NEW.instrument_id != OLD.instrument_id OR
     NEW.status != OLD.status THEN
    RAISE EXCEPTION 'Musicians can only update notes field';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_musician_updates ON schedule_musicians;
CREATE TRIGGER enforce_musician_updates
  BEFORE UPDATE ON schedule_musicians
  FOR EACH ROW
  EXECUTE FUNCTION enforce_musician_update_restrictions();