-- Create pace_zones table for storing VDOT-calculated pace zones
CREATE TABLE IF NOT EXISTS public.pace_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vdot_score INTEGER NOT NULL,
  time_5k INTEGER NOT NULL,
  pace_1k TEXT NOT NULL,
  pace_5k TEXT NOT NULL,
  pace_10k TEXT NOT NULL,
  pace_half_marathon TEXT NOT NULL,
  pace_marathon TEXT NOT NULL,
  pace_easy TEXT NOT NULL,
  pace_interval TEXT NOT NULL,
  pace_threshold TEXT NOT NULL,
  pace_tempo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pace_zones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own pace zones"
ON public.pace_zones
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pace zones"
ON public.pace_zones
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pace zones"
ON public.pace_zones
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pace zones"
ON public.pace_zones
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pace_zones_updated_at
BEFORE UPDATE ON public.pace_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();