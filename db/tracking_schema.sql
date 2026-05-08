CREATE TABLE IF NOT EXISTS tracking_sessions (
  session_id UUID PRIMARY KEY,
  trip_id TEXT NOT NULL,
  stop_id TEXT,
  driver_id TEXT NOT NULL,
  direction TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  last_heading DOUBLE PRECISION,
  last_speed DOUBLE PRECISION,
  last_recorded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS location_points (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES tracking_sessions(session_id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status ON tracking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_driver_id ON tracking_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_trip_id ON tracking_sessions(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_points_session_id ON location_points(session_id);
CREATE INDEX IF NOT EXISTS idx_location_points_recorded_at ON location_points(recorded_at DESC);
