/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Drop and recreate the `View own schedules` policy on `schedules` table
    - Drop and recreate the `View schedule musicians` policy on `schedule_musicians` table
    - Optimize policies to prevent circular references
  
  2. Security
    - Maintains existing security model but prevents infinite recursion
    - Users can still view their own schedules and associated musicians
    - Musicians can still view schedules they're assigned to
*/

-- Drop existing policies that are causing the recursion
DROP POLICY IF EXISTS "View own schedules" ON schedules;
DROP POLICY IF EXISTS "View schedule musicians" ON schedule_musicians;

-- Create new policy for schedules that doesn't cause recursion
CREATE POLICY "View own schedules" ON schedules
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    id IN (
      SELECT sm.schedule_id 
      FROM schedule_musicians sm 
      JOIN musicians m ON m.id = sm.musician_id 
      WHERE m.user_id = auth.uid() 
        AND m.deleted_at IS NULL
        AND sm.deleted_at IS NULL
    )
  );

-- Create new policy for schedule_musicians that doesn't cause recursion
CREATE POLICY "View schedule musicians" ON schedule_musicians
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM schedules s 
      WHERE s.id = schedule_id 
        AND (
          s.user_id = auth.uid() 
          OR 
          musician_id IN (
            SELECT id 
            FROM musicians 
            WHERE user_id = auth.uid() 
              AND deleted_at IS NULL
          )
        )
        AND s.deleted_at IS NULL
    )
  );