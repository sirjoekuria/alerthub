package com.mpesaalerthub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
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

        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            
            Log.d(TAG, "Device boot completed - M-Pesa Alert Hub ready for background SMS processing");
            
            // The SMSReceiver is already registered in the manifest and will
            // receive SMS broadcasts automatically. No additional initialization needed.
            
            // Optionally, you can start a persistent service here if needed
            // for additional background tasks like periodic sync
        }
    }
}
