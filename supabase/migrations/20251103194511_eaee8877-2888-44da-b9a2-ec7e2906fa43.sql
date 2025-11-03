-- Add pace_long_run column for long run/easy recovery pace
ALTER TABLE pace_zones ADD COLUMN pace_long_run text NOT NULL DEFAULT '0:00';