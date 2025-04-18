/*
  # Update musician policies

  1. Changes
    - Update schedule_musicians policies to allow musicians to view all musicians in their schedules
    - Add policy for musicians to update their own schedule responses
    - Fix schedule viewing policies for musicians

  2. Security
    - Maintain RLS enabled
    - Ensure musicians can only update their own responses
    - Allow viewing of all musicians in shared schedules
*/

-- Update schedule_musicians policies
DROP POLICY IF EXISTS "Musicians can view their assignments" ON schedule_musicians;
CREATE POLICY "Musicians can view schedule assignments"
  ON schedule_musicians
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM schedule_musicians sm 
      WHERE sm.schedule_id = schedule_musicians.schedule_id 
      AND sm.musician_id IN (
        SELECT id 
        FROM musicians 
        WHERE user_id = auth.uid() 
        AND deleted_at IS NULL
      )
    )
  );

-- Add policy for musicians to update their responses
CREATE POLICY "Musicians can update their responses"
  ON schedule_musicians
  FOR UPDATE
  TO authenticated
  USING (
    musician_id IN (
      SELECT id 
      FROM musicians 
      WHERE user_id = auth.uid() 
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    musician_id IN (
      SELECT id 
      FROM musicians 
      WHERE user_id = auth.uid() 
      AND deleted_at IS NULL
    )
  );

-- Update schedules policies to allow musicians to view their schedules
DROP POLICY IF EXISTS "Musicians can view their schedules" ON schedules;
CREATE POLICY "Musicians can view their schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM schedule_musicians sm 
      JOIN musicians m ON m.id = sm.musician_id
      WHERE sm.schedule_id = schedules.id 
      AND m.user_id = auth.uid() 
      AND m.deleted_at IS NULL
    )
  );