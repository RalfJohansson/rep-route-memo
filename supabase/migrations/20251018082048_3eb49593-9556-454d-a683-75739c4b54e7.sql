-- Add pace column to workout_library table
ALTER TABLE workout_library ADD COLUMN IF NOT EXISTS pace text;