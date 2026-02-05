package com.mpesaalerthub.app;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

import androidx.annotation.Nullable;

public class FloatingButtonService extends Service {
    private WindowManager windowManager;
    private ImageView floatingButton;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        floatingButton = new ImageView(this);
        // Use the app icon
        floatingButton.setImageResource(R.mipmap.ic_launcher_round);
        // Background circle and padding to make it look like a button
        floatingButton.setBackgroundResource(android.R.drawable.screen_background_light_transparent);
        floatingButton.setPadding(20, 20, 20, 20);

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                (int) (60 * getResources().getDisplayMetrics().density),
                (int) (60 * getResources().getDisplayMetrics().density),
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 100;

        floatingButton.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_UP:
                        // If moved very little, consider it a click
                        int diffX = (int) (event.getRawX() - initialTouchX);
                        int diffY = (int) (event.getRawY() - initialTouchY);

                        // Swipe to dismiss logic (swipe down more than 150px)
                        if (diffY > 150) {
                            stopSelf();
                            return true;
                        }

                        if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
                            Intent intent = new Intent(FloatingButtonService.this, MainActivity.class);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            // Stop service after returning to app
                            stopSelf();
                        }
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingButton, params);
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(floatingButton, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingButton != null)
            windowManager.removeView(floatingButton);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
