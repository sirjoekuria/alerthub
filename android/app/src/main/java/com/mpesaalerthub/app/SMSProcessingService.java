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
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
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
    private static final String PREFS_PROCESSED = "processed_codes";
    
    // Static set to track recently processed codes in memory
    private static final Set<String> recentlyProcessed = new HashSet<>();
    
    private HandlerThread handlerThread;
    private Handler backgroundHandler;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "SMSProcessingService created");
        createNotificationChannel();
        
        // Create background thread for network operations
        handlerThread = new HandlerThread("SMSProcessingThread");
        handlerThread.start();
        backgroundHandler = new Handler(handlerThread.getLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "SMSProcessingService onStartCommand");
        
        // Start as foreground service
        startForeground(NOTIFICATION_ID, createNotification("Processing M-Pesa transaction..."));

        if (intent != null) {
            String sender = intent.getStringExtra("sender");
            String message = intent.getStringExtra("message");
            long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());

            Log.d(TAG, "Received message from: " + sender);
            
            if (message != null) {
                processMessageInBackground(sender, message, timestamp);
            } else {
                Log.w(TAG, "Message is null, stopping service");
                stopSelf();
            }
        } else {
            Log.w(TAG, "Intent is null, stopping service");
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    private void processMessageInBackground(String sender, String message, long timestamp) {
        backgroundHandler.post(() -> {
            try {
                Log.d(TAG, "Processing message in background thread");
                
                // Parse the M-Pesa message
                MpesaTransaction transaction = parseMpesaMessage(message, sender);
                
                if (transaction != null) {
                    Log.d(TAG, "Parsed transaction: " + transaction.mpesaCode + " - KES " + transaction.amount);
                    
                    // Check if already processed (in-memory check)
                    if (recentlyProcessed.contains(transaction.mpesaCode)) {
                        Log.d(TAG, "Already processed in memory: " + transaction.mpesaCode);
                        stopSelf();
                        return;
                    }
                    
                    // Check if already processed (persistent check)
                    if (isAlreadyProcessed(transaction.mpesaCode)) {
                        Log.d(TAG, "Already processed in storage: " + transaction.mpesaCode);
                        stopSelf();
                        return;
                    }
                    
                    // Mark as processing
                    recentlyProcessed.add(transaction.mpesaCode);
                    
                    // Update notification
                    updateNotification("New transaction: KES " + transaction.amount);
                    
                    // Check credentials
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    String supabaseUrl = prefs.getString("supabase_url", "");
                    String userId = prefs.getString("user_id", "");
                    
                    Log.d(TAG, "Supabase URL: " + (supabaseUrl.isEmpty() ? "NOT SET" : "SET"));
                    Log.d(TAG, "User ID: " + (userId.isEmpty() ? "NOT SET" : "SET"));
                    
                    if (supabaseUrl.isEmpty() || userId.isEmpty()) {
                        Log.w(TAG, "Credentials not configured, queuing message");
                        queueForLaterSync(transaction);
                        showNotification("Transaction queued", "KES " + transaction.amount + " - Will sync when app is opened");
                    } else {
                        // Save to Supabase
                        boolean saved = saveToSupabase(transaction);
                        
                        if (saved) {
                            markAsProcessed(transaction.mpesaCode);
                            showSuccessNotification(transaction);
                        } else {
                            // Queue for later sync if save failed
                            queueForLaterSync(transaction);
                            showNotification("Transaction queued", "KES " + transaction.amount + " - Will retry later");
                        }
                    }
                } else {
                    Log.w(TAG, "Failed to parse message");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing message", e);
            } finally {
                // Stop the service after processing
                stopSelf();
            }
        });
    }
    
    private boolean isAlreadyProcessed(String mpesaCode) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String processedCodes = prefs.getString(PREFS_PROCESSED, "");
        return processedCodes.contains(mpesaCode);
    }
    
    private void markAsProcessed(String mpesaCode) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String processedCodes = prefs.getString(PREFS_PROCESSED, "");
        
        // Keep only last 100 codes to prevent unlimited growth
        String[] codes = processedCodes.split(",");
        StringBuilder newCodes = new StringBuilder();
        int startIndex = Math.max(0, codes.length - 99);
        for (int i = startIndex; i < codes.length; i++) {
            if (!codes[i].isEmpty()) {
                newCodes.append(codes[i]).append(",");
            }
        }
        newCodes.append(mpesaCode);
        
        prefs.edit().putString(PREFS_PROCESSED, newCodes.toString()).apply();
        Log.d(TAG, "Marked as processed: " + mpesaCode);
    }

    private MpesaTransaction parseMpesaMessage(String message, String sender) {
        try {
            Log.d(TAG, "Parsing message: " + message.substring(0, Math.min(50, message.length())) + "...");
            
            MpesaTransaction transaction = new MpesaTransaction();
            transaction.originalText = message;
            transaction.smsSender = sender;

            // Extract M-Pesa code (e.g., "ABC123XYZ Confirmed")
            Pattern codePattern = Pattern.compile("([A-Z0-9]{10})\\s+Confirmed", Pattern.CASE_INSENSITIVE);
            Matcher codeMatcher = codePattern.matcher(message);
            if (codeMatcher.find()) {
                transaction.mpesaCode = codeMatcher.group(1).toUpperCase();
                Log.d(TAG, "Found M-Pesa code: " + transaction.mpesaCode);
            } else {
                // Try alternative pattern - code at start
                Pattern altCodePattern = Pattern.compile("^([A-Z0-9]{10})", Pattern.CASE_INSENSITIVE);
                Matcher altMatcher = altCodePattern.matcher(message.trim());
                if (altMatcher.find()) {
                    transaction.mpesaCode = altMatcher.group(1).toUpperCase();
                    Log.d(TAG, "Found M-Pesa code (alt): " + transaction.mpesaCode);
                }
            }

            // Extract amount - handle various formats
            Pattern amountPattern = Pattern.compile("Ksh\\s?([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE);
            Matcher amountMatcher = amountPattern.matcher(message);
            if (amountMatcher.find()) {
                String amountStr = amountMatcher.group(1).replace(",", "");
                transaction.amount = Double.parseDouble(amountStr);
                Log.d(TAG, "Found amount: " + transaction.amount);
            }

            // Extract sender name (for received money)
            Pattern senderPattern = Pattern.compile("from\\s+([A-Z][A-Z\\s]+?)\\s+(?:\\d{10}|for)", Pattern.CASE_INSENSITIVE);
            Matcher senderMatcher = senderPattern.matcher(message);
            if (senderMatcher.find()) {
                transaction.senderName = senderMatcher.group(1).trim();
                Log.d(TAG, "Found sender: " + transaction.senderName);
            } else {
                // Try paybill/till pattern
                Pattern paybillPattern = Pattern.compile("(?:to|paid)\\s+([A-Za-z0-9][A-Za-z0-9\\s]+?)\\s+(?:for|on)", Pattern.CASE_INSENSITIVE);
                Matcher paybillMatcher = paybillPattern.matcher(message);
                if (paybillMatcher.find()) {
                    transaction.senderName = paybillMatcher.group(1).trim();
                    Log.d(TAG, "Found recipient: " + transaction.senderName);
                }
            }

            // Extract date/time
            Pattern datePattern = Pattern.compile("on\\s+(\\d{1,2}/\\d{1,2}/\\d{2,4})\\s+at\\s+(\\d{1,2}:\\d{2}\\s*(?:AM|PM)?)", Pattern.CASE_INSENSITIVE);
            Matcher dateMatcher = datePattern.matcher(message);
            if (dateMatcher.find()) {
                String dateStr = dateMatcher.group(1);
                String timeStr = dateMatcher.group(2);
                transaction.transactionDate = parseDateTime(dateStr, timeStr);
                Log.d(TAG, "Found date: " + transaction.transactionDate);
            } else {
                transaction.transactionDate = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date());
            }

            // Determine transaction type
            String lowerMessage = message.toLowerCase();
            if (lowerMessage.contains("received")) {
                transaction.transactionType = "received";
            } else if (lowerMessage.contains("sent to") || lowerMessage.contains("paid to")) {
                transaction.transactionType = "sent";
            } else if (lowerMessage.contains("bought") || lowerMessage.contains("airtime")) {
                transaction.transactionType = "airtime";
            } else if (lowerMessage.contains("withdraw")) {
                transaction.transactionType = "withdrawal";
            } else {
                transaction.transactionType = "other";
            }

            // Only return if we have the essential fields
            if (transaction.mpesaCode != null && transaction.amount > 0) {
                Log.d(TAG, "Successfully parsed transaction");
                return transaction;
            } else {
                Log.w(TAG, "Missing essential fields - code: " + transaction.mpesaCode + ", amount: " + transaction.amount);
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
            Log.e(TAG, "Error parsing date", e);
            return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date());
        }
    }

    private boolean saveToSupabase(MpesaTransaction transaction) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String supabaseUrl = prefs.getString("supabase_url", "");
        String supabaseKey = prefs.getString("supabase_anon_key", "");
        String userId = prefs.getString("user_id", "");
        String accessToken = prefs.getString("access_token", "");

        if (supabaseUrl.isEmpty() || supabaseKey.isEmpty() || userId.isEmpty()) {
            Log.w(TAG, "Supabase credentials not configured");
            return false;
        }

        HttpURLConnection connection = null;
        try {
            Log.d(TAG, "Checking if message exists: " + transaction.mpesaCode);
            
            // First check if message already exists
            if (messageExists(supabaseUrl, supabaseKey, accessToken, transaction.mpesaCode)) {
                Log.d(TAG, "Message already exists in database: " + transaction.mpesaCode);
                return true; // Consider this a success since the message is already saved
            }

            Log.d(TAG, "Saving to Supabase...");
            
            URL url = new URL(supabaseUrl + "/rest/v1/messages");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("apikey", supabaseKey);
            connection.setRequestProperty("Authorization", "Bearer " + (accessToken.isEmpty() ? supabaseKey : accessToken));
            connection.setRequestProperty("Prefer", "return=representation");
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);
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

            String jsonString = json.toString();
            Log.d(TAG, "Sending JSON: " + jsonString);
            
            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = jsonString.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = connection.getResponseCode();
            Log.d(TAG, "Response code: " + responseCode);
            
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
                
                Log.d(TAG, "Response: " + response.toString());
                
                // Try to create receipt
                createReceipt(supabaseUrl, supabaseKey, accessToken, userId, transaction, response.toString());
                
                return true;
            } else {
                // Read error response
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
                StringBuilder errorResponse = new StringBuilder();
                String errorLine;
                while ((errorLine = errorReader.readLine()) != null) {
                    errorResponse.append(errorLine);
                }
                errorReader.close();
                
                Log.e(TAG, "Failed to save to Supabase: " + responseCode + " - " + errorResponse.toString());
                
                // Check if it's a duplicate key error
                if (errorResponse.toString().contains("duplicate") || errorResponse.toString().contains("23505")) {
                    Log.d(TAG, "Duplicate detected by database, marking as success");
                    return true;
                }
                
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
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);

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
                boolean exists = !responseStr.equals("[]");
                Log.d(TAG, "Message exists check for " + mpesaCode + ": " + exists);
                return exists;
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
            try {
                JSONArray jsonArray = new JSONArray(messageResponse);
                if (jsonArray.length() > 0) {
                    JSONObject firstItem = jsonArray.getJSONObject(0);
                    messageId = firstItem.getString("id");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error parsing message ID", e);
            }

            URL url = new URL(supabaseUrl + "/rest/v1/receipts");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("apikey", supabaseKey);
            connection.setRequestProperty("Authorization", "Bearer " + (accessToken.isEmpty() ? supabaseKey : accessToken));
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
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
            JSONArray queueArray = new JSONArray(existingQueue);
            
            // Check if already in queue
            for (int i = 0; i < queueArray.length(); i++) {
                JSONObject item = queueArray.getJSONObject(i);
                if (transaction.mpesaCode.equals(item.optString("mpesa_code"))) {
                    Log.d(TAG, "Message already in queue: " + transaction.mpesaCode);
                    return;
                }
            }
            
            JSONObject json = new JSONObject();
            json.put("mpesa_code", transaction.mpesaCode);
            json.put("amount", transaction.amount);
            json.put("sender_name", transaction.senderName);
            json.put("transaction_date", transaction.transactionDate);
            json.put("original_text", transaction.originalText);
            json.put("sms_sender", transaction.smsSender);
            json.put("queued_at", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(new Date()));
            
            queueArray.put(json);
            
            prefs.edit().putString("offline_queue", queueArray.toString()).apply();
            Log.d(TAG, "Message queued for later sync: " + transaction.mpesaCode);
            
        } catch (Exception e) {
            Log.e(TAG, "Error queuing message", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "M-Pesa SMS Processing",
                NotificationManager.IMPORTANCE_DEFAULT
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
    
    private void showNotification(String title, String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            Intent intent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, 
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build();

            manager.notify((int) System.currentTimeMillis(), notification);
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

            String transactionType = transaction.transactionType != null ? transaction.transactionType : "Transaction";
            String title = "M-Pesa " + transactionType.substring(0, 1).toUpperCase() + transactionType.substring(1);
            
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText("KES " + transaction.amount + " - " + transaction.mpesaCode)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
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
        Log.d(TAG, "SMSProcessingService destroyed");
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
