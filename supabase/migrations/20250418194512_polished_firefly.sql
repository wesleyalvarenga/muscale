-- Remove existing policies
DROP POLICY IF EXISTS "admin_manage_schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "admin_manage_schedule_musicians" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can view their schedules" ON "public"."schedules";
DROP POLICY IF EXISTS "Musicians can view schedule assignments" ON "public"."schedule_musicians";
DROP POLICY IF EXISTS "Musicians can update their assignments" ON "public"."schedule_musicians";

-- Create policy for musicians to view their schedules
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

-- Create policy for musicians to view all musicians in their schedules
CREATE POLICY "Musicians can view schedule assignments"
ON "public"."schedule_musicians"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM schedule_musicians sm
    JOIN musicians m ON m.id = sm.musician_id
    WHERE m.user_id = auth.uid()
    AND m.deleted_at IS NULL
    AND sm.schedule_id = schedule_musicians.schedule_id
  )
  OR
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy for musicians to update their own assignments
CREATE POLICY "Musicians can update their assignments"
ON "public"."schedule_musicians"
FOR UPDATE
TO authenticated
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