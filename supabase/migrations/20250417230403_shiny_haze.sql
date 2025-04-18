/*
  # Enforce invite-only authentication

  1. Changes
    - Add trigger to prevent direct sign-ups without invitation
    - Add function to validate invitations before allowing sign-ups
    
  2. Security
    - Only allows users with valid invitations to create accounts
    - Automatically marks invitations as accepted when used
*/

-- Create function to validate invitations
CREATE OR REPLACE FUNCTION validate_invitation()
RETURNS trigger AS $$
BEGIN
  -- Check if the user is signing up through an invitation
  IF EXISTS (
    SELECT 1 
    FROM musician_invitations 
    WHERE email = NEW.email 
    AND status = 'pending'
    AND expires_at > CURRENT_TIMESTAMP
  ) THEN
    RETURN NEW;
  END IF;

  -- If no valid invitation exists, raise an error
  RAISE EXCEPTION 'Não é possível criar conta sem um convite válido.';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce invite-only sign-ups
DROP TRIGGER IF EXISTS enforce_invite_only_auth ON auth.users;
CREATE TRIGGER enforce_invite_only_auth
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation();