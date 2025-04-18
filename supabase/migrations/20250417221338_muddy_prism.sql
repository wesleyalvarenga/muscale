/*
  # Add RLS policies for schedule_musicians table

  1. Security Changes
    - Add INSERT policy for authenticated users to add musicians to schedules
    - Add UPDATE policy for authenticated users to update musician status
    - Add DELETE policy for authenticated users to remove musicians from schedules
*/

CREATE POLICY "Users can add musicians to their schedules"
  ON schedule_musicians
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_musicians.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update musician status in their schedules"
  ON schedule_musicians
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_musicians.schedule_id
      AND schedules.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_musicians.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete musicians from their schedules"
  ON schedule_musicians
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_musicians.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );