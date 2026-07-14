import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.karneyn.aysamoda',
  appName: 'Aysa Moda Giydirme',
  webDir: 'out',
  server: {
    url: 'https://aysamoda.karneyn.com',
    allowNavigation: [
      'accounts.google.com',
      '*.google.com'
    ],
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
