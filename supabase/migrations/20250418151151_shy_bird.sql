/*
  # Remove metrics functionality
  
  1. Changes
    - Drop musician_metrics table
    - Remove related triggers and functions
    - Clean up policies
*/

-- Drop the musician_metrics table and related objects
DROP TABLE IF EXISTS musician_metrics;

-- Drop the trigger for tracking musician replacements
DROP TRIGGER IF EXISTS track_musician_replacements ON schedule_musicians;

-- Drop the function for handling musician status changes
DROP FUNCTION IF EXISTS handle_musician_status_change();

-- Create a simpler function for handling musician status changes
CREATE OR REPLACE FUNCTION handle_musician_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If instrument is changed, reset status to pending
  IF NEW.instrument_id IS DISTINCT FROM OLD.instrument_id THEN
    NEW.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with simplified functionality
CREATE TRIGGER track_musician_replacements
  BEFORE UPDATE ON schedule_musicians
  FOR EACH ROW
  EXECUTE FUNCTION handle_musician_status_change();