package com.mpesaalerthub.app;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Request necessary permissions
        requestRequiredPermissions();
        
        // Add JavaScript interface for the web app to communicate with native code
        setupJavascriptInterface();
    }

    private void requestRequiredPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        // SMS permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_SMS);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECEIVE_SMS);
        }

        // Notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, 
                permissionsNeeded.toArray(new String[0]), 
                PERMISSION_REQUEST_CODE);
        } else {
            Log.d(TAG, "All required permissions already granted");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, 
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    Log.d(TAG, "Permission granted: " + permissions[i]);
                } else {
                    Log.w(TAG, "Permission denied: " + permissions[i]);
                }
            }
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
        public boolean hasRequiredPermissions() {
            return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_SMS) 
                    == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECEIVE_SMS) 
                    == PackageManager.PERMISSION_GRANTED;
        }
    }
}
