-- Create trigger to update message_stats when a new message is inserted
CREATE TRIGGER on_message_insert_update_stats
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_message_stats();