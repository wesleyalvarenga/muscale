/*
  # Remove schedule viewing functionality for musicians
  
  1. Changes
    - Remove all schedule-related policies for musicians
    - Keep only admin policies for schedule management
  
  2. Security
    - Only admins can manage schedules and assignments
*/

-- Remove all existing schedule-related policies
DROP POLICY IF EXISTS "Musicians can view their schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can update their notes" ON "public"."schedule_musicians";

-- Keep only admin policies
DROP POLICY IF EXISTS "admin_manage_schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "admin_manage_schedule_musicians" ON "public"."schedule_musicians";

-- Create admin-only policy for schedules
CREATE POLICY "admin_manage_schedules"
ON "public"."schedules"
AS PERMISSIVE
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

-- Create admin-only policy for schedule_musicians
CREATE POLICY "admin_manage_schedule_musicians"
ON "public"."schedule_musicians"
AS PERMISSIVE
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