/**
 * API Fetch Helper
 * 
 * Web build'de relative URL kullanır (örn: /api/auth/login)
 * Mobil build'de absolute URL kullanır (örn: https://aysamoda.karneyn.com/api/auth/login)
 * 
 * Mobil ortamda Authorization header otomatik eklenir.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export function apiFetch(path, opts = {}) {
  const headers = { ...opts.headers };
  
  // Mobil ortamda localStorage'dan token al ve header'a ekle
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('aysamoda_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    // Web'de cookie gönder, mobilde header yeterli
    credentials: API_BASE ? 'omit' : 'include',
  });
}

/**
 * Login/Register sonrası token'ı kaydet
 * Mobil ortamda localStorage'a yazar, web'de cookie zaten server tarafından set edilir.
 */
export function saveAuthToken(token) {
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem('aysamoda_auth_token', token);
  }
}

/**
 * Logout sırasında token'ı temizle
 */
export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('aysamoda_auth_token');
  }
}

/**
 * Capacitor ortamında çalışıp çalışmadığını kontrol et
 */
export function isNativePlatform() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
}
