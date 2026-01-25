package com.mpesaalerthub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BroadcastReceiver that intercepts incoming SMS messages in the background.
 * This runs even when the app is not in the foreground.
 */
public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "SMSReceiver";
    private static final String SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED";
    private static final String MPESA_SENDER = "MPESA";
    private static final String PREFS_NAME = "MpesaAlertHubPrefs";
    
    // Static set to prevent duplicate processing within same app session
    private static final Set<String> recentMessages = new HashSet<>();
    private static long lastCleanup = System.currentTimeMillis();

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "SMSReceiver onReceive triggered");
        
        if (intent == null || intent.getAction() == null) {
            Log.w(TAG, "Intent or action is null");
            return;
        }

        if (SMS_RECEIVED.equals(intent.getAction())) {
            Log.d(TAG, "SMS_RECEIVED action detected");
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                processSmsBundle(context, bundle);
            } else {
                Log.w(TAG, "Bundle is null");
            }
        }
    }

    private void processSmsBundle(Context context, Bundle bundle) {
        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");

            if (pdus == null) {
                Log.w(TAG, "PDUs is null");
                return;
            }

            Log.d(TAG, "Processing " + pdus.length + " PDUs");

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
            Log.d(TAG, "SMS from: " + senderAddress + ", length: " + messageBody.length());
            
            // Only process MPESA messages
            if (isMpesaMessage(senderAddress, messageBody)) {
                Log.d(TAG, "MPESA message detected!");
                
                // Extract M-Pesa code for deduplication
                String mpesaCode = extractMpesaCode(messageBody);
                if (mpesaCode != null) {
                    // Clean up old messages periodically
                    cleanupOldMessages();
                    
                    // Check for duplicate
                    String messageKey = mpesaCode;
                    if (recentMessages.contains(messageKey)) {
                        Log.d(TAG, "Duplicate message detected, skipping: " + mpesaCode);
                        return;
                    }
                    
                    // Mark as received
                    recentMessages.add(messageKey);
                    Log.d(TAG, "Processing new message: " + mpesaCode);
                }
                
                processMpesaMessage(context, senderAddress, messageBody);
            } else {
                Log.d(TAG, "Not an MPESA message, ignoring");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error processing SMS", e);
        }
    }
    
    private String extractMpesaCode(String message) {
        try {
            Pattern codePattern = Pattern.compile("([A-Z0-9]{10})\\s+Confirmed", Pattern.CASE_INSENSITIVE);
            Matcher codeMatcher = codePattern.matcher(message);
            if (codeMatcher.find()) {
                return codeMatcher.group(1).toUpperCase();
            }
            
            // Try alternative pattern
            Pattern altPattern = Pattern.compile("^([A-Z0-9]{10})", Pattern.CASE_INSENSITIVE);
            Matcher altMatcher = altPattern.matcher(message.trim());
            if (altMatcher.find()) {
                return altMatcher.group(1).toUpperCase();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error extracting M-Pesa code", e);
        }
        return null;
    }
    
    private void cleanupOldMessages() {
        // Clean up every 5 minutes
        long now = System.currentTimeMillis();
        if (now - lastCleanup > 5 * 60 * 1000) {
            recentMessages.clear();
            lastCleanup = now;
            Log.d(TAG, "Cleared recent messages cache");
        }
    }

    private boolean isMpesaMessage(String sender, String body) {
        if (sender == null || body == null) {
            return false;
        }
        
        // Check if sender is MPESA or message contains typical MPESA patterns
        String upperSender = sender.toUpperCase();
        String upperBody = body.toUpperCase();
        
        boolean isMpesa = upperSender.equals(MPESA_SENDER) || 
                          upperSender.contains(MPESA_SENDER) ||
                          (upperBody.contains("CONFIRMED") && upperBody.contains("KSH"));
        
        Log.d(TAG, "isMpesaMessage check - sender: " + sender + ", isMpesa: " + isMpesa);
        return isMpesa;
    }

    private void processMpesaMessage(Context context, String sender, String messageBody) {
        Log.d(TAG, "Starting SMSProcessingService");
        
        // Start the background service to process the message
        Intent serviceIntent = new Intent(context, SMSProcessingService.class);
        serviceIntent.putExtra("sender", sender);
        serviceIntent.putExtra("message", messageBody);
        serviceIntent.putExtra("timestamp", System.currentTimeMillis());

        try {
            // Use foreground service for Android O and above
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "SMSProcessingService started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start SMSProcessingService", e);
        }
    }
}
