-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create enum for workout types
CREATE TYPE workout_category AS ENUM ('intervallpass', 'distanspass', 'långpass', 'styrka');

-- Create workout library table
CREATE TABLE public.workout_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category workout_category NOT NULL,
  duration INTEGER, -- in minutes
  effort INTEGER CHECK (effort >= 1 AND effort <= 10),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workouts"
  ON public.workout_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts"
  ON public.workout_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON public.workout_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
  ON public.workout_library FOR DELETE
  USING (auth.uid() = user_id);

-- Create scheduled workouts table
CREATE TABLE public.scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workout_library(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  trained_time INTEGER, -- in minutes
  distance DECIMAL(10,2), -- in km
  pace TEXT, -- e.g. "5:30/km"
  notes TEXT,
  joy_rating INTEGER CHECK (joy_rating >= 1 AND joy_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled workouts"
  ON public.scheduled_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled workouts"
  ON public.scheduled_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled workouts"
  ON public.scheduled_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled workouts"
  ON public.scheduled_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_workouts_updated_at
  BEFORE UPDATE ON public.scheduled_workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();