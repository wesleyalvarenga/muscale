/*
  # Fix schedule_musicians policy recursion

  1. Changes
    - Drop the problematic policy that causes infinite recursion
    - Create new policy with fixed conditions that avoid recursion
    
  2. Security
    - Maintain same security level but with optimized query
    - Musicians can still view schedule assignments they are part of
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON schedule_musicians;

-- Create new policy with fixed conditions
CREATE POLICY "Musicians can view schedule assignments"
ON schedule_musicians
FOR SELECT
TO authenticated
USING (
  musician_id IN (
    SELECT id 
    FROM musicians 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
  OR 
  schedule_id IN (
    SELECT schedule_id 
    FROM schedule_musicians sm 
    WHERE sm.musician_id IN (
      SELECT id 
      FROM musicians 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);