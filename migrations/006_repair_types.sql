-- Create repair types table
CREATE TABLE repair_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add repair_type column to tickets table
ALTER TABLE tickets ADD COLUMN repair_type TEXT;

-- Insert repair types
INSERT INTO repair_types (name, display_order) VALUES
  ('Screen Replacement', 1),
  ('Battery Replacement', 2),
  ('Charging Port', 3),
  ('Water Damage', 4),
  ('No Power', 5),
  ('Overheating', 6),
  ('Not Turning On', 7),
  ('Software Issue', 8),
  ('OS Reinstall', 9),
  ('Board Repair', 10),
  ('Camera Issue', 11),
  ('Speaker/Microphone Issue', 12),
  ('Data Recovery', 13),
  ('Other', 99);

