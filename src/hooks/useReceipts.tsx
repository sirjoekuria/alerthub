import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Receipt {
  id: string;
  user_id: string;
  message_id: string;
  receipt_number: string;
  amount: number;
  sender_name: string;
  sender_phone: string;
  mpesa_code: string;
  transaction_date: string;
  created_at: string;
}

export const useReceipts = (userId: string | undefined) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = async () => {
    if (!userId) {
      setReceipts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();

    if (!userId) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel('receipts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'receipts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New receipt:', payload);
          setReceipts((current) => [payload.new as Receipt, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { receipts, loading, refetch: fetchReceipts };
};
