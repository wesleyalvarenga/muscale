/*
  # Remove musician schedule viewing functionality
  
  1. Changes
    - Drop all existing schedule-related policies
    - Create new admin-only policies for schedules and schedule_musicians
    - Remove musician access to schedules
  
  2. Security
    - Only admins can access and manage schedules
    - Musicians no longer have any access to schedule data
*/

-- Remove all existing schedule-related policies
DROP POLICY IF EXISTS "view_schedule_musicians" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "update_own_assignments" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can view their schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can update their notes" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Admins can manage schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Admins can manage schedule_musicians" ON "public"."schedule_musicians";

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