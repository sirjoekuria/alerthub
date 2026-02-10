import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
    getNativeOfflineQueue,
    clearNativeOfflineQueue,
    removeFromNativeOfflineQueue,
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
        const fullySyncedCodes: string[] = [];

        for (const msg of nativeQueue) {
            try {
                // Skip if recently processed (within last 30 seconds)
                if (recentlyProcessed.has(msg.mpesa_code)) {
                    console.log('Skipping recently processed:', msg.mpesa_code);
                    fullySyncedCodes.push(msg.mpesa_code);
                    continue;
                }

                // Check if message already exists in database
                const { data: existing, error: checkError } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('mpesa_code', msg.mpesa_code)
                    .maybeSingle();

                if (checkError) {
                    console.error('Error checking message existence:', msg.mpesa_code, checkError);
                    continue; // Don't add to fullySyncedCodes, retry later
                }

                if (existing) {
                    console.log('Message already exists in DB:', msg.mpesa_code);
                    fullySyncedCodes.push(msg.mpesa_code);
                    continue;
                }

                const { error } = await supabase.from('messages').insert({
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    mpesa_code: msg.mpesa_code,
                    amount: msg.amount,
                    sender_name: msg.sender_name,
                    transaction_date: msg.transaction_date,
                    received_timestamp: msg.received_timestamp || new Date().toISOString(),
                    original_text: msg.original_text,
                    sms_sender: msg.sms_sender,
                    is_read: false,
                });

                if (error) {
                    // Check if it's a duplicate key error
                    if (error.code === '23505') {
                        console.log('Duplicate detected by DB constraint:', msg.mpesa_code);
                        fullySyncedCodes.push(msg.mpesa_code);
                        continue;
                    }
                    throw error;
                }

                // Mark as recently processed
                recentlyProcessed.add(msg.mpesa_code);
                setTimeout(() => recentlyProcessed.delete(msg.mpesa_code), 30000);

                syncedCount++;
                fullySyncedCodes.push(msg.mpesa_code);
            } catch (error) {
                console.error('Sync failed for message:', msg.mpesa_code, error);
                // Don't add to fullySyncedCodes so it stays in the native queue for retry
            }
        }

        // Only clear successfully processed messages from the native queue
        if (isBackgroundServiceAvailable() && fullySyncedCodes.length > 0) {
            // Use selective removal to only remove successfully synced messages
            // This allows failed messages to remain in the queue for retry
            removeFromNativeOfflineQueue(fullySyncedCodes);
            console.log(`Removed ${fullySyncedCodes.length} successfully synced messages from queue`);
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

        // Listen for direct native SMS events
        const handleNativeSms = (event: any) => {
            console.log('Native SMS event received:', event.detail?.code);
            syncOfflineMessages();
        };

        window.addEventListener('messages-synced', handleMessagesSynced);
        window.addEventListener('native-sms-received', handleNativeSms as EventListener);

        return () => {
            window.removeEventListener('online', syncOfflineMessages);
            window.removeEventListener('messages-synced', handleMessagesSynced);
            window.removeEventListener('native-sms-received', handleNativeSms as EventListener);
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, []);
};
