/*
  # Reset musician status when instrument changes

  1. Changes
    - Add trigger to reset musician status to 'pending' when instrument changes
    - Update existing trigger to track instrument changes in metrics

  2. Notes
    - Ensures proper tracking of musician assignments
    - Maintains data integrity when roles change
*/

-- Update the function to handle instrument changes
CREATE OR REPLACE FUNCTION handle_musician_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If instrument is changed, reset status to pending
  IF NEW.instrument_id IS DISTINCT FROM OLD.instrument_id THEN
    NEW.status = 'pending';
  END IF;

  -- Track status changes for metrics
  IF NEW.status != OLD.status OR NEW.instrument_id IS DISTINCT FROM OLD.instrument_id THEN
    INSERT INTO musician_metrics (
      schedule_id,
      musician_id,
      event_type,
      old_status,
      new_status
    ) VALUES (
      NEW.schedule_id,
      NEW.musician_id,
      CASE
        WHEN NEW.instrument_id IS DISTINCT FROM OLD.instrument_id THEN 'status_change'
        WHEN NEW.status = 'declined' THEN 'replacement_needed'
        WHEN NEW.status = 'confirmed' AND OLD.status = 'pending' THEN 'confirmation'
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;