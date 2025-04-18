/*
  # Add soft delete to musician invitations

  1. Changes
    - Add deleted_at column to musician_invitations table
    - Update RLS policies to handle soft deletes
    - Add policy for updating invitations
*/

-- Add deleted_at column
ALTER TABLE musician_invitations
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their sent invitations" ON musician_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON musician_invitations;

-- Create updated policies
CREATE POLICY "Users can view their sent invitations"
  ON musician_invitations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can create invitations"
  ON musician_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their invitations"
  ON musician_invitations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());