/*
  # Add delete policy for musicians table

  1. Security Changes
    - Add RLS policy to allow users to delete their own musicians
    - Policy ensures users can only delete musicians where they are the owner (user_id matches authenticated user's id)
*/

CREATE POLICY "Users can delete their own musicians"
  ON musicians
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);