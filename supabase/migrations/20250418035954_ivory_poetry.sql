/*
  # Fix profiles table RLS policies

  1. Changes
    - Add missing RLS policies for profiles table
      - Allow users to insert their own profile
      - Allow users to view their own profile
      - Allow users to update their own profile

  2. Security
    - Enable RLS on profiles table (already enabled)
    - Add policies to ensure users can only:
      - Insert their own profile
      - View their own profile
      - Update their own profile
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);