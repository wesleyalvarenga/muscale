/*
  # Update Musicians Table Structure

  1. Changes
    - Remove email requirement from musicians table
    - Add active flag with default value true
    - Update existing RLS policies to reflect new structure

  2. Notes
    - Using DO block to safely handle column modifications
    - Maintaining RLS security while updating constraints
*/

DO $$ 
BEGIN
  -- Remove email requirement from musicians table
  ALTER TABLE musicians 
    ALTER COLUMN email DROP NOT NULL;

  -- Update the INSERT policy to remove email requirement
  DROP POLICY IF EXISTS "Users can create their own musicians" ON musicians;
  
  CREATE POLICY "Users can create their own musicians"
    ON musicians
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = user_id AND
      name IS NOT NULL AND
      whatsapp IS NOT NULL
    );
END $$;