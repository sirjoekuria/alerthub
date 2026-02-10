-- Add unique constraint on mpesa_code to prevent duplicate transactions
-- M-Pesa transaction codes are globally unique, so each user should only have one transaction per code

-- First, remove any existing duplicates (keep the earliest record)
DELETE FROM public.messages a
USING public.messages b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.mpesa_code = b.mpesa_code
  AND a.mpesa_code IS NOT NULL;

-- Add unique constraint on (user_id, mpesa_code)
-- This ensures each user can only have one transaction with a specific M-Pesa code
ALTER TABLE public.messages
ADD CONSTRAINT messages_user_mpesa_code_unique 
UNIQUE (user_id, mpesa_code);

-- Create a partial unique index to handle NULL mpesa_codes
-- (The constraint above won't prevent multiple NULL values)
CREATE UNIQUE INDEX messages_user_mpesa_code_not_null_idx 
ON public.messages (user_id, mpesa_code) 
WHERE mpesa_code IS NOT NULL;
