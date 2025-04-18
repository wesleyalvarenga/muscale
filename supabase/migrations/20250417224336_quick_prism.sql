/*
  # Update Musicians RLS Policies

  1. Changes
    - Update DELETE policy to handle soft deletes properly
    - Update SELECT policy to ensure consistent visibility rules
    - Update UPDATE policy to ensure proper access control

  2. Security
    - Policies ensure users can only manage their own musicians
    - Soft delete is properly handled in all policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Musicians are viewable by authenticated users" ON musicians;
DROP POLICY IF EXISTS "Users can delete their own musicians" ON musicians;
DROP POLICY IF EXISTS "Users can update their own musicians" ON musicians;

-- Create updated policies
CREATE POLICY "Musicians are viewable by authenticated users"
ON musicians
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND deleted_at IS NULL
);

CREATE POLICY "Users can update their own musicians"
ON musicians
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can soft delete their own musicians"
ON musicians
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND deleted_at IS NOT NULL
);