/*
  # Fix schedule_musicians policies

  1. Changes
    - Remove circular reference in schedule_musicians policies
    - Simplify policy conditions to prevent infinite recursion
    - Update view policy to use direct user authentication check
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON schedule_musicians;
DROP POLICY IF EXISTS "Musicians can update their assignments" ON schedule_musicians;
DROP POLICY IF EXISTS "admin_manage_schedule_musicians" ON schedule_musicians;

-- Create new policies without circular references
CREATE POLICY "Musicians can view their assignments"
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

CREATE POLICY "Musicians can update their assignments"
ON schedule_musicians
FOR UPDATE
TO authenticated
USING (
  musician_id IN (
    SELECT id 
    FROM musicians 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
)
WITH CHECK (
  musician_id IN (
    SELECT id 
    FROM musicians 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

CREATE POLICY "Admins can manage schedule musicians"
ON schedule_musicians
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);