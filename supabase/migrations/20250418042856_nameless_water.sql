/*
  # Fix infinite recursion in schedule_musicians policies

  1. Changes
    - Drop existing policies on schedule_musicians table
    - Create new policies with optimized conditions to prevent recursion
    - Policies are simplified to use direct user_id checks from schedules table

  2. Security
    - Maintains row level security
    - Ensures users can only access their own data
    - Prevents infinite recursion while maintaining security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "View schedule musicians" ON schedule_musicians;
DROP POLICY IF EXISTS "Add musicians to schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Delete musicians from schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Update musician status" ON schedule_musicians;

-- Create new policies with optimized conditions
CREATE POLICY "View schedule musicians"
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

CREATE POLICY "Add musicians to schedules"
ON schedule_musicians
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
);

CREATE POLICY "Delete musicians from schedules"
ON schedule_musicians
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
);

CREATE POLICY "Update musician status"
ON schedule_musicians
FOR UPDATE
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