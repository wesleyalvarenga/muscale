/*
  # Update musician_metrics RLS policies

  1. Changes
    - Add INSERT policy for musician_metrics table to allow authenticated users to create metrics
      when they own the related schedule

  2. Security
    - Enable RLS on musician_metrics table (already enabled)
    - Add policy for authenticated users to insert metrics for schedules they own
*/

CREATE POLICY "Users can create metrics for their schedules"
  ON musician_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    schedule_id IN (
      SELECT id 
      FROM schedules 
      WHERE user_id = auth.uid()
      AND deleted_at IS NULL
    )
  );