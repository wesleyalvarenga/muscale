/*
  # Add constraints for schedule metrics and deletion

  1. Changes
    - Add constraint to ensure metrics can only be created for confirmed schedules
    - Add trigger to prevent deletion of confirmed schedules
    - Update RLS policies to enforce these rules

  2. Security
    - Ensures data integrity by preventing deletion of confirmed schedules
    - Maintains accurate metrics by only tracking confirmed schedules
*/

-- Drop existing insert policy for metrics
DROP POLICY IF EXISTS "Users can create metrics for their schedules" ON musician_metrics;

-- Create new insert policy that checks schedule status
CREATE POLICY "Users can create metrics for confirmed schedules"
  ON musician_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    schedule_id IN (
      SELECT id 
      FROM schedules 
      WHERE user_id = auth.uid()
      AND deleted_at IS NULL
      AND status = 'confirmed'
    )
  );

-- Create function to prevent deletion of confirmed schedules
CREATE OR REPLACE FUNCTION prevent_confirmed_schedule_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM schedules 
    WHERE id = OLD.id 
    AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir uma escala confirmada';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of confirmed schedules
DROP TRIGGER IF EXISTS prevent_confirmed_schedule_deletion ON schedules;
CREATE TRIGGER prevent_confirmed_schedule_deletion
  BEFORE DELETE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION prevent_confirmed_schedule_deletion();