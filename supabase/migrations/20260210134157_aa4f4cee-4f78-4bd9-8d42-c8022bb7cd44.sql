
-- First, remove any existing duplicates (keep the earliest record)
DELETE FROM public.messages a
USING public.messages b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.mpesa_code = b.mpesa_code
  AND a.mpesa_code IS NOT NULL;

-- Add unique constraint on (user_id, mpesa_code)
ALTER TABLE public.messages
ADD CONSTRAINT messages_user_mpesa_code_unique 
UNIQUE (user_id, mpesa_code);
