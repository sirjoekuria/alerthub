import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mpesaalerthub.app',
  appName: 'mpesa-alert-hub',
  webDir: 'dist',
  server: {
    url: 'https://mpesa-alert-hub.vercel.app',
    cleartext: true,
    allowNavigation: ['mpesa-alert-hub.vercel.app']
  }
};

export default config;
