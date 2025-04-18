/*
  # Fix recursive policy in schedules table

  1. Changes
    - Drop existing policy that causes recursion
    - Create new policy with optimized conditions
    - Simplify policy logic to prevent recursion

  2. Security
    - Maintains same security rules but implements them more efficiently
    - Users can still only view:
      - Their own schedules
      - Schedules they are assigned to as musicians
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "View own schedules" ON schedules;

-- Create new optimized policy
CREATE POLICY "View own schedules" ON schedules
FOR SELECT TO authenticated
USING (
  (
    -- User owns the schedule
    (user_id = auth.uid() AND deleted_at IS NULL)
    OR
    -- User is a musician assigned to the schedule
    EXISTS (
      SELECT 1 
      FROM schedule_musicians sm 
      JOIN musicians m ON m.id = sm.musician_id 
      WHERE 
        sm.schedule_id = schedules.id 
        AND m.user_id = auth.uid() 
        AND m.deleted_at IS NULL 
        AND schedules.deleted_at IS NULL
    )
  )
);