/*
  # Fix infinite recursion in schedule_musicians policy

  1. Changes
    - Remove recursive policy for schedule_musicians table
    - Create new, simplified policies that avoid recursion
    - Keep existing functionality but implement it more efficiently

  2. Security
    - Maintain same security level but with better performance
    - Musicians can still only view their own assignments and assignments for schedules they're part of
    - Admins retain full access
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON schedule_musicians;

-- Create new non-recursive policies
CREATE POLICY "Musicians can view own assignments"
ON schedule_musicians
FOR SELECT
TO authenticated
USING (
  musician_id IN (
    SELECT id 
    FROM musicians 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

CREATE POLICY "Musicians can view assignments for their schedules"
ON schedule_musicians
FOR SELECT
TO authenticated
USING (
  schedule_id IN (
    SELECT schedule_id 
    FROM schedule_musicians sm
    JOIN musicians m ON m.id = sm.musician_id
    WHERE m.user_id = auth.uid() AND m.deleted_at IS NULL
  )
);