import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

// Cache the access token and its expiration
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Generates an OAuth2 access token for Google API using Service Account
 */
async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiry - 60) {
    return cachedToken;
  }

  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_PROJECT_ID) {
    throw new Error('Firebase credentials are not fully configured in env.');
  }

  // Format private key (replace literal \n if they exist as strings)
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  // Create JWT Header
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');

  // Create JWT Payload
  const payload = Buffer.from(JSON.stringify({
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');

  // Sign JWT
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  // Request Access Token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to get Google Access Token: ${JSON.stringify(data)}`);
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in;
  return cachedToken;
}

/**
 * Belirli bir ModaUser'a push bildirim gönderir (FCM V1).
 * @param {number} userId - ModaUser ID
 * @param {string} title - Bildirim başlığı
 * @param {string} body - Bildirim metni
 * @param {object} data - Ek veri (generationId vs.)
 */
export async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const accessToken = await getGoogleAccessToken();
    
    const tokens = await prisma.modaPushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const results = await Promise.allSettled(
      tokens.map(({ token }) =>
        fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: { title, body },
              data: data,
            }
          }),
        })
      )
    );

    // Geçersiz token'ları temizle
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        const res = results[i].value;
        if (!res.ok) {
          try {
            const errJson = await res.json();
            // UNREGISTERED or INVALID_ARGUMENT signals expired/invalid token
            const errorCode = errJson?.error?.details?.[0]?.errorCode || errJson?.error?.status;
            if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
              console.log(`Clearing unregistered token: ${tokens[i].token}`);
              await prisma.modaPushToken.deleteMany({
                where: { token: tokens[i].token },
              });
            }
          } catch { /* devam */ }
        }
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
    { generationId: String(generationId), type: 'video_ready' }
  );
}
