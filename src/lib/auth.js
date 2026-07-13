import crypto from 'crypto';
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'aysamoda_session';
const SECRET_KEY = process.env.SESSION_SECRET || 'aysa-moda-super-secret-key-2024';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

export function createToken(userId, email) {
  const payload = JSON.stringify({ userId, email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expectedSig = sign(b64);
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
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
