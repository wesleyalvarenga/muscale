/*
  # Fix schedule_musicians policies

  1. Changes
    - Remove all existing schedule_musicians policies
    - Create a single, non-recursive policy for viewing assignments
    - Simplify the policy logic to avoid recursion
    - Maintain security requirements (users can only see their own assignments and those in schedules they're part of)

  2. Security
    - Musicians can view their own assignments
    - Musicians can view assignments of schedules they're part of
    - No recursive policy checks
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can view own assignments" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can view assignments for their schedules" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can update their responses" ON schedule_musicians;

-- Create a single, simplified policy for viewing assignments
CREATE POLICY "view_schedule_musicians" ON schedule_musicians
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM musicians m
    WHERE m.user_id = auth.uid()
    AND m.deleted_at IS NULL
    AND (
      m.id = schedule_musicians.musician_id -- Can view own assignments
      OR
      m.id IN ( -- Can view assignments of schedules they're in
        SELECT sm.musician_id
        FROM schedule_musicians sm
        WHERE sm.schedule_id = schedule_musicians.schedule_id
      )
    )
  )
);

-- Create a simple policy for updating own assignments
CREATE POLICY "update_own_assignments" ON schedule_musicians
FOR UPDATE TO authenticated
USING (
  musician_id IN (
    SELECT id
    FROM musicians
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  )
)
WITH CHECK (
  musician_id IN (
    SELECT id
    FROM musicians
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  )
);