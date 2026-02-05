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
        // Get today's date in UTC
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        
        // Determine which dates to fetch
        const datesToFetch = [today];
        
        // If before 1 AM, we also want yesterday's stats included in the "daily" total
        // effectively delaying the visual reset until 1 AM
        if (currentHour < 1) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          datesToFetch.push(yesterday.toISOString().split('T')[0]);
        }

        const { data, error } = await supabase
          .from('message_stats')
          .select('total_messages, total_amount')
          .eq('user_id', userId)
          .in('date', datesToFetch);

        if (error) throw error;

        // Sum up the results (data could be 1 or 2 rows)
        const totals = (data || []).reduce((acc, curr) => ({
          total_messages: acc.total_messages + (curr.total_messages || 0),
          total_amount: acc.total_amount + (Number(curr.total_amount) || 0)
        }), { total_messages: 0, total_amount: 0 });

        setStats(totals);
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
        () => {
          // Simply refetch on any change to ensure correct aggregation
          fetchStats();
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
