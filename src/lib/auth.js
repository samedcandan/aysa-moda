import crypto from 'crypto';
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'aysamoda_session';
const SECRET_KEY = 'aysa-moda-super-secret-key'; // Proje için basit imza anahtarı

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function createToken(userId, email) {
  const payload = JSON.stringify({ userId, email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(SECRET_KEY, 'salt', 32), Buffer.alloc(16, 0));
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function verifyToken(token) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(SECRET_KEY, 'salt', 32), Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const payload = JSON.parse(decrypted);
    
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (!cookie) return null;
  return verifyToken(cookie.value);
}

export async function setSessionCookie(userId, email) {
  const token = createToken(userId, email);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
