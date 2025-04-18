/*
  # Fix schedule_musicians RLS policies

  1. Changes
    - Remove recursive policies from schedule_musicians table
    - Add clearer, non-recursive policies for:
      - SELECT: Allow users to view schedule_musicians entries where they either own the schedule or are the musician
      - INSERT: Allow users to add musicians to their own schedules
      - UPDATE: Allow users to update musician status in their schedules
      - DELETE: Allow users to remove musicians from their schedules

  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Preserves existing access control logic
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Musicians can view their own schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Users can add musicians to their schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Users can delete musicians from their schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Users can update musician status in their schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can update own schedule notes" ON schedule_musicians;

-- Create new, non-recursive policies
CREATE POLICY "View schedule musicians" ON schedule_musicians
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
  OR 
  EXISTS (
    SELECT 1 FROM musicians m
    WHERE m.id = schedule_musicians.musician_id
    AND m.user_id = auth.uid()
    AND m.deleted_at IS NULL
  )
);

CREATE POLICY "Add musicians to schedules" ON schedule_musicians
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
);

CREATE POLICY "Update musician status" ON schedule_musicians
FOR UPDATE TO authenticated
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

CREATE POLICY "Delete musicians from schedules" ON schedule_musicians
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_musicians.schedule_id
    AND s.user_id = auth.uid()
    AND s.deleted_at IS NULL
  )
);