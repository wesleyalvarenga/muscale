/*
  # Fix schedule policies

  This migration removes the complex schedule viewing policies and simplifies access control:
  
  1. Changes
    - Removes all schedule viewing policies for musicians
    - Updates admin access policies for schedules
    - Maintains basic profile and musician management policies
  
  2. Security
    - Admins retain full control over schedules
    - Musicians can only manage their own profiles
*/

-- Remove all existing schedule-related policies
DROP POLICY IF EXISTS "view_schedule_musicians" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "update_own_assignments" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can view their schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Admins can manage schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Admins can manage schedule_musicians" ON "public"."schedule_musicians";

-- Create admin-only policy for schedules
CREATE POLICY "Admins can manage schedules"
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
CREATE POLICY "Admins can manage schedule_musicians"
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