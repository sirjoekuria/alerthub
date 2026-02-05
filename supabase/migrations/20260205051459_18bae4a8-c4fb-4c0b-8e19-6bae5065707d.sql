-- Remove the duplicate trigger that's causing double-counting
DROP TRIGGER IF EXISTS on_message_insert_update_stats ON public.messages;

-- Keep only update_message_stats_trigger