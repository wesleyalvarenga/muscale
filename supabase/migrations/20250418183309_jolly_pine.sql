/*
  # Update schedule viewing policies
  
  1. Changes
    - Add policies for musicians to view their schedules and assignments
    - Allow musicians to update their responses and notes
  
  2. Security
    - Musicians can only view schedules they are assigned to
    - Musicians can only update their own responses and notes
*/

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
);

-- Create policy for musicians to update their notes
CREATE POLICY "Musicians can update their notes"
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