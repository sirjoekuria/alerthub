import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  total_messages: number;
  total_amount: number;
}

export const useStats = (userId: string | undefined) => {
  const [stats, setStats] = useState<Stats>({ total_messages: 0, total_amount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const dateStr = startOfMonth.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('message_stats')
          .select('total_messages, total_amount')
          .eq('user_id', userId)
          .eq('date', dateStr)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setStats({
            total_messages: data.total_messages || 0,
            total_amount: Number(data.total_amount) || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const handleSync = () => {
      console.log('Stats: Sync detected, refreshing...');
      fetchStats();
    };

    window.addEventListener('messages-synced', handleSync);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('message_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_stats',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as Record<string, unknown>;
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            const today = startOfMonth.toISOString().split('T')[0];
            if (newData.date === today) {
              setStats({
                total_messages: Number(newData.total_messages) || 0,
                total_amount: Number(newData.total_amount) || 0,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('messages-synced', handleSync);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { stats, loading };
};
