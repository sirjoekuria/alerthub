import { useEffect } from 'react';
import { toast } from 'sonner';
import { parseMpesaMessage } from '@/utils/mpesaParser';
import { supabase } from '@/integrations/supabase/client';

// Declare global SMS object from cordova-plugin-sms
declare global {
    interface Window {
        SMS: any;
    }
}

export const useSMSReader = () => {
    // Queue message for offline storage
    const queueMessage = (parsedMessage: any) => {
        try {
            const queue = JSON.parse(localStorage.getItem('offline_sms_queue') || '[]');
            queue.push({ ...parsedMessage, queued_at: new Date().toISOString() });
            localStorage.setItem('offline_sms_queue', JSON.stringify(queue));
            toast.warning('Offline: Message queued for sync');
        } catch (error) {
            console.error('Error queuing message:', error);
        }
    };

    // Sync offline messages
    const syncOfflineMessages = async () => {
        if (!navigator.onLine) return;

        const queue = JSON.parse(localStorage.getItem('offline_sms_queue') || '[]');
        if (queue.length === 0) return;

        console.log(`Attempting to sync ${queue.length} offline messages...`);
        const remainingQueue: any[] = [];
        let syncedCount = 0;

        for (const msg of queue) {
            try {
                // Check if message already exists
                const { data: existing } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('mpesa_code', msg.mpesa_code)
                    .single();

                if (existing) {
                    console.log('Message already synced:', msg.mpesa_code);
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

                if (error) throw error;
                syncedCount++;
            } catch (error) {
                console.error('Sync failed for message:', msg.mpesa_code, error);
                remainingQueue.push(msg);
            }
        }

        localStorage.setItem('offline_sms_queue', JSON.stringify(remainingQueue));

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} offline messages`);
        }
    };

    useEffect(() => {
        const handleSMS = async (e: any) => {
            const sms = e.data;
            console.log('SMS received:', sms);

            if (!sms || !sms.body) return;

            // Filter for MPESA messages
            if (sms.address !== 'MPESA' && !sms.body.includes('Confirmed')) return;

            const parsed = parseMpesaMessage(sms.body, sms.address);

            if (parsed) {
                toast.info(`New MPESA Transaction: KES ${parsed.amount}`);

                try {
                    // Check if message already exists (by mpesa_code)
                    const { data: existing } = await supabase
                        .from('messages')
                        .select('id')
                        .eq('mpesa_code', parsed.mpesa_code)
                        .single();

                    if (existing) {
                        console.log('Message already exists:', parsed.mpesa_code);
                        return;
                    }

                    const { error } = await supabase.from('messages').insert({
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        ...parsed,
                        is_read: false,
                    });

                    if (error) throw error;

                    toast.success('Transaction Saved!');
                } catch (err) {
                    console.error('Error saving SMS to Supabase:', err);
                    // Queue for offline sync if error occurs (likely network)
                    queueMessage(parsed);
                }
            }
        };

        const startWatching = () => {
            const SMS = window.SMS;
            if (!SMS) {
                console.warn('SMS plugin not detected - are you running on a device?');
                return;
            }

            SMS.startWatch(
                () => {
                    console.log('SMS Watch started');
                    document.addEventListener('onSMSArrive', handleSMS);
                },
                (err: any) => {
                    console.error('Failed to start SMS watch:', err);
                }
            );
        };

        // Listen for online status to sync
        window.addEventListener('online', syncOfflineMessages);

        // Initial sync attempt on mount if online
        if (navigator.onLine) {
            syncOfflineMessages();
        }

        // Wait for device ready
        document.addEventListener('deviceready', startWatching);

        return () => {
            document.removeEventListener('deviceready', startWatching);
            document.removeEventListener('onSMSArrive', handleSMS);
            window.removeEventListener('online', syncOfflineMessages);
            if (window.SMS) window.SMS.stopWatch(() => { }, () => { });
        };
    }, []);
};
