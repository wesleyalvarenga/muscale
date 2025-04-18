/*
  # Add Update Policy for Musicians

  1. Security Changes
    - Add UPDATE policy for musicians table
    - Policy allows authenticated users to update musicians where:
      - The musician belongs to the authenticated user (user_id matches)

  2. Notes
    - This enables the toggle active/inactive functionality
    - Maintains security by ensuring users can only update their own musicians
*/

CREATE POLICY "Users can update their own musicians"
ON public.musicians
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);