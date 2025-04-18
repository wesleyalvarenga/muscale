/*
  # Remove invitation functionality

  1. Changes
    - Drop musician_invitations table and related objects
    - Remove invitation-related functions and triggers
*/

-- Drop the musician_invitations table
DROP TABLE IF EXISTS musician_invitations CASCADE;

-- Drop the invitation-related Edge Function
DROP FUNCTION IF EXISTS send_invitation CASCADE;