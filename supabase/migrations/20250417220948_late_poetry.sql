/*
  # Add default instruments

  1. New Data
    - Add default instruments to the instruments table:
      - Bateria
      - Violão
      - Guitarra
      - Teclado
      - Contra baixo
      - Ministro
      - Back

  Note: Using DO block to safely insert instruments only if they don't exist
*/

DO $$
BEGIN
  -- Bateria
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Bateria') THEN
    INSERT INTO instruments (name) VALUES ('Bateria');
  END IF;

  -- Violão
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Violão') THEN
    INSERT INTO instruments (name) VALUES ('Violão');
  END IF;

  -- Guitarra
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Guitarra') THEN
    INSERT INTO instruments (name) VALUES ('Guitarra');
  END IF;

  -- Teclado
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Teclado') THEN
    INSERT INTO instruments (name) VALUES ('Teclado');
  END IF;

  -- Contra baixo
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Contra baixo') THEN
    INSERT INTO instruments (name) VALUES ('Contra baixo');
  END IF;

  -- Ministro
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Ministro') THEN
    INSERT INTO instruments (name) VALUES ('Ministro');
  END IF;

  -- Back
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE name = 'Back') THEN
    INSERT INTO instruments (name) VALUES ('Back');
  END IF;
END $$;