/*
  # Add Musicians Insert Policy

  1. Security Changes
    - Add INSERT policy for musicians table
    - Policy allows authenticated users to create musicians where:
      - The user_id matches the authenticated user's ID
      - Required fields (name, whatsapp, email) are provided

  2. Notes
    - This maintains security by ensuring users can only create musicians linked to their own account
    - Preserves data integrity by requiring essential fields
*/

CREATE POLICY "Users can create their own musicians"
ON public.musicians
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  name IS NOT NULL AND
  whatsapp IS NOT NULL AND
  email IS NOT NULL
);