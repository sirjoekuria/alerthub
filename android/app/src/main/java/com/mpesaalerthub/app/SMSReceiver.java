package com.mpesaalerthub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

/**
 * BroadcastReceiver that intercepts incoming SMS messages in the background.
 * This runs even when the app is not in the foreground.
 */
public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "SMSReceiver";
    private static final String SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED";
    private static final String MPESA_SENDER = "MPESA";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        if (SMS_RECEIVED.equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                processSmsBundle(context, bundle);
            }
        }
    }

    private void processSmsBundle(Context context, Bundle bundle) {
        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");

            if (pdus == null) {
                return;
            }

            StringBuilder fullMessage = new StringBuilder();
            String senderAddress = null;

            for (Object pdu : pdus) {
                SmsMessage smsMessage;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                }

                if (smsMessage != null) {
                    if (senderAddress == null) {
                        senderAddress = smsMessage.getDisplayOriginatingAddress();
                    }
                    fullMessage.append(smsMessage.getMessageBody());
                }
            }

            String messageBody = fullMessage.toString();
            
            // Only process MPESA messages
            if (isMpesaMessage(senderAddress, messageBody)) {
                Log.d(TAG, "MPESA message detected from: " + senderAddress);
                processMpesaMessage(context, senderAddress, messageBody);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error processing SMS", e);
        }
    }

    private boolean isMpesaMessage(String sender, String body) {
        if (sender == null || body == null) {
            return false;
        }
        
        // Check if sender is MPESA or message contains typical MPESA patterns
        return sender.equalsIgnoreCase(MPESA_SENDER) || 
               sender.contains(MPESA_SENDER) ||
               (body.contains("Confirmed") && body.contains("Ksh"));
    }

    private void processMpesaMessage(Context context, String sender, String messageBody) {
        // Start the background service to process the message
        Intent serviceIntent = new Intent(context, SMSProcessingService.class);
        serviceIntent.putExtra("sender", sender);
        serviceIntent.putExtra("message", messageBody);
        serviceIntent.putExtra("timestamp", System.currentTimeMillis());

        // Use foreground service for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
