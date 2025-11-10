-- Create strava_connections table to store user OAuth tokens
CREATE TABLE public.strava_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  athlete_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Strava connection"
ON public.strava_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava connection"
ON public.strava_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava connection"
ON public.strava_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava connection"
ON public.strava_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_strava_connections_updated_at
BEFORE UPDATE ON public.strava_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();