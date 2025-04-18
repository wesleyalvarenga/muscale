/*
  # Add musician_instruments table

  1. New Tables
    - `musician_instruments`
      - `musician_id` (uuid, foreign key to musicians)
      - `instrument_id` (uuid, foreign key to instruments)
      - `proficiency_level` (text, enum: 'Iniciante', 'Intermediário', 'Avançado')

  2. Security
    - Enable RLS on `musician_instruments` table
    - Add policy for authenticated users to read musician instruments
*/

CREATE TABLE IF NOT EXISTS musician_instruments (
  musician_id uuid NOT NULL REFERENCES musicians(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  proficiency_level text CHECK (proficiency_level = ANY (ARRAY['Iniciante'::text, 'Intermediário'::text, 'Avançado'::text])),
  PRIMARY KEY (musician_id, instrument_id)
);

ALTER TABLE musician_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Musician instruments are viewable by authenticated users"
  ON musician_instruments
  FOR SELECT
  TO authenticated
  USING (true);