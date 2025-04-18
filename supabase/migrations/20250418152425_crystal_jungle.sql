/*
  # Remove schedules functionality

  1. Changes
    - Drop schedules and related tables
    - Remove all associated functions and triggers
    - Clean up any related data
*/

-- Drop tables in correct order due to dependencies
DROP TABLE IF EXISTS schedule_musicians CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS prevent_confirmed_schedule_deletion() CASCADE;
DROP FUNCTION IF EXISTS enforce_musician_update_restrictions() CASCADE;
DROP FUNCTION IF EXISTS handle_musician_status_change() CASCADE;