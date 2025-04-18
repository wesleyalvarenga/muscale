-- Update policies for musicians table
DROP POLICY IF EXISTS "Musicians are viewable by authenticated users" ON musicians;

-- Create new policy for viewing musicians
CREATE POLICY "View musicians"
ON musicians
FOR SELECT
TO authenticated
USING (
  -- Users can view their own musicians
  (user_id = auth.uid() AND deleted_at IS NULL)
  OR
  -- Admins can view all musicians
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy for updating musicians
CREATE POLICY "Update musicians"
ON musicians
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own musicians
  (user_id = auth.uid() AND deleted_at IS NULL)
  OR
  -- Admins can update all musicians
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  -- Users can update their own musicians
  (user_id = auth.uid())
  OR
  -- Admins can update all musicians
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);