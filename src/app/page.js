'use client';
import { useState, useRef, useCallback } from 'react';

const CATEGORIES = [
  { id: 'gelinlik', icon: '👗', label: 'Gelinlik' },
  { id: 'tesettur', icon: '🧕', label: 'Tesettür' },
  { id: 'gunluk',   icon: '👔', label: 'Günlük' },
];

export default function HomePage() {
  const [category, setCategory] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | uploading | generating | done | error
  const [progress, setProgress] = useState({ step: 0, title: '', desc: '' });
  const [videoUrl, setVideoUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedFile || !category) return;

    setPhase('uploading');
    setProgress({ step: 1, title: 'Fotoğraf yükleniyor...', desc: 'Görsel sunucuya aktarılıyor.' });
    setErrorMsg('');

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Start generation
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, category }),
      });

      const data = await res.json();

      if (!res.ok || !data.taskId) {
        throw new Error(data.error || 'Video oluşturma başlatılamadı.');
      }

      // Start polling
      setPhase('generating');
      setProgress({ step: 2, title: 'AI video oluşturuluyor...', desc: 'Bu işlem 1-5 dakika sürebilir. Sayfayı kapatmayın.' });

      const taskId = data.taskId;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 10s = 10 minutes max

      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollRef.current);
          setPhase('error');
          setErrorMsg('İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.');
          return;
        }

        try {
          const statusRes = await fetch('/api/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId }),
          });

          const statusData = await statusRes.json();

          if (statusData.status === 'done' && statusData.videoUrl) {
            clearInterval(pollRef.current);
            setVideoUrl(statusData.videoUrl);
            setProgress({ step: 3, title: 'Video hazır!', desc: '' });
            setPhase('done');
          } else if (statusData.status === 'error') {
            clearInterval(pollRef.current);
            setPhase('error');
            setErrorMsg(statusData.error || 'Video oluşturulurken hata oluştu.');
          }
          // else: still processing, continue polling
        } catch {
          // Network error during poll - keep trying
        }
      }, 10000); // Poll every 10 seconds

    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || 'Beklenmeyen bir hata oluştu.');
    }
  }, [selectedFile, category]);

  const resetForm = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('idle');
    setVideoUrl(null);
    setErrorMsg('');
    setProgress({ step: 0, title: '', desc: '' });
    removeImage();
    setCategory(null);
  }, [removeImage]);

  const canGenerate = selectedFile && category && phase === 'idle';
  const isProcessing = phase === 'uploading' || phase === 'generating';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <header style={{
        width: '100%', padding: '28px 24px', textAlign: 'center',
        borderBottom: '1px solid var(--glass-border)',
        background: 'linear-gradient(180deg, rgba(212,160,23,0.06) 0%, transparent 100%)'
      }}>
        <div style={{ fontSize: '42px', marginBottom: '12px', filter: 'drop-shadow(0 4px 12px rgba(212,160,23,0.3))' }}>✨</div>
        <h1 className="font-display" style={{
          fontSize: '26px', fontWeight: 700,
          background: 'var(--gradient-gold)', backgroundClip: 'text', WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent', letterSpacing: '1px', marginBottom: '8px'
        }}>
          AI Moda Stüdyosu
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto' }}>
          Kıyafet fotoğraflarınızı yapay zeka ile profesyonel videolara dönüştürün
        </p>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, width: '100%', maxWidth: '480px', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Phase: IDLE — Category + Upload + Generate */}
        {(phase === 'idle') && (
          <>
            {/* Category Selection */}
            <div className="glass-panel animate-in" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 600 }}>
                Kategori Seçin
              </h2>
              <div className="category-grid">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className={`category-card ${category === cat.id ? 'selected' : ''}`}
                    onClick={() => setCategory(cat.id)}
                  >
                    <span className="icon">{cat.icon}</span>
                    <span className="label">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="glass-panel animate-in" style={{ padding: '24px', animationDelay: '0.1s' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 600 }}>
                Kıyafet Fotoğrafı
              </h2>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              {!preview ? (
                <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                  <span className="upload-icon">📸</span>
                  <div className="upload-title">Fotoğraf Seç</div>
                  <div className="upload-desc">
                    Ürün fotoğrafını yükleyin,<br />AI manken videosu oluşturalım
                  </div>
                </div>
              ) : (
                <div className={`upload-area has-image`} onClick={() => fileInputRef.current?.click()}>
                  <div className="preview-container">
                    <img src={preview} alt="Önizleme" className="preview-img" />
                    <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeImage(); }}>✕</button>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              className="btn-gold animate-in"
              style={{ animationDelay: '0.2s' }}
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              ✨ Video Oluştur
            </button>
          </>
        )}

        {/* Phase: PROCESSING — Status */}
        {isProcessing && (
          <div className="glass-panel status-panel animate-in">
            <div className="spinner" />
            <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>
              {progress.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {progress.desc}
            </p>
            <div className="progress-dots">
              <div className={`dot ${progress.step >= 1 ? (progress.step > 1 ? 'done' : 'active') : ''}`} />
              <div className={`dot ${progress.step >= 2 ? (progress.step > 2 ? 'done' : 'active') : ''}`} />
              <div className={`dot ${progress.step >= 3 ? 'active' : ''}`} />
            </div>
          </div>
        )}

        {/* Phase: DONE — Result */}
        {phase === 'done' && videoUrl && (
          <div className="glass-panel result-panel animate-in">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <h3 className="font-display" style={{ fontSize: '20px', color: 'var(--text-gold)', fontWeight: 700, marginBottom: '20px' }}>
              Videonuz Hazır!
            </h3>
            <video
              src={videoUrl}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="video-preview"
            />
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn-download">
              📥 Videoyu İndir
            </a>
            <button className="btn-outline" onClick={resetForm}>
              🔄 Yeni Video Oluştur
            </button>
          </div>
        )}

        {/* Phase: ERROR */}
        {phase === 'error' && (
          <div className="glass-panel error-panel animate-in">
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>❌</div>
            <p style={{ marginBottom: '16px', fontSize: '14px' }}>{errorMsg || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
            <button className="btn-outline" onClick={resetForm} style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}>
              Tekrar Dene
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="footer">
        Karneyn Yazılım — AI Moda Stüdyosu
      </footer>

    </div>
  );
}
