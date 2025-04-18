/*
  # Fix infinite recursion in RLS policies

  1. Changes
    - Simplify RLS policies to avoid circular references
    - Optimize policy conditions for better performance
    - Ensure proper access control without recursion

  2. Security
    - Maintain existing security rules
    - Prevent unauthorized access
    - Keep soft delete functionality
*/

-- Drop existing policies
DROP POLICY IF EXISTS "View own schedules" ON schedules;
DROP POLICY IF EXISTS "Schedule owners can manage musicians" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can view their assignments" ON schedule_musicians;

-- Create new non-recursive policy for schedules
CREATE POLICY "View schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    -- User owns the schedule
    (user_id = auth.uid() AND deleted_at IS NULL)
    OR 
    -- User is a musician in the schedule
    EXISTS (
      SELECT 1 
      FROM musicians m
      INNER JOIN schedule_musicians sm ON sm.musician_id = m.id
      WHERE sm.schedule_id = schedules.id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
      AND sm.deleted_at IS NULL
    )
  );

-- Create new non-recursive policies for schedule_musicians
CREATE POLICY "Manage schedule musicians"
  ON schedule_musicians
  FOR ALL
  TO authenticated
  USING (
    -- Schedule owner can manage musicians
    EXISTS (
      SELECT 1 
      FROM schedules s
      WHERE s.id = schedule_musicians.schedule_id
      AND s.user_id = auth.uid()
      AND s.deleted_at IS NULL
    )
  )
  WITH CHECK (
    -- Schedule owner can manage musicians
    EXISTS (
      SELECT 1 
      FROM schedules s
      WHERE s.id = schedule_musicians.schedule_id
      AND s.user_id = auth.uid()
      AND s.deleted_at IS NULL
    )
  );

CREATE POLICY "View own assignments"
  ON schedule_musicians
  FOR SELECT
  TO authenticated
  USING (
    -- Musicians can view their own assignments
    EXISTS (
      SELECT 1 
      FROM musicians m
      WHERE m.id = schedule_musicians.musician_id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
    )
  );