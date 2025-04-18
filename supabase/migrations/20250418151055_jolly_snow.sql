/*
  # Fix recursive schedule policies

  1. Changes
    - Remove recursive policy from schedule_musicians table
    - Add separate policies for schedule owners and musicians
    - Optimize policy conditions to prevent recursion

  2. Security
    - Maintains existing security model but eliminates infinite recursion
    - Ensures users can only view their own schedules and schedules they're invited to
*/

-- Drop existing policies
DROP POLICY IF EXISTS "View schedule musicians" ON schedule_musicians;

-- Create new non-recursive policies
CREATE POLICY "Schedule owners can view musicians"
ON schedule_musicians
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
);

CREATE POLICY "Musicians can view their own assignments"
ON schedule_musicians
FOR SELECT
TO authenticated
USING (
  musician_id IN (
    SELECT id FROM musicians
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Update schedules policies to be more efficient
DROP POLICY IF EXISTS "View own schedules" ON schedules;

CREATE POLICY "View own schedules"
ON schedules
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  id IN (
    SELECT schedule_id 
    FROM schedule_musicians sm
    JOIN musicians m ON m.id = sm.musician_id
    WHERE m.user_id = auth.uid()
    AND m.deleted_at IS NULL
    AND sm.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);