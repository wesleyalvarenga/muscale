/*
  # Fix schedules RLS policy

  1. Changes
    - Remove recursive policy for schedules table
    - Add simplified policy for authenticated users
    
  2. Security
    - Enable RLS on schedules table
    - Add policy for users to view their own schedules
    - Add policy for users to view schedules they are assigned to as musicians
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Schedules are viewable by authenticated users" ON schedules;

-- Create new simplified policies
CREATE POLICY "Users can view their own schedules"
ON schedules
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() AND deleted_at IS NULL
);

CREATE POLICY "Musicians can view schedules they are assigned to"
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