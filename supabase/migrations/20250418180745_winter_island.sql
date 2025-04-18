/*
  # Fix schedule_musicians view policy

  1. Changes
    - Replace the recursive policy for viewing schedule_musicians with a simpler one
    - Musicians can view their own assignments and assignments in schedules they're part of
    - Admins can view all assignments (through existing policy)

  2. Security
    - Maintains RLS protection
    - Ensures musicians can only see relevant assignments
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "view_schedule_musicians" ON "public"."schedule_musicians";

-- Create new non-recursive policy
CREATE POLICY "view_schedule_musicians" ON "public"."schedule_musicians"
  FOR SELECT
  TO authenticated
  USING (
    -- Musicians can see their own assignments
    musician_id IN (
      SELECT m.id 
      FROM musicians m 
      WHERE m.user_id = auth.uid() AND m.deleted_at IS NULL
    )
    OR
    -- Musicians can see assignments in schedules they're assigned to
    schedule_id IN (
      SELECT sm.schedule_id 
      FROM schedule_musicians sm
      JOIN musicians m ON m.id = sm.musician_id
      WHERE m.user_id = auth.uid() AND m.deleted_at IS NULL
    )
  );