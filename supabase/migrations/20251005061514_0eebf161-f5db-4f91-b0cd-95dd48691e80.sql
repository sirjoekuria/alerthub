-- Add avatar_url to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create message_stats table to track daily totals
CREATE TABLE IF NOT EXISTS public.message_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_messages INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on message_stats
ALTER TABLE public.message_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_stats
CREATE POLICY "Users can view their own stats"
ON public.message_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
ON public.message_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.message_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update message stats
CREATE OR REPLACE FUNCTION public.update_message_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_stats (user_id, date, total_messages, total_amount)
  VALUES (
    NEW.user_id,
    CURRENT_DATE,
    1,
    COALESCE(NEW.amount, 0)
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_messages = message_stats.total_messages + 1,
    total_amount = message_stats.total_amount + COALESCE(NEW.amount, 0),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger to update stats on new message
DROP TRIGGER IF EXISTS update_stats_on_message ON public.messages;
CREATE TRIGGER update_stats_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_message_stats();

-- Enable realtime for message_stats
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_stats;