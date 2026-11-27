-- Separate from the preserved 2D world and device-only prototype saves.
CREATE TABLE IF NOT EXISTS fps_worlds (
  id integer PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
