/**
 * Utility to communicate with the native Android background service
 * This bridges the web app with the native SMS processing service
 */

// Declare the BackgroundService interface that's injected by Android
declare global {
    interface Window {
        BackgroundService?: {
            setSupabaseCredentials: (supabaseUrl: string, supabaseKey: string, userId: string, accessToken: string) => void;
            clearCredentials: () => void;
            getOfflineQueue: () => string;
            clearOfflineQueue: () => void;
            removeFromOfflineQueue: (mpesaCodesJson: string) => void;
            hasRequiredPermissions: () => boolean;
        };
    }
}

/**
 * Check if running on Android with background service available
 */
export const isBackgroundServiceAvailable = (): boolean => {
    return typeof window !== 'undefined' && window.BackgroundService !== undefined;
};

/**
 * Save Supabase credentials to native storage for background processing
 * Call this when user logs in or session is refreshed
 */
export const saveCredentialsToNative = (
    supabaseUrl: string,
    supabaseKey: string,
    userId: string,
    accessToken: string
): void => {
    if (isBackgroundServiceAvailable()) {
        try {
            window.BackgroundService!.setSupabaseCredentials(
                supabaseUrl,
                supabaseKey,
                userId,
                accessToken
            );
            console.log('Credentials saved to native background service');
        } catch (error) {
            console.error('Failed to save credentials to native:', error);
        }
    }
};

/**
 * Clear credentials from native storage
 * Call this when user logs out
 */
export const clearNativeCredentials = (): void => {
    if (isBackgroundServiceAvailable()) {
        try {
            window.BackgroundService!.clearCredentials();
            console.log('Credentials cleared from native background service');
        } catch (error) {
            console.error('Failed to clear native credentials:', error);
        }
    }
};

/**
 * Get offline queue from native storage
 * These are messages saved while the device was offline
 */
export const getNativeOfflineQueue = (): any[] => {
    if (isBackgroundServiceAvailable()) {
        try {
            const queueJson = window.BackgroundService!.getOfflineQueue();
            return JSON.parse(queueJson || '[]');
        } catch (error) {
            console.error('Failed to get native offline queue:', error);
            return [];
        }
    }
    return [];
};

/**
 * Clear the native offline queue after successful sync
 */
export const clearNativeOfflineQueue = (): void => {
    if (isBackgroundServiceAvailable()) {
        try {
            window.BackgroundService!.clearOfflineQueue();
            console.log('Native offline queue cleared');
        } catch (error) {
            console.error('Failed to clear native offline queue:', error);
        }
    }
};

/**
 * Remove specific messages from the native offline queue
 * @param mpesaCodes Array of M-Pesa codes to remove
 */
export const removeFromNativeOfflineQueue = (mpesaCodes: string[]): void => {
    if (isBackgroundServiceAvailable()) {
        try {
            const mpesaCodesJson = JSON.stringify(mpesaCodes);
            window.BackgroundService!.removeFromOfflineQueue(mpesaCodesJson);
            console.log(`Removed ${mpesaCodes.length} messages from native offline queue`);
        } catch (error) {
            console.error('Failed to remove messages from native offline queue:', error);
        }
    }
};

/**
 * Check if the app has required SMS permissions
 */
export const hasNativePermissions = (): boolean => {
    if (isBackgroundServiceAvailable()) {
        try {
            return window.BackgroundService!.hasRequiredPermissions();
        } catch (error) {
            console.error('Failed to check native permissions:', error);
            return false;
        }
    }
    return false;
};
