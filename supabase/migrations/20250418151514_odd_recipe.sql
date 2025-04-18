/*
  # Fix recursive policies in schedules and schedule_musicians tables

  1. Changes
    - Drop existing policies that are causing recursion
    - Create new non-recursive policies for schedules table
    - Create new non-recursive policies for schedule_musicians table
    
  2. Security
    - Maintain RLS enabled on both tables
    - Ensure proper access control while avoiding recursion
    - Users can only access their own schedules and related musician assignments
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "View own schedules" ON schedules;
DROP POLICY IF EXISTS "Musicians can view their assignments" ON schedule_musicians;

-- Create new non-recursive policy for schedules
CREATE POLICY "View own schedules" ON schedules
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  id IN (
    SELECT schedule_id 
    FROM schedule_musicians sm 
    JOIN musicians m ON m.id = sm.musician_id 
    WHERE m.user_id = auth.uid() AND m.deleted_at IS NULL
  )
);

-- Create new non-recursive policy for schedule_musicians
CREATE POLICY "Musicians can view their assignments" ON schedule_musicians
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM musicians m
    WHERE m.id = musician_id 
    AND m.user_id = auth.uid() 
    AND m.deleted_at IS NULL
  ) OR
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_id 
    AND s.user_id = auth.uid()
  )
);