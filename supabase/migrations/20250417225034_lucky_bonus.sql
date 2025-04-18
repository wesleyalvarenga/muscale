/*
  # Update musician policies

  1. Changes
    - Add policy for soft deleting musicians if it doesn't exist
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'musicians' 
      AND policyname = 'Users can soft delete their own musicians'
  ) THEN
    CREATE POLICY "Users can soft delete their own musicians"
      ON musicians
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK ((user_id = auth.uid()) AND (deleted_at IS NOT NULL));
  END IF;
END $$;