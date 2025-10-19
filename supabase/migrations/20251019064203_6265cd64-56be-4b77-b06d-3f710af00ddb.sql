-- Change duration column from integer to text to allow values like "20 - 60" or "1:30"
ALTER TABLE workout_library 
ALTER COLUMN duration TYPE TEXT USING duration::TEXT;