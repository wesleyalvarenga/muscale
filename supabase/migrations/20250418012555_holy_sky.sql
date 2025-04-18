/*
  # Add Update Policy for Musician Invitations

  1. Changes
    - Add UPDATE policy for musician_invitations table
    - Policy allows users to update their own invitations
    - Add deleted_at column if it doesn't exist

  2. Security
    - Only invitation owners can update their invitations
    - Maintains data integrity through soft deletes
*/

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'musician_invitations' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE musician_invitations 
    ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their invitations" ON musician_invitations;

-- Create new update policy
CREATE POLICY "Users can update their invitations"
  ON musician_invitations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update select policy to exclude deleted records
DROP POLICY IF EXISTS "Users can view their sent invitations" ON musician_invitations;

CREATE POLICY "Users can view their sent invitations"
  ON musician_invitations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);