-- Add balance column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2);

-- Create index for faster sorting/filtering if needed later (optional but good practice)
-- STRATEGY: We might want to see the latest balance, so indexing created_at or transaction_date is important, which likely already exists.
