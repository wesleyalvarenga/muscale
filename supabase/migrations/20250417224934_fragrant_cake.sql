/*
  # Add musician invitation system

  1. New Tables
    - `musician_invitations`
      - `id` (uuid, primary key)
      - `email` (text, required)
      - `token` (text, required)
      - `status` (text: pending, accepted, expired)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `user_id` (uuid, references users)

  2. Security
    - Enable RLS on new table
    - Add policies for invitation management
*/

-- Create musician invitations table
CREATE TABLE musician_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  CONSTRAINT musician_invitations_status_check CHECK (
    status IN ('pending', 'accepted', 'expired')
  )
);

-- Enable RLS
ALTER TABLE musician_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their sent invitations"
  ON musician_invitations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create invitations"
  ON musician_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add notes column to schedule_musicians for observations
ALTER TABLE schedule_musicians
ADD COLUMN IF NOT EXISTS notes text;

-- Update schedule_musicians policies
DROP POLICY IF EXISTS "Schedule musicians are viewable by authenticated users" ON schedule_musicians;

CREATE POLICY "Musicians can view their own schedules"
  ON schedule_musicians
  FOR SELECT
  TO authenticated
  USING (
    musician_id IN (
      SELECT id FROM musicians 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR 
    schedule_id IN (
      SELECT id FROM schedules 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Musicians can update notes on their schedules"
  ON schedule_musicians
  FOR UPDATE
  TO authenticated
  USING (
    musician_id IN (
      SELECT id FROM musicians 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR 
    schedule_id IN (
      SELECT id FROM schedules 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    musician_id IN (
      SELECT id FROM musicians 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR 
    schedule_id IN (
      SELECT id FROM schedules 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );