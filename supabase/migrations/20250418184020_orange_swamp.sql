/*
  # Update schedule policies for musicians
  
  1. Changes
    - Allow musicians to view schedules and assignments
    - Keep admin management capabilities
    - Restrict musicians from modifying schedules
  
  2. Security
    - Musicians can only view schedules they're assigned to
    - Admins retain full management capabilities
*/

-- Remove existing policies
DROP POLICY IF EXISTS "admin_manage_schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "admin_manage_schedule_musicians" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can view their schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON "public"."schedule_musicians";

-- Create policy for musicians to view schedules
CREATE POLICY "Musicians can view their schedules"
ON "public"."schedules"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM schedule_musicians sm 
    JOIN musicians m ON m.id = sm.musician_id
    WHERE sm.schedule_id = schedules.id 
    AND m.user_id = auth.uid() 
    AND m.deleted_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy for musicians to view schedule assignments
CREATE POLICY "Musicians can view schedule assignments"
ON "public"."schedule_musicians"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM musicians m
    WHERE m.user_id = auth.uid()
    AND m.deleted_at IS NULL
    AND (
      m.id = schedule_musicians.musician_id
      OR schedule_musicians.schedule_id IN (
        SELECT sm.schedule_id
        FROM schedule_musicians sm
        WHERE sm.musician_id = m.id
      )
    )
  )
  OR
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create admin-only policy for managing schedules
CREATE POLICY "admin_manage_schedules"
ON "public"."schedules"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create admin-only policy for managing schedule assignments
CREATE POLICY "admin_manage_schedule_musicians"
ON "public"."schedule_musicians"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);