import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
    getNativeOfflineQueue, 
    clearNativeOfflineQueue,
    isBackgroundServiceAvailable 
} from '@/utils/backgroundService';

// Declare global SMS object from cordova-plugin-sms
declare global {
    interface Window {
        SMS: any;
    }
}

// Track recently processed messages to prevent duplicates
const recentlyProcessed = new Set<string>();

export const useSMSReader = () => {
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Sync offline messages from native queue only
    // Native background service handles all SMS processing now
    const syncOfflineMessages = async () => {
        if (!navigator.onLine) return;

        // Get messages from native background service queue (Android)
        const nativeQueue = isBackgroundServiceAvailable() ? getNativeOfflineQueue() : [];
        
        if (nativeQueue.length === 0) return;

        console.log(`Syncing ${nativeQueue.length} messages from native queue...`);
        let syncedCount = 0;

        for (const msg of nativeQueue) {
            try {
                // Skip if recently processed (within last 30 seconds)
                if (recentlyProcessed.has(msg.mpesa_code)) {
                    console.log('Skipping recently processed:', msg.mpesa_code);
                    continue;
                }

                // Check if message already exists in database
                const { data: existing } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('mpesa_code', msg.mpesa_code)
                    .maybeSingle();

                if (existing) {
                    console.log('Message already exists in DB:', msg.mpesa_code);
                    continue;
                }

                const { error } = await supabase.from('messages').insert({
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    mpesa_code: msg.mpesa_code,
                    amount: msg.amount,
                    sender_name: msg.sender_name,
                    transaction_date: msg.transaction_date,
                    original_text: msg.original_text,
                    sms_sender: msg.sms_sender,
                    is_read: false,
                });

                if (error) {
                    // Check if it's a duplicate key error
                    if (error.code === '23505') {
                        console.log('Duplicate detected by DB constraint:', msg.mpesa_code);
                        continue;
                    }
                    throw error;
                }
                
                // Mark as recently processed
                recentlyProcessed.add(msg.mpesa_code);
                setTimeout(() => recentlyProcessed.delete(msg.mpesa_code), 30000);
                
                syncedCount++;
            } catch (error) {
                console.error('Sync failed for message:', msg.mpesa_code, error);
            }
        }

        // Clear native queue after processing
        if (isBackgroundServiceAvailable()) {
            clearNativeOfflineQueue();
        }

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} transactions`);
            window.dispatchEvent(new Event('messages-synced'));
        }
    };

    useEffect(() => {
        // Native background service handles all SMS processing
        // This hook only syncs offline queue and listens for updates
        
        console.log('SMS Reader initialized - Native background service handles SMS processing');
        console.log('Background service available:', isBackgroundServiceAvailable());

        // Listen for online status to sync
        window.addEventListener('online', syncOfflineMessages);

        // Initial sync attempt on mount if online
        if (navigator.onLine) {
            syncOfflineMessages();
        }

        // Periodic sync every 30 seconds to catch any queued messages
        syncIntervalRef.current = setInterval(() => {
            if (navigator.onLine) {
                syncOfflineMessages();
            }
        }, 30000);

        // Listen for messages-synced event to refresh UI
        const handleMessagesSynced = () => {
            console.log('Messages synced event received');
        };
        window.addEventListener('messages-synced', handleMessagesSynced);

        return () => {
            window.removeEventListener('online', syncOfflineMessages);
            window.removeEventListener('messages-synced', handleMessagesSynced);
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, []);
};
