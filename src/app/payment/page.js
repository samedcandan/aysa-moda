'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

function PaymentPageContent() {
  const [loading, setLoading] = useState(true);
  const [formHtml, setFormHtml] = useState('');
  const [error, setError] = useState('');
  const formContainerRef = useRef(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const plan = searchParams.get('plan') || 'SILVER';

  const planDetails = {
    BRONZE: { name: 'Bronz (Bronze)', price: 416.67, credits: 10, desc: 'Test ve başlangıç için ideal' },
    SILVER: { name: 'Gümüş (Silver)', price: 1000.00, credits: 30, desc: 'Standart butikler için ideal (Günde 1 Video)' },
    GOLD: { name: 'Altın (Gold)', price: 1500.00, credits: 50, desc: 'Aktif butikler için ideal (Günde 2 Video)' },
    PLATINUM: { name: 'Platin (Platinum)', price: 2708.33, credits: 100, desc: 'Yoğun paylaşım yapan butikler için' },
  };

  const selectedPlan = planDetails[plan] || planDetails.SILVER;

  useEffect(() => {
    initPayment(plan);
  }, [plan]);

  // Form HTML yüklendiğinde içindeki scriptleri çalıştır
  useEffect(() => {
    if (!formHtml || !formContainerRef.current) return;

    const container = formContainerRef.current;
    container.innerHTML = formHtml;

    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }, [formHtml]);

  const initPayment = async (selectedPlanCode) => {
    try {
      const res = await apiFetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlanCode })
      });
      const data = await res.json();

      if (data.checkoutFormContent) {
        setFormHtml(data.checkoutFormContent);
      } else {
        setError(data.error || 'Ödeme formu oluşturulamadı.');
      }
    } catch (e) {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-primary, #0a0e1a)',
      color: 'var(--text-primary, #ffffff)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '550px',
        padding: '32px 24px',
        borderRadius: '16px',
        border: '1px solid var(--glass-border, rgba(212, 160, 23, 0.15))',
        background: 'var(--glass-bg, rgba(10, 14, 26, 0.6))',
        backdropFilter: 'blur(12px)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
        <h1 className="font-display" style={{
          fontSize: '24px',
          fontWeight: 700,
          background: 'var(--gradient-gold, linear-gradient(135deg, #f39c12, #f1c40f))',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          Güvenli Paket Ödemesi
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #b3b3b3)', marginBottom: '24px' }}>
          Seçilen Paket: <strong style={{ color: 'var(--text-gold, #f1c40f)' }}>{selectedPlan.name}</strong> — {selectedPlan.desc}
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--glass-border, rgba(212, 160, 23, 0.1))',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Paket Tutarı:</span>
            <span>{selectedPlan.price.toFixed(2)} TL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            <span>KDV (%20):</span>
            <span>{(selectedPlan.price * 0.20).toFixed(2)} TL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', color: 'var(--text-gold)' }}>
            <span>Toplam Tutar:</span>
            <span>{(selectedPlan.price * 1.20).toFixed(2)} TL</span>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>İyzico güvenli ödeme formu hazırlanıyor...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '24px 0' }}>
            <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={() => { setError(''); setLoading(true); initPayment(plan); }}
              className="btn-gold"
              style={{ width: 'auto', padding: '10px 24px' }}
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && formHtml && (
          <div>
            <div style={{
              marginBottom: '16px',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(212, 160, 23, 0.05)',
              border: '1px solid rgba(212, 160, 23, 0.1)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>🛡️ 256-bit SSL korumalı iyzico güvenli ödeme sistemi.</span>
            </div>
            <div ref={formContainerRef} id="iyzipay-checkout-form" style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', minHeight: '350px' }} />
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #0a0e1a)', color: 'white' }}>
        <div className="spinner" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
