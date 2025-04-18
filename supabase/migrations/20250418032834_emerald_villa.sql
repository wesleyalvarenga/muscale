/*
  # Remove invitation requirement for authentication

  1. Changes
    - Drop the trigger that enforces invite-only authentication
    - Drop the validation function
*/

-- Drop the trigger that enforces invite-only authentication
DROP TRIGGER IF EXISTS enforce_invite_only_auth ON auth.users;

-- Drop the validation function
DROP FUNCTION IF EXISTS validate_invitation;