'use client';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Mobil ortamda FCM push notification izinlerini yöneten ve
 * token'ı backend'e kaydeden hook.
 * 
 * Web ortamında hiçbir şey yapmaz (Capacitor kontrolü).
 */
export function usePushNotifications() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) return;

    const initPush = async () => {
      try {
        // Kullanıcı giriş yapmış mı kontrol et
        const resMe = await apiFetch('/api/auth/me');
        if (!resMe.ok) return;
        const dataMe = await resMe.json();
        if (!dataMe.authenticated) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        // İzin kontrolü
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        // FCM'e kayıt ol
        await PushNotifications.register();

        // Token alındığında backend'e gönder
        await PushNotifications.addListener('registration', async (token) => {
          await apiFetch('/api/push-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value }),
          });
        });

        // Bildirime tıklandığında uygulamayı aç
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          if (data?.generationId) {
            // Video hazır bildirimine tıklandı — ana sayfaya yönlendir
            window.location.href = '/?tab=history';
          }
        });

      } catch (e) {
        console.error('Push notification başlatma hatası:', e);
      }
    };

    initPush();
  }, []);
}
