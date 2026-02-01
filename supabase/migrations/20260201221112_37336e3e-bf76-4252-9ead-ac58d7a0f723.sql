-- Add balance column to messages table if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2);