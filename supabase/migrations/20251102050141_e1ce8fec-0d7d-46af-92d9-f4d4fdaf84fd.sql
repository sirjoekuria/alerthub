-- Update the message stats function to reset monthly instead of daily
DROP FUNCTION IF EXISTS public.update_message_stats() CASCADE;

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
    DATE_TRUNC('month', CURRENT_DATE)::date,
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

-- Recreate the trigger
CREATE TRIGGER update_message_stats_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_stats();