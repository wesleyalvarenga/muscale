/*
  # Fix infinite recursion in schedule_musicians policies

  1. Changes
    - Drop existing policies on schedule_musicians table
    - Create new policies with proper conditions to prevent recursion
    - Simplify the policy logic to avoid circular dependencies

  2. Security
    - Maintain existing security model where:
      - Users can only view their own schedule assignments
      - Schedule owners can manage musician assignments
      - Musicians can view their own assignments
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Add musicians to schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Delete musicians from schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can view their own assignments" ON schedule_musicians;
DROP POLICY IF EXISTS "Schedule owners can view musicians" ON schedule_musicians;
DROP POLICY IF EXISTS "Update musician status" ON schedule_musicians;

-- Create new policies with simplified conditions
CREATE POLICY "Schedule owners can manage musicians"
ON schedule_musicians
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
);

CREATE POLICY "Musicians can view their assignments"
ON schedule_musicians
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM musicians m
    WHERE m.id = schedule_musicians.musician_id
    AND m.user_id = auth.uid()
    AND m.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);