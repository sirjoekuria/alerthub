package com.mpesaalerthub.app;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String PREFS_NAME = "MpesaAlertHubPrefs";
    private static MainActivity instance;

    public static MainActivity getInstance() {
        return instance;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        // Request necessary permissions
        requestRequiredPermissions();

        // Request battery optimization exemption
        requestBatteryOptimizationExemption();

        // Check for overlay permission
        checkOverlayPermission();

        // Start the persistent background service
        startPersistentService();

        // Add JavaScript interface for the web app to communicate with native code
        setupJavascriptInterface();
    }

    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            }
        }
    }

    private void startFloatingButtonService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
            Intent serviceIntent = new Intent(this, FloatingButtonService.class);
            startService(serviceIntent);
        }
    }

    private void stopFloatingButtonService() {
        Intent serviceIntent = new Intent(this, FloatingButtonService.class);
        stopService(serviceIntent);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Start floating button when app is minimized
        startFloatingButtonService();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Stop floating button when app is in foreground
        stopFloatingButtonService();
    }

    private void requestRequiredPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        // SMS permissions
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_SMS);
        }
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECEIVE_SMS);
        }

        // Notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this,
                    permissionsNeeded.toArray(new String[0]),
                    PERMISSION_REQUEST_CODE);
        } else {
            Log.d(TAG, "All required permissions already granted");
            // Start service after permissions are confirmed
            startPersistentService();
        }
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            String packageName = getPackageName();

            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    startActivity(intent);
                    Log.d(TAG, "Requested battery optimization exemption");
                } catch (Exception e) {
                    Log.e(TAG, "Error requesting battery optimization exemption", e);
                }
            } else {
                Log.d(TAG, "Already ignoring battery optimizations");
            }
        }
    }

    private void startPersistentService() {
        try {
            Intent serviceIntent = new Intent(this, PersistentService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d(TAG, "Persistent service started");
        } catch (Exception e) {
            Log.e(TAG, "Error starting persistent service", e);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    Log.d(TAG, "Permission granted: " + permissions[i]);
                } else {
                    Log.w(TAG, "Permission denied: " + permissions[i]);
                    allGranted = false;
                }
            }

            // Start persistent service after permissions are handled
            if (allGranted) {
                startPersistentService();
            }
        }
    }

    /**
     * Notify the webview that a new SMS has been received.
     * This can be called from background services.
     */
    public static void notifySmsReceived(String mpesaCode) {
        if (instance != null && instance.getBridge() != null) {
            instance.runOnUiThread(() -> {
                String js = "window.dispatchEvent(new CustomEvent('native-sms-received', { detail: { code: '"
                        + mpesaCode + "' } }));";
                instance.getBridge().getWebView().evaluateJavascript(js, null);
                Log.d(TAG, "Notified webview of SMS: " + mpesaCode);
            });
        }
    }

    private void setupJavascriptInterface() {
        // This will be called after the bridge is ready
        getBridge().getWebView().post(() -> {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new BackgroundServiceInterface(), "BackgroundService");
            Log.d(TAG, "JavaScript interface added");
        });
    }

    /**
     * JavaScript interface to allow the web app to configure the background service
     */
    public class BackgroundServiceInterface {

        @JavascriptInterface
        public void setSupabaseCredentials(String supabaseUrl, String supabaseKey,
                String userId, String accessToken) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("supabase_url", supabaseUrl);
            editor.putString("supabase_anon_key", supabaseKey);
            editor.putString("user_id", userId);
            editor.putString("access_token", accessToken);
            editor.apply();
            Log.d(TAG, "Supabase credentials saved for background service");
        }

        @JavascriptInterface
        public void clearCredentials() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().clear().apply();
            Log.d(TAG, "Background service credentials cleared");
        }

        @JavascriptInterface
        public String getOfflineQueue() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            return prefs.getString("offline_queue", "[]");
        }

        @JavascriptInterface
        public void clearOfflineQueue() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().putString("offline_queue", "[]").apply();
            Log.d(TAG, "Offline queue cleared");
        }

        @JavascriptInterface
        public void removeFromOfflineQueue(String mpesaCodesJson) {
            try {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                String existingQueue = prefs.getString("offline_queue", "[]");

                org.json.JSONArray queueArray = new org.json.JSONArray(existingQueue);
                org.json.JSONArray codesToRemove = new org.json.JSONArray(mpesaCodesJson);
                org.json.JSONArray newQueue = new org.json.JSONArray();

                // Filter out messages with mpesa_codes in the removal list
                for (int i = 0; i < queueArray.length(); i++) {
                    org.json.JSONObject item = queueArray.getJSONObject(i);
                    String mpesaCode = item.optString("mpesa_code");

                    boolean shouldRemove = false;
                    for (int j = 0; j < codesToRemove.length(); j++) {
                        if (mpesaCode.equals(codesToRemove.getString(j))) {
                            shouldRemove = true;
                            break;
                        }
                    }

                    if (!shouldRemove) {
                        newQueue.put(item);
                    }
                }

                prefs.edit().putString("offline_queue", newQueue.toString()).apply();
                Log.d(TAG, "Removed " + codesToRemove.length() + " messages from offline queue. " +
                        newQueue.length() + " messages remaining.");
            } catch (Exception e) {
                Log.e(TAG, "Error removing messages from offline queue", e);
            }
        }

        @JavascriptInterface
        public boolean hasRequiredPermissions() {
            return ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
                    ContextCompat.checkSelfPermission(MainActivity.this,
                            Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        }
    }
}
