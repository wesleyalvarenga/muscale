/*
  # Add insert policy for schedules table

  1. Security Changes
    - Add RLS policy to allow authenticated users to insert schedules
    - Add RLS policy to allow authenticated users to update their own schedules
    - Add RLS policy to allow authenticated users to delete their own schedules
    - Add user_id column to track schedule ownership

  This migration adds the necessary RLS policies to allow authenticated users to manage schedules.
  It also adds a user_id column to track who created each schedule.
*/

-- Add user_id column to schedules table
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing schedules to have a user_id (if any exist)
UPDATE schedules 
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Make user_id required for future inserts
ALTER TABLE schedules 
ALTER COLUMN user_id SET NOT NULL;

-- Create policy to allow authenticated users to insert schedules
CREATE POLICY "Users can create their own schedules"
ON schedules
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own schedules
CREATE POLICY "Users can update their own schedules"
ON schedules
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own schedules
CREATE POLICY "Users can delete their own schedules"
ON schedules
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);