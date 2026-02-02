import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Message {
  id: string;
  user_id: string;
  original_text: string;
  amount: number | null;
  sender_name: string | null;
  transaction_date: string | null;
  mpesa_code: string | null;
  sms_sender: string;
  is_read: boolean;
  received_timestamp: string;
  created_at: string;
}

export const useMessages = (userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Audio for notifications
  const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep sound

  const fetchMessages = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('received_timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mappedData = (data || []) as Message[];

      setMessages(mappedData);
      setUnreadCount(mappedData.filter(m => !m.is_read).length);
    } catch (error) {
      toast.error('Failed to fetch messages');
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Listen for custom sync event and online status
    const handleSync = () => {
      console.log('Messages synced event received, refreshing...');
      fetchMessages();
    };

    window.addEventListener('messages-synced', handleSync);
    window.addEventListener('online', handleSync);

    return () => {
      window.removeEventListener('messages-synced', handleSync);
      window.removeEventListener('online', handleSync);
    };
  }, [userId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time update:', payload);

          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages(prev => [newMsg, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast.success('New MPESA message received!');
            notificationSound.play().catch(e => console.error("Error playing sound:", e));
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            setMessages(prev =>
              prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
            );
            fetchMessages(); // Refresh unread count
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, is_read: true } : msg)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
      setUnreadCount(0);
      toast.success('All messages marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteMessages = async (ids: string[]) => {
    try {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Refresh list to ensure counts are accurate
      await fetchMessages();
      toast.success(`Deleted ${ids.length} message${ids.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast.error('Failed to delete messages');
    }
  };

  const deleteAllMessages = async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setMessages([]);
      setUnreadCount(0);
      toast.success('All messages deleted');
    } catch (error) {
      console.error('Error deleting all messages:', error);
      toast.error('Failed to delete all messages');
    }
  };

  return {
    messages,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchMessages,
    deleteMessages,
    deleteAllMessages,
  };
};