/*
  # Add schedule features
  
  1. Changes
    - Add allow_individual_confirmation column to schedules table
    - Create musician_unavailability table for calendar feature
    
  2. Security
    - Enable RLS on new table
    - Add policies for proper access control
*/

-- Add allow_individual_confirmation to schedules
ALTER TABLE schedules
ADD COLUMN allow_individual_confirmation boolean DEFAULT false;

-- Create musician_unavailability table
CREATE TABLE musician_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  CONSTRAINT date_order_check CHECK (start_date <= end_date)
);

-- Enable RLS
ALTER TABLE musician_unavailability ENABLE ROW LEVEL SECURITY;

-- Create policies for musician_unavailability
CREATE POLICY "Musicians can manage their own unavailability"
ON musician_unavailability
FOR ALL
TO authenticated
USING (
  musician_id IN (
    SELECT id FROM musicians
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  )
)
WITH CHECK (
  musician_id IN (
    SELECT id FROM musicians
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  )
);

CREATE POLICY "Admins can view all unavailability"
ON musician_unavailability
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Update schedules order in existing policy
DROP POLICY IF EXISTS "Musicians can view their schedules" ON schedules;

CREATE POLICY "Musicians can view their schedules"
ON schedules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM schedule_musicians sm 
    JOIN musicians m ON m.id = sm.musician_id
    WHERE sm.schedule_id = schedules.id 
    AND m.user_id = auth.uid() 
    AND m.deleted_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Function to handle schedule confirmation
CREATE OR REPLACE FUNCTION handle_schedule_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Update all pending musicians to confirmed
    UPDATE schedule_musicians
    SET status = 'confirmed'
    WHERE schedule_id = NEW.id
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schedule confirmation
CREATE TRIGGER schedule_confirmation_trigger
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION handle_schedule_confirmation();