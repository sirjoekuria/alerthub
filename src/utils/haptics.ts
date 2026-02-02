import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style });
        } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            // Fallback for web
            navigator.vibrate(10);
        }
    } catch (error) {
        console.warn('Haptics not available:', error);
    }
};

export const haptics = {
    light: () => triggerHaptic(ImpactStyle.Light),
    medium: () => triggerHaptic(ImpactStyle.Medium),
    heavy: () => triggerHaptic(ImpactStyle.Heavy),
};
