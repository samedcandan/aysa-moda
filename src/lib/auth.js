import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';

// ─── JWT Konfigürasyonu ───────────────────────────────────────
const AUTH_COOKIE_NAME = 'aysamoda_session';
const secretKey = process.env.SESSION_SECRET || 'aysa-moda-super-secret-key-2024';
const key = new TextEncoder().encode(secretKey);
const TOKEN_EXPIRY = '7d'; // 7 gün
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 gün (saniye)

// ─── Şifre İşlemleri ─────────────────────────────────────────
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  if (!hash) return false;
  // Bcrypt hash kontrolü
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return bcrypt.compareSync(password, hash);
  }
  // Fallback: legacy SHA-256
  const crypto = require('crypto');
  const sha256 = crypto.createHash('sha256').update(password).digest('hex');
  return sha256 === hash;
}

// ─── JWT Token İşlemleri ──────────────────────────────────────
export async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(key);
}

export async function decrypt(input) {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

// ─── Token Oluşturma ─────────────────────────────────────────
export async function createToken(userId, email) {
  return await encrypt({ userId, email });
}

// ─── Oturum Okuma (Cookie VEYA Authorization Header) ─────────
// Mobil uygulama Authorization header ile, web cookie ile gelir.
// İkisini de destekler — önce header, sonra cookie kontrol eder.
export async function getSession() {
  let token = null;

  // 1. Authorization header kontrolü (Mobil / API istemcileri)
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  } catch (e) {
    // headers() erişilemezse (static context), atla
  }

  // 2. Cookie kontrolü (Web tarayıcıları)
  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(AUTH_COOKIE_NAME);
      if (cookie) {
        token = cookie.value;
      }
    } catch (e) {
      // cookies() erişilemezse, atla
    }
  }

  if (!token) return null;
  return await decrypt(token);
}

// ─── Oturum Cookie Yazma ──────────────────────────────────────
export async function setSessionCookie(userId, email) {
  const token = await createToken(userId, email);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return token; // Mobil istemciler için token'ı da döndür
}

// ─── Oturum Cookie Silme ──────────────────────────────────────
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
