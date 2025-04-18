/*
  # Initial Schema Setup for Musician Scheduler

  1. New Tables
    - `musicians`
      - Basic musician information and contact details
    - `instruments`
      - List of available instruments/roles
    - `musician_instruments`
      - Many-to-many relationship between musicians and instruments
    - `schedules`
      - Weekly schedule entries
    - `schedule_musicians`
      - Musicians assigned to specific schedules
    - `notifications`
      - Track sent notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create musicians table
CREATE TABLE IF NOT EXISTS musicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  user_id uuid REFERENCES auth.users(id)
);

-- Create instruments table
CREATE TABLE IF NOT EXISTS instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL UNIQUE,
  description text
);

-- Create musician_instruments table
CREATE TABLE IF NOT EXISTS musician_instruments (
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id) ON DELETE CASCADE,
  proficiency_level text CHECK (proficiency_level IN ('Iniciante', 'Intermediário', 'Avançado')),
  PRIMARY KEY (musician_id, instrument_id)
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled'))
);

-- Create schedule_musicians table
CREATE TABLE IF NOT EXISTS schedule_musicians (
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  PRIMARY KEY (schedule_id, musician_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  musician_id uuid REFERENCES musicians(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('schedule_assignment', 'schedule_change', 'reminder', 'rehearsal_reminder')),
  message text NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'push'))
);

-- Enable Row Level Security
ALTER TABLE musicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE musician_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_musicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Musicians are viewable by authenticated users"
  ON musicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Instruments are viewable by authenticated users"
  ON instruments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Musician instruments are viewable by authenticated users"
  ON musician_instruments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Schedules are viewable by authenticated users"
  ON schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Schedule musicians are viewable by authenticated users"
  ON schedule_musicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Notifications are viewable by authenticated users"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    musician_id IN (
      SELECT id FROM musicians WHERE user_id = auth.uid()
    )
  );

-- Insert default instruments
INSERT INTO instruments (name, description) VALUES
  ('Guitarra', 'Guitarra elétrica ou acústica'),
  ('Baixo', 'Baixo elétrico'),
  ('Bateria', 'Bateria acústica'),
  ('Teclado', 'Piano digital ou sintetizador'),
  ('Vocal', 'Vocalista principal ou backing vocal')
ON CONFLICT (name) DO NOTHING;