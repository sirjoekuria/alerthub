package com.mpesaalerthub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * BroadcastReceiver that listens for device boot completion.
 * This ensures the SMS receiver is active even after device restart.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)) {
            
            Log.d(TAG, "Device boot completed - Starting M-Pesa Alert Hub background service");
            
            // Start the persistent service to ensure SMS monitoring is active
            try {
                Intent serviceIntent = new Intent(context, PersistentService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
                Log.d(TAG, "Persistent service started after boot");
            } catch (Exception e) {
                Log.e(TAG, "Error starting persistent service after boot", e);
            }
        }
    }
}
