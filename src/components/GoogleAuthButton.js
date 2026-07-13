"use client";
import { useEffect, useState, useRef } from 'react';
import { apiFetch, saveAuthToken } from '@/lib/api';

export default function GoogleAuthButton({ onSuccess, onError, text = "Google ile Giriş Yap" }) {
  const [loading, setLoading] = useState(false);
  const tokenClientRef = useRef(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '500994075326-ruodl4sphj8rftsbp1a6furrcl5qgqrk.apps.googleusercontent.com';

  const handleServerAuth = async (credentialToken) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialToken })
      });

      const data = await res.json();

      if (!res.ok) {
        if (onError) onError(data.error || 'Google ile giriş başarısız oldu.');
        return;
      }

      if (data.token) {
        saveAuthToken(data.token);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      if (onError) onError('Google bağlantısı sağlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  // URL Hash parametrelerinden dönen token'ı yakala (Redirect akışı için)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        if (accessToken) {
          window.history.replaceState(null, '', window.location.pathname);
          handleServerAuth(accessToken);
        }
      }
    }
  }, []);

  useEffect(() => {
    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId);

    const initGsi = () => {
      if (window.google?.accounts && clientId) {
        try {
          // 1. ID Token altyapısı (One Tap / Prompt)
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response && response.credential) {
                handleServerAuth(response.credential);
              }
            },
            auto_select: false
          });

          // 2. Token Client altyapısı (OAuth2 Pop-up)
          if (window.google.accounts.oauth2) {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'email profile openid',
              callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                  handleServerAuth(tokenResponse.access_token);
                } else {
                  setLoading(false);
                }
              },
            });
          }
        } catch (err) {
          console.error("GSI init error:", err);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.head.appendChild(script);
    } else {
      initGsi();
    }

    const interval = setInterval(() => {
      if (window.google?.accounts && !tokenClientRef.current) {
        initGsi();
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleCustomButtonClick = () => {
    setLoading(true);

    const executeTokenFlow = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          if (!tokenClientRef.current) {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'email profile openid',
              callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                  handleServerAuth(tokenResponse.access_token);
                } else {
                  setLoading(false);
                }
              },
            });
          }
          tokenClientRef.current.requestAccessToken();
        } catch (err) {
          console.error("Token Flow Error:", err);
          setLoading(false);
          if (onError) onError("Google girişi başlatılamadı. Lütfen tekrar deneyin.");
        }
      } else if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              setLoading(false);
              if (onError) onError("Google penceresi açılamadı. Lütfen tekrar deneyin.");
            }
          });
        } catch (e) {
          setLoading(false);
        }
      } else {
        setLoading(false);
        if (onError) onError("Google servisi henüz hazır değil. Lütfen 1-2 saniye sonra tekrar deneyin.");
      }
    };

    // Google kütüphanesi hazır olana kadar 2 saniyeye kadar bekle
    let attempts = 0;
    const checkAndExecute = () => {
      if (window.google?.accounts) {
        executeTokenFlow();
      } else if (attempts < 6) {
        attempts++;
        setTimeout(checkAndExecute, 300);
      } else {
        setLoading(false);
        if (onError) onError("Google servisine ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.");
      }
    };

    checkAndExecute();
  };

  return (
    <div style={{ width: '100%', margin: '0.4rem 0' }}>
      <button 
        type="button"
        onClick={handleCustomButtonClick}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
        </svg>
        <span>{loading ? 'Bağlanılıyor...' : text}</span>
      </button>
    </div>
  );
}
