/*
  # Add tracking for musician replacements

  This migration adds functionality to track musician replacements in schedules.

  1. Changes
    - Add trigger to track when a musician's status changes to 'declined'
    - Add function to handle the tracking
*/

-- Create a function to handle musician status changes
CREATE OR REPLACE FUNCTION handle_musician_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changed to 'declined', we consider it a replacement
  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    -- The replacement is tracked by the status change itself
    -- We can query schedule_musicians with status = 'declined' to get replacement stats
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to track musician status changes
CREATE TRIGGER track_musician_replacements
  BEFORE UPDATE ON schedule_musicians
  FOR EACH ROW
  EXECUTE FUNCTION handle_musician_status_change();