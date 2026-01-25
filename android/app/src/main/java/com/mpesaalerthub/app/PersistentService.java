package com.mpesaalerthub.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Persistent foreground service that keeps the app alive in the background.
 * This ensures SMS messages are received even when the app is not visible.
 */
public class PersistentService extends Service {
    private static final String TAG = "PersistentService";
    private static final String CHANNEL_ID = "mpesa_persistent_channel";
    private static final int NOTIFICATION_ID = 2001;
    
    private PowerManager.WakeLock wakeLock;
    private SMSReceiver smsReceiver;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "PersistentService created");
        
        createNotificationChannel();
        acquireWakeLock();
        registerSmsReceiver();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "PersistentService started");
        
        // Start as foreground service with persistent notification
        startForeground(NOTIFICATION_ID, createNotification());
        
        // Return START_STICKY to restart service if killed
        return START_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "M-Pesa SMS Monitoring",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps the app running to receive M-Pesa SMS messages");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("M-Pesa Alert Hub")
            .setContentText("Monitoring for M-Pesa transactions")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "MpesaAlertHub::SMSWakeLock"
                );
                wakeLock.acquire(10 * 60 * 1000L); // 10 minutes, will be renewed
                Log.d(TAG, "WakeLock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring WakeLock", e);
        }
    }
    
    private void registerSmsReceiver() {
        try {
            // Register SMS receiver programmatically for better reliability
            smsReceiver = new SMSReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction("android.provider.Telephony.SMS_RECEIVED");
            filter.setPriority(Integer.MAX_VALUE);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(smsReceiver, filter);
            }
            Log.d(TAG, "SMS Receiver registered programmatically");
        } catch (Exception e) {
            Log.e(TAG, "Error registering SMS receiver", e);
        }
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "PersistentService destroyed - restarting...");
        
        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        // Unregister receiver
        if (smsReceiver != null) {
            try {
                unregisterReceiver(smsReceiver);
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering receiver", e);
            }
        }
        
        // Restart the service if it's destroyed
        Intent restartIntent = new Intent(this, PersistentService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartIntent);
        } else {
            startService(restartIntent);
        }
        
        super.onDestroy();
    }
    
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "Task removed - restarting service...");
        
        // Restart service when app is swiped away
        Intent restartIntent = new Intent(this, PersistentService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartIntent);
        } else {
            startService(restartIntent);
        }
        
        super.onTaskRemoved(rootIntent);
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
