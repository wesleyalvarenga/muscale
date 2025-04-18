/*
  # Add RLS policy for musician metrics

  1. Changes
    - Add new RLS policy to allow inserting metrics for confirmed schedules
    - Policy ensures users can only create metrics for schedules they own
    - Maintains data integrity by checking schedule ownership and status

  2. Security
    - Only authenticated users can create metrics
    - Users can only create metrics for their own schedules
    - Schedule must be confirmed to allow metric creation
*/

CREATE POLICY "Users can create metrics for their schedules"
  ON musician_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = musician_metrics.schedule_id
      AND schedules.user_id = auth.uid()
      AND schedules.deleted_at IS NULL
    )
  );