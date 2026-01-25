package com.mpesaalerthub.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Foreground service that processes M-Pesa SMS messages in the background.
 * This service runs even when the app is not visible.
 */
public class SMSProcessingService extends Service {
    private static final String TAG = "SMSProcessingService";
    private static final String CHANNEL_ID = "mpesa_sms_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private static final String PREFS_NAME = "MpesaAlertHubPrefs";
    private static final String PREF_SUPABASE_URL = "supabase_url";
    private static final String PREF_SUPABASE_KEY = "supabase_anon_key";
    private static final String PREF_USER_ID = "user_id";
    private static final String PREF_ACCESS_TOKEN = "access_token";
    
    private HandlerThread handlerThread;
    private Handler backgroundHandler;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
        // Create background thread for network operations
        handlerThread = new HandlerThread("SMSProcessingThread");
        handlerThread.start();
        backgroundHandler = new Handler(handlerThread.getLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Start as foreground service
        startForeground(NOTIFICATION_ID, createNotification("Processing M-Pesa transaction..."));

        if (intent != null) {
            String sender = intent.getStringExtra("sender");
            String message = intent.getStringExtra("message");
            long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());

            if (message != null) {
                processMessageInBackground(sender, message, timestamp);
            }
        }

        return START_NOT_STICKY;
    }

    private void processMessageInBackground(String sender, String message, long timestamp) {
        backgroundHandler.post(() -> {
            try {
                // Parse the M-Pesa message
                MpesaTransaction transaction = parseMpesaMessage(message, sender);
                
                if (transaction != null) {
                    Log.d(TAG, "Parsed transaction: " + transaction.mpesaCode + " - KES " + transaction.amount);
                    
                    // Update notification
                    updateNotification("New transaction: KES " + transaction.amount);
                    
                    // Save to Supabase
                    boolean saved = saveToSupabase(transaction);
                    
                    if (saved) {
                        showSuccessNotification(transaction);
                    } else {
                        // Queue for later sync if save failed
                        queueForLaterSync(transaction);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing message", e);
            } finally {
                // Stop the service after processing
                stopSelf();
            }
        });
    }

    private MpesaTransaction parseMpesaMessage(String message, String sender) {
        try {
            MpesaTransaction transaction = new MpesaTransaction();
            transaction.originalText = message;
            transaction.smsSender = sender;

            // Extract M-Pesa code (e.g., "ABC123XYZ")
            Pattern codePattern = Pattern.compile("([A-Z0-9]{10})\\s+Confirmed");
            Matcher codeMatcher = codePattern.matcher(message);
            if (codeMatcher.find()) {
                transaction.mpesaCode = codeMatcher.group(1);
            } else {
                // Try alternative pattern
                Pattern altCodePattern = Pattern.compile("^([A-Z0-9]{10})");
                Matcher altMatcher = altCodePattern.matcher(message);
                if (altMatcher.find()) {
                    transaction.mpesaCode = altMatcher.group(1);
                }
            }

            // Extract amount
            Pattern amountPattern = Pattern.compile("Ksh([\\d,]+\\.?\\d*)");
            Matcher amountMatcher = amountPattern.matcher(message);
            if (amountMatcher.find()) {
                String amountStr = amountMatcher.group(1).replace(",", "");
                transaction.amount = Double.parseDouble(amountStr);
            }

            // Extract sender name (for received money)
            Pattern senderPattern = Pattern.compile("from\\s+([A-Z\\s]+)\\s+\\d{10}");
            Matcher senderMatcher = senderPattern.matcher(message);
            if (senderMatcher.find()) {
                transaction.senderName = senderMatcher.group(1).trim();
            } else {
                // Try paybill/till pattern
                Pattern paybillPattern = Pattern.compile("to\\s+([A-Za-z0-9\\s]+)\\s+for");
                Matcher paybillMatcher = paybillPattern.matcher(message);
                if (paybillMatcher.find()) {
                    transaction.senderName = paybillMatcher.group(1).trim();
                }
            }

            // Extract date/time
            Pattern datePattern = Pattern.compile("on\\s+(\\d{1,2}/\\d{1,2}/\\d{2,4})\\s+at\\s+(\\d{1,2}:\\d{2}\\s*(?:AM|PM)?)");
            Matcher dateMatcher = datePattern.matcher(message);
            if (dateMatcher.find()) {
                String dateStr = dateMatcher.group(1);
                String timeStr = dateMatcher.group(2);
                transaction.transactionDate = parseDateTime(dateStr, timeStr);
            } else {
                transaction.transactionDate = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date());
            }

            // Determine transaction type
            if (message.contains("received")) {
                transaction.transactionType = "received";
            } else if (message.contains("sent to") || message.contains("paid to")) {
                transaction.transactionType = "sent";
            } else if (message.contains("bought") || message.contains("airtime")) {
                transaction.transactionType = "airtime";
            } else if (message.contains("withdraw")) {
                transaction.transactionType = "withdrawal";
            } else {
                transaction.transactionType = "other";
            }

            // Only return if we have the essential fields
            if (transaction.mpesaCode != null && transaction.amount > 0) {
                return transaction;
            }

        } catch (Exception e) {
            Log.e(TAG, "Error parsing M-Pesa message", e);
        }
        return null;
    }

    private String parseDateTime(String dateStr, String timeStr) {
        try {
            SimpleDateFormat inputFormat = new SimpleDateFormat("d/M/yy h:mm a", Locale.US);
            SimpleDateFormat outputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
            Date date = inputFormat.parse(dateStr + " " + timeStr);
            return outputFormat.format(date);
        } catch (Exception e) {
            return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date());
        }
    }

    private boolean saveToSupabase(MpesaTransaction transaction) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String supabaseUrl = prefs.getString(PREF_SUPABASE_URL, "");
        String supabaseKey = prefs.getString(PREF_SUPABASE_KEY, "");
        String userId = prefs.getString(PREF_USER_ID, "");
        String accessToken = prefs.getString(PREF_ACCESS_TOKEN, "");

        if (supabaseUrl.isEmpty() || supabaseKey.isEmpty() || userId.isEmpty()) {
            Log.w(TAG, "Supabase credentials not configured");
            return false;
        }

        HttpURLConnection connection = null;
        try {
            // First check if message already exists
            if (messageExists(supabaseUrl, supabaseKey, accessToken, transaction.mpesaCode)) {
                Log.d(TAG, "Message already exists: " + transaction.mpesaCode);
                return true; // Consider this a success since the message is already saved
            }

            URL url = new URL(supabaseUrl + "/rest/v1/messages");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("apikey", supabaseKey);
            connection.setRequestProperty("Authorization", "Bearer " + (accessToken.isEmpty() ? supabaseKey : accessToken));
            connection.setRequestProperty("Prefer", "return=representation");
            connection.setDoOutput(true);

            JSONObject json = new JSONObject();
            json.put("user_id", userId);
            json.put("mpesa_code", transaction.mpesaCode);
            json.put("amount", transaction.amount);
            json.put("sender_name", transaction.senderName);
            json.put("transaction_date", transaction.transactionDate);
            json.put("original_text", transaction.originalText);
            json.put("sms_sender", transaction.smsSender);
            json.put("is_read", false);

            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = json.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = connection.getResponseCode();
            if (responseCode == 201 || responseCode == 200) {
                Log.d(TAG, "Successfully saved to Supabase");
                
                // Read response to get message ID for receipt creation
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Try to create receipt
                createReceipt(supabaseUrl, supabaseKey, accessToken, userId, transaction, response.toString());
                
                return true;
            } else {
                Log.e(TAG, "Failed to save to Supabase: " + responseCode);
                return false;
            }

        } catch (Exception e) {
            Log.e(TAG, "Error saving to Supabase", e);
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private boolean messageExists(String supabaseUrl, String supabaseKey, String accessToken, String mpesaCode) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(supabaseUrl + "/rest/v1/messages?mpesa_code=eq." + mpesaCode + "&select=id");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("apikey", supabaseKey);
            connection.setRequestProperty("Authorization", "Bearer " + (accessToken.isEmpty() ? supabaseKey : accessToken));

            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Check if response is not an empty array
                String responseStr = response.toString().trim();
                return !responseStr.equals("[]");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking message existence", e);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
        return false;
    }

    private void createReceipt(String supabaseUrl, String supabaseKey, String accessToken, 
                               String userId, MpesaTransaction transaction, String messageResponse) {
        HttpURLConnection connection = null;
        try {
            // Parse message ID from response
            String messageId = null;
            if (messageResponse.contains("\"id\"")) {
                Pattern idPattern = Pattern.compile("\"id\"\\s*:\\s*\"?([a-f0-9-]+)\"?");
                Matcher matcher = idPattern.matcher(messageResponse);
                if (matcher.find()) {
                    messageId = matcher.group(1);
                }
            }

            URL url = new URL(supabaseUrl + "/rest/v1/receipts");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("apikey", supabaseKey);
            connection.setRequestProperty("Authorization", "Bearer " + (accessToken.isEmpty() ? supabaseKey : accessToken));
            connection.setDoOutput(true);

            JSONObject json = new JSONObject();
            json.put("user_id", userId);
            if (messageId != null) {
                json.put("message_id", messageId);
            }
            json.put("receipt_number", "RCPT-" + transaction.mpesaCode);
            json.put("amount", transaction.amount);
            json.put("sender_name", transaction.senderName != null ? transaction.senderName : "Unknown");
            json.put("sender_phone", transaction.smsSender);
            json.put("mpesa_code", transaction.mpesaCode);
            json.put("transaction_date", transaction.transactionDate);

            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = json.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = connection.getResponseCode();
            Log.d(TAG, "Receipt creation response: " + responseCode);

        } catch (Exception e) {
            Log.e(TAG, "Error creating receipt", e);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void queueForLaterSync(MpesaTransaction transaction) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String existingQueue = prefs.getString("offline_queue", "[]");
        
        try {
            // Simple JSON array append - the web app will handle proper sync
            JSONObject json = new JSONObject();
            json.put("mpesa_code", transaction.mpesaCode);
            json.put("amount", transaction.amount);
            json.put("sender_name", transaction.senderName);
            json.put("transaction_date", transaction.transactionDate);
            json.put("original_text", transaction.originalText);
            json.put("sms_sender", transaction.smsSender);
            json.put("queued_at", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date()));
            
            // Append to queue
            String newQueue = existingQueue.substring(0, existingQueue.length() - 1);
            if (newQueue.length() > 1) {
                newQueue += ",";
            }
            newQueue += json.toString() + "]";
            
            prefs.edit().putString("offline_queue", newQueue).apply();
            Log.d(TAG, "Message queued for later sync");
            
        } catch (Exception e) {
            Log.e(TAG, "Error queuing message", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "M-Pesa SMS Processing",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifications for M-Pesa transaction processing");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, 
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("M-Pesa Alert Hub")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification(text));
        }
    }

    private void showSuccessNotification(MpesaTransaction transaction) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            Intent intent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, 
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("New M-Pesa Transaction")
                .setContentText("KES " + transaction.amount + " - " + transaction.mpesaCode)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build();

            manager.notify((int) System.currentTimeMillis(), notification);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handlerThread != null) {
            handlerThread.quitSafely();
        }
    }

    /**
     * Inner class to hold parsed M-Pesa transaction data
     */
    private static class MpesaTransaction {
        String mpesaCode;
        double amount;
        String senderName;
        String transactionDate;
        String originalText;
        String smsSender;
        String transactionType;
    }
}
