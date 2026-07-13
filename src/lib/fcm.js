import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Firebase Cloud Messaging v1 API ile push bildirim gönderir.
 * google-services.json'daki bilgileri kullanır.
 * 
 * NOT: Server-side FCM v1 için Google Auth gerekir. 
 * Basit HTTP API (legacy) kullanıyoruz — daha sonra v1'e yükseltilebilir.
 */

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

/**
 * Belirli bir ModaUser'a push bildirim gönderir.
 * @param {number} userId - ModaUser ID
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim metni
 * @param {object} data - Ek veri (generationId vs.)
 */
export async function sendPushToUser(userId, title, body, data = {}) {
  if (!FCM_SERVER_KEY) {
    console.warn('FCM_SERVER_KEY tanımlı değil, bildirim gönderilemiyor.');
    return;
  }

  try {
    const tokens = await prisma.modaPushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const results = await Promise.allSettled(
      tokens.map(({ token }) =>
        fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: token,
            notification: { title, body },
            data,
          }),
        })
      )
    );

    // Geçersiz token'ları temizle
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        const res = results[i].value;
        try {
          const json = await res.json();
          if (json.failure > 0) {
            // Token artık geçerli değil — sil
            await prisma.modaPushToken.deleteMany({
              where: { token: tokens[i].token },
            });
          }
        } catch { /* devam */ }
      }
    }
  } catch (err) {
    console.error('Push bildirim gönderme hatası:', err);
  }
}

/**
 * Video üretimi tamamlandığında kullanıcıya bildirim gönderir.
 */
export async function notifyVideoReady(userId, generationId) {
  await sendPushToUser(
    userId,
    '🎬 Videonuz Hazır!',
    'Kıyafet canlandırma videonuz tamamlandı. Hemen indirin!',
    { generationId, type: 'video_ready' }
  );
}
