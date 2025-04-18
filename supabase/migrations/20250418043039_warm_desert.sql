/*
  # Fix recursive schedule policies

  1. Changes
    - Remove recursive policy conditions from schedules table
    - Update policies to use proper joins without recursion
    - Maintain security while fixing infinite recursion issue

  2. Security
    - Maintains RLS protection
    - Updates policies to be more efficient
    - Preserves existing access control logic
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Musicians can view schedules they are assigned to" ON schedules;
DROP POLICY IF EXISTS "Users can view their own schedules" ON schedules;

-- Create new non-recursive policies
CREATE POLICY "View own schedules"
ON schedules
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid() AND deleted_at IS NULL)
  OR
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
);