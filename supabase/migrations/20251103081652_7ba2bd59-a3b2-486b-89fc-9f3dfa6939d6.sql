-- Fix the update_message_stats function to use actual date instead of month truncation
CREATE OR REPLACE FUNCTION public.update_message_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.message_stats (user_id, date, total_messages, total_amount)
  VALUES (
    NEW.user_id,
    CURRENT_DATE,  -- Changed from DATE_TRUNC('month', CURRENT_DATE)::date
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
$function$;