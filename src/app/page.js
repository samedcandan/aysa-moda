'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================================
//  SABİT VERİLER
// ============================================================

const CATEGORY_GROUPS = [
  {
    id: 'all_categories',
    title: 'Kıyafet Kategorisi',
    categories: [
      { id: 'gelinlik', label: 'Gelinlik' },
      { id: 'abiye', label: 'Abiye' },
      { id: 'elbise', label: 'Günlük Elbise / Tulum' },
      { id: 'gomlek', label: 'Gömlek' },
      { id: 'straplez', label: 'Straplez' },
      { id: 'askili', label: 'Askılı' },
      { id: 'tisort', label: 'Tişört / Bluz' },
      { id: 'kazak', label: 'Kazak / Süveter' },
      { id: 'ceket', label: 'Ceket / Kaban' },
      { id: 'trenckot', label: 'Trençkot / Hırka' },
      { id: 'mont', label: 'Mont' },
      { id: 'pelus', label: 'Peluş' },
      { id: 'kurk', label: 'Kürk' },
      { id: 'pantolon', label: 'Pantolon / Jean' },
      { id: 'etek', label: 'Etek' },
    ],
  },
];

const MOTION_TYPES = [
  { id: 'rotation', label: '360° Dönüş' },
  { id: 'walk', label: 'Podyum Yürüyüşü' },
  { id: 'pose', label: 'Zarif Pozlar' },
  { id: 'breeze', label: 'Rüzgar Duruşu' },
];

const MODELS = [
  { id: 'melisa', name: 'Melisa', desc: 'Sarışın', gender: 'WOMEN' },
  { id: 'derin', name: 'Derin', desc: 'Esmer', gender: 'WOMEN' },
  { id: 'huma', name: 'Hüma', desc: 'Tesettürlü', gender: 'WOMEN' },
  { id: 'can', name: 'Can', desc: 'Kumral', gender: 'MEN' },
  { id: 'ayaz', name: 'Ayaz', desc: 'Sarışın', gender: 'MEN' },
  { id: 'cem', name: 'Cem', desc: 'Esmer', gender: 'MEN' },
];

const BACKGROUNDS = [
  { id: 'original', label: 'Sade Stüdyo', promptText: 'clean solid studio background, professional studio lighting, simple minimalist studio setting' },
  { id: 'custom', label: 'Kendi Mağazam', promptText: '' },
];

const PROMPT_TAGS = [
  { label: 'Rüzgarlı Hava', text: 'Rüzgarlı hava, kumaşta doğal uçuşma hareketi.' },
  { label: 'Stüdyo Işığı', text: 'Stüdyo ışığı, sinematik aydınlatma.' },
  { label: 'Yavaş Dönüş', text: 'Yavaş dönüş, manken kendi etrafında yavaşça döner.' },
  { label: 'Yüksek Kalite', text: 'Yüksek kalite, ultra gerçekçi detaylar, 4K çözünürlük.' },
];

const FEEDBACK_CATEGORIES = [
  { id: 'giydirme_hatasi', label: 'Kıyafet doğru giydirilmedi' },
  { id: 'hareket', label: 'Hareket istediğim gibi değil' },
  { id: 'kalite', label: 'Video kalitesi düşük' },
  { id: 'prompt', label: 'Prompt dikkate alınmadı' },
  { id: 'diger', label: 'Diğer' },
];

// ============================================================
//  PROMPT ÜRETİCİ
// ============================================================

function buildPrompt({ category, backgroundId, motionType, modelId, generatorMode, isHijabDirect }) {
  const trCategoryPrompts = {
    gelinlik: 'Gelinlik giyen bayan mankenin profesyonel moda tanıtım videosu. Gelinliğin tüm ince detayları, danteleri ve zarif dökümü ön planda.',
    abiye: 'Abiye giyen bayan mankenin lüks moda tanıtım videosu. Kumaş kalitesi, drapaleri ve şik detayları ön planda.',
    elbise: 'Günlük elbise giyen bayan mankenin modern ve hareketli tanıtım videosu. Elbisenin kalıbı ve şik tasarımı ön planda.',
    gomlek: 'Gömlek giyen mankenin profesyonel ürün tanıtım videosu. Yakası, düğmeleri, manşetleri ve kalıbı ön planda.',
    straplez: 'Straplez kıyafet giyen bayan mankenin zarif tanıtım videosu. Boyun çizgisi, omuz dekoltesi ve silüeti ön planda.',
    askili: 'Askılı bluz giyen bayan mankenin yazlık ve şik moda videosu. Askı detayları, yaka kesimi ve kumaş dokusu ön planda.',
    ceket: 'Ceket giyen mankenin modern ürün tanıtım videosu. Ceketin kesimi, düğmeleri, omuz yapısı ve kalıbı ön planda.',
    trenckot: 'Trençkot/hırka giyen mankenin sonbahar modası tanıtım videosu. Kemer, yaka detayları ve kumaş kalitesi ön planda.',
    mont: 'Mont giyen mankenin kışlık ürün tanıtım videosu. Montun dolgunluğu, fermuar detayları ve modern kalıbı ön planda.',
    pelus: 'Peluş ceket giyen mankenin yumuşak kış modası videosu. Peluşun yumuşak dokusu, sıcaklığı ve duruşu ön planda.',
    kurk: 'Kürk giyen mankenin lüks kış modası tanıtım videosu. Kürkün hacmi, kalitesi ve zengin dokusu ön planda.',
    tisort: 'Tişört/bluz giyen mankenin spor/sokak modası tanıtım videosu. Kumaş yapısı, kalıbı ve baskı detayları ön planda.',
    kazak: 'Kazak giyen mankenin sıcak kış modası tanıtım videosu. Örgü detayları, yaka kesimi ve dokusu ön planda.',
    pantolon: 'Pantolon/jean giyen mankenin ürün tanıtım videosu. Kesimi, kalıbı ve cepleri ön planda.',
    etek: 'Etek giyen bayan mankenin hareketli ve şik tanıtım videosu. Eteğin pilileri, boyu ve uçuşması ön planda.',
  };

  const trMotionPrompts = {
    rotation: 'Manken yavaşça 360 derece kendi etrafında dönerek kıyafetin ön, yan ve arka duruşunu sergiliyor.',
    walk: 'Manken zarif adımlarla kameraya doğru yürüyor, kıyafetin kumaş hareketini ve akışını gösteriyor.',
    pose: 'Manken yavaş ve zarif moda pozları vererek kıyafetin tüm detaylarını farklı açılardan sergiliyor.',
    breeze: 'Manken sabit dururken hafif bir rüzgar kıyafetin eteklerini ve kumaşını uçuruyor.',
  };

  const trFramingPrompts = {
    gelinlik: 'Baştan sona mankenin tüm vücudunu (full body showcase) gösteren profesyonel boydan çekim.',
    abiye: 'Baştan sona mankenin tüm vücudunu (full body showcase) gösteren profesyonel boydan çekim.',
    elbise: 'Baştan sona mankenin tüm vücudunu (full body showcase) gösteren profesyonel boydan çekim.',
    pantolon: 'Video alt vücuda odaklanmış (lower body focus) olarak başlar ve videonun sonuna doğru tüm vücudu gösterecek şekilde genişler.',
    etek: 'Video alt vücuda odaklanmış (lower body focus) olarak başlar ve videonun sonuna doğru tüm vücudu gösterecek şekilde genişler.',
  };

  if (generatorMode === 'direct') {
    const motionText = trMotionPrompts[motionType] || trMotionPrompts.rotation;
    const hijabNote = isHijabDirect
      ? ' Manken şik ve modern bir tesettür başörtüsü takmaktadır, saçlar, boyun ve omuzlar tamamen örtülüdür.'
      : '';
    return `${motionText}${hijabNote}`;
  }

  // VTON mode
  const selectedBg = BACKGROUNDS.find(b => b.id === backgroundId);
  const bgText = selectedBg?.promptText ? `Arka plan: ${selectedBg.label.toLowerCase()} ortamı.` : '';

  let catText = trCategoryPrompts[category] || trCategoryPrompts.tisort;
  if (modelId === 'huma') {
    catText = catText.replaceAll('bayan mankenin', 'tesettürlü bayan mankenin');
    catText += ' Manken şik ve modern bir tesettür başörtüsü (şal/eşarp) takmaktadır. Manken, İslami tesettür kurallarına %100 uygun şekilde giyinmiştir. Kollar tamamen uzun, yaka kapalıdır; boyun, saçlar, omuzlar ve kollar tüm video boyunca, her açıdan (ön, yan, arka) tamamen örtülüdür, kesinlikle ten görünmez. Başörtüsü, manken dönerken de her açıdan saçları ve boynu kusursuz şekilde kapatmaya devam eder.';
  }

  const motionText = trMotionPrompts[motionType] || trMotionPrompts.rotation;
  const framingText = trFramingPrompts[category] || 'Video üst vücuda odaklanmış yakın plan olarak başlar ve videonun sonuna doğru tüm vücudu gösterecek şekilde genişler.';
  const fidelityText = 'Kıyafetin tasarımı, orijinal renkleri, kumaş dokusu, desenleri ve tüm detayları video boyunca %100 birebir korunur.';

  return `${catText} ${bgText} ${motionText} ${framingText} ${fidelityText}`;
}

// ============================================================
//  YARDIMCI FONKSİYONLAR
// ============================================================

function SVGOutline({ category }) {
  if (category === 'pantolon' || category === 'etek') {
    return (
      <svg viewBox="0 0 100 150" style={{ position: 'absolute', top: '15%', left: '30%', width: '40%', height: '70%', opacity: 0.2, pointerEvents: 'none' }}>
        <path d="M30 10 L70 10 L72 30 L60 140 L50 140 L50 60 L50 140 L40 140 L28 30 Z" fill="none" stroke="var(--text-gold)" strokeWidth="2" strokeDasharray="3 3"/>
      </svg>
    );
  }
  if (['gelinlik','abiye','elbise','straplez'].includes(category)) {
    return (
      <svg viewBox="0 0 100 150" style={{ position: 'absolute', top: '10%', left: '25%', width: '50%', height: '80%', opacity: 0.2, pointerEvents: 'none' }}>
        <path d="M45 20 L55 20 L60 40 L85 140 L15 140 L40 40 Z M45 20 L50 35 L55 20" fill="none" stroke="var(--text-gold)" strokeWidth="2" strokeDasharray="3 3"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 150" style={{ position: 'absolute', top: '15%', left: '25%', width: '50%', height: '70%', opacity: 0.2, pointerEvents: 'none' }}>
      <path d="M30 20 L40 15 L50 22 L60 15 L70 20 L85 40 L75 50 L70 45 L70 130 L30 130 L30 45 L25 50 L15 40 Z" fill="none" stroke="var(--text-gold)" strokeWidth="2" strokeDasharray="3 3"/>
    </svg>
  );
}

// ============================================================
//  ANA SAYFA İÇERİĞİ
// ============================================================

function SearchParamsHandler({ setActiveTab, fetchUserSession }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      const plan = searchParams.get('plan');
      const added = searchParams.get('added');
      alert(`Ödemeniz başarıyla tamamlandı! ${plan} planı tanımlandı ve hesabınıza ${added} video kredisi eklendi.`);
      setActiveTab('settings');
      fetchUserSession();
      router.replace('/');
    } else if (paymentStatus === 'error') {
      const msg = searchParams.get('msg') || 'Ödeme işlemi gerçekleştirilemedi.';
      alert(`Ödeme Hatası: ${msg}`);
      setActiveTab('settings');
      router.replace('/');
    }
  }, [searchParams, router, setActiveTab, fetchUserSession]);

  return null;
}

function HomePageContent() {
  const router = useRouter();

  // --- Auth ---
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Main UI ---
  const [activeTab, setActiveTab] = useState('generate');
  const [history, setHistory] = useState([]);
  const [watermarkUrl, setWatermarkUrl] = useState(null);

  // --- Wizard: Adım & Mod ---
  const [step, setStep] = useState(1);
  const [genderSelection, setGenderSelection] = useState(null); // 'WOMEN' | 'MEN' | null
  const [generatorMode, setGeneratorMode] = useState(null);     // 'vton' | 'direct' | null

  // --- VTON Mod ---
  const [modelId, setModelId] = useState('melisa');
  const [bodySize, setBodySize] = useState('STANDARD');
  const [garmentFront, setGarmentFront] = useState(null);
  const [garmentBack, setGarmentBack] = useState(null);
  const [category, setCategory] = useState('gelinlik');
  const [activeAccordion, setActiveAccordion] = useState('all_categories');
  const [backgroundId, setBackgroundId] = useState('original');
  const [customBg, setCustomBg] = useState(null);
  const [motionType, setMotionType] = useState('rotation');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isPromptEdited, setIsPromptEdited] = useState(false);
  const [showAdvancedBg, setShowAdvancedBg] = useState(false);

  // --- Direct Mod ---
  const [directFront, setDirectFront] = useState(null);
  const [directBack, setDirectBack] = useState(null);
  const [isHijabDirect, setIsHijabDirect] = useState(false);

  // --- GPT-4o Analiz ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState('');

  // --- Üretim ---
  const [phase, setPhase] = useState('idle'); // idle | uploading | VTON | vton_preview | generating | done | error
  const [progressText, setProgressText] = useState('');
  const [progressStep, setProgressStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [vtonResult, setVtonResult] = useState({ front: null, back: null, garmentFrontUrl: null, humanFrontUrl: null });
  const [currentTaskId, setCurrentTaskId] = useState(null);

  // --- Sonuç Ekranı Durum ---
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [retryUsed, setRetryUsed] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [retryVideoUrl, setRetryVideoUrl] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [lastGenerationId, setLastGenerationId] = useState(null);

  // --- Refs ---
  const fileInputFrontRef = useRef(null);
  const fileInputBackRef = useRef(null);
  const fileInputBgRef = useRef(null);
  const fileInputWatermarkRef = useRef(null);
  const fileInputDirectFrontRef = useRef(null);
  const fileInputDirectBackRef = useRef(null);
  const pollRef = useRef(null);

  // ---- Prompt Otomatik Güncelleme ----
  useEffect(() => {
    if (isPromptEdited) return;
    if (analysisResult && analysisResult.promptSuggestion) {
      setCustomPrompt(analysisResult.promptSuggestion);
      return;
    }
    const prompt = buildPrompt({ category, backgroundId, motionType, modelId, generatorMode, isHijabDirect });
    setCustomPrompt(prompt);
  }, [category, backgroundId, motionType, modelId, generatorMode, isHijabDirect, isPromptEdited, analysisResult]);

  // ---- Analiz sonucu gelince prompt/category/motion güncelle ----
  useEffect(() => {
    if (!analysisResult) return;
    if (analysisResult.categoryId) setCategory(analysisResult.categoryId);
    if (analysisResult.motionId) setMotionType(analysisResult.motionId);
    if (analysisResult.backgroundId) setBackgroundId(analysisResult.backgroundId);
    if (analysisResult.promptSuggestion) {
      setCustomPrompt(analysisResult.promptSuggestion);
      setIsPromptEdited(false);
    }
  }, [analysisResult]);

  // ---- Cinsiyet değişince model ayarla ----
  const selectGender = (gender) => {
    setGenderSelection(gender);
    if (gender === 'MEN') {
      setModelId('can');
      setCategory('tisort');
    } else {
      setModelId('melisa');
      setCategory('gelinlik');
    }
    setStep(2);
  };

  // ---- Filtrelenmiş kategoriler ----
  const getFilteredCategories = useCallback(() => {
    if (genderSelection === 'MEN') {
      const menIds = ['gomlek', 'tisort', 'kazak', 'ceket', 'trenckot', 'mont', 'pantolon'];
      return CATEGORY_GROUPS.map(g => ({ ...g, categories: g.categories.filter(c => menIds.includes(c.id)) }));
    }
    return CATEGORY_GROUPS;
  }, [genderSelection]);

  // ---- Kullanıcı session ----
  const fetchUserSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        setHistory(data.generations || []);
        setWatermarkUrl(data.user.watermarkUrl);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => { fetchUserSession(); }, []);

  // searchParams logic moved to SearchParamsHandler component above

  // ---- Auth ----
  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log("handleLogin started", { email });
    if (!email || !password) {
      setAuthError('E-posta ve şifre gereklidir.');
      return;
    }
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log("handleLogin API result:", { status: res.status, ok: res.ok, data });
      if (res.ok) { fetchUserSession(); }
      else { setAuthError(data.error || 'Giriş yapılamadı.'); }
    } catch (err) {
      console.error("handleLogin connection error:", err);
      setAuthError('Bağlantı hatası.');
    }
  };

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log("handleRegister started", { email });
    if (!email || !password) {
      setAuthError('E-posta ve şifre gereklidir.');
      return;
    }
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log("handleRegister API result:", { status: res.status, ok: res.ok, data });
      if (res.ok) { fetchUserSession(); }
      else { setAuthError(data.error || 'Kayıt yapılamadı.'); }
    } catch (err) {
      console.error("handleRegister connection error:", err);
      setAuthError('Bağlantı hatası.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    } finally { setUser(null); setHistory([]); }
  };

  // ---- Image upload helper ----
  const handleImageSelect = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ---- GPT-4o Analiz ----
  const analyzeGarment = async (imageBase64) => {
    setIsAnalyzing(true);
    setAnalyzeError('');
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/analyze-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, gender: genderSelection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analiz başarısız.');
      setAnalysisResult(data);
    } catch (err) {
      setAnalyzeError(err.message || 'Analiz hatası oluştu.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ---- Polling ----
  const startPolling = (taskId, isRetry = false) => {
    setCurrentTaskId(taskId);
    let attempts = 0;
    const maxAttempts = 72;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollRef.current);
        setPhase('error');
        setErrorMsg('Video canlandırma zaman aşımına uğradı (12 dakika).');
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
          if (isRetry) {
            setRetryVideoUrl(statusData.videoUrl);
          } else {
            setGeneratedVideo(statusData.videoUrl);
          }
          setPhase('done');
          fetchUserSession();
        } else if (statusData.status === 'error') {
          clearInterval(pollRef.current);
          setPhase('error');
          setErrorMsg(statusData.error || 'Video üretimi başarısız.');
        }
      } catch { /* devam et */ }
    }, 10000);
  };

  // ---- VTON Akışı: Adım 1 — VTON çalıştır, önizleme göster ----
  const handleVTONGenerate = async () => {
    if (!garmentFront && !garmentBack) return alert('Lütfen kıyafet fotoğrafı yükleyin.');

    setPhase('uploading');
    setProgressStep(1);
    setProgressText('Manken şablonu hazırlanıyor...');
    setErrorMsg('');

    try {
      const isRotation = motionType === 'rotation';
      const sizeSuffix = bodySize === 'PLUS_SIZE' ? 'plus' : 'standard';

      const loadAsBase64 = (path) => fetch(path).then(r => r.blob()).then(blob => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(blob);
      }));

      const [humanFrontB64, humanBackB64] = await Promise.all([
        loadAsBase64(`/models/${modelId}_${sizeSuffix}_front.png`),
        isRotation ? loadAsBase64(`/models/${modelId}_${sizeSuffix}_back.png`) : Promise.resolve(null),
      ]);

      setPhase('VTON');
      setProgressStep(2);
      setProgressText('Yapay zeka kıyafeti mankene giydiriyor... (45-90 saniye)');

      const res = await fetch('/api/vton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanFront: humanFrontB64,
          humanBack: humanBackB64,
          garmentFront: garmentFront || garmentBack,
          garmentBack: garmentBack || garmentFront,
          category, modelId, bodySize, motionType, backgroundId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.frontDressedUrl) throw new Error(data.error || 'VTON işlemi başarısız.');

      setVtonResult({
        front: data.frontDressedUrl,
        back: data.backDressedUrl,
        garmentFrontUrl: data.frontDressedUrl,
        humanFrontUrl: humanFrontB64,
      });
      setPhase('vton_preview');

    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || 'VTON işlemi sırasında hata oluştu.');
    }
  };

  // ---- VTON Akışı: Adım 2 — Kullanıcı onayladı, video başlat ----
  const handleStartVideo = async (isRetry = false) => {
    if (!vtonResult.front) return;

    setPhase('generating');
    setProgressStep(3);
    const motionLabel = MOTION_TYPES.find(m => m.id === motionType)?.label || '360° video';
    setProgressText(`${motionLabel} canlandırılıyor...`);

    try {
      const bgPromptText = BACKGROUNDS.find(b => b.id === backgroundId)?.promptText || '';
      const fullPrompt = [customPrompt, bgPromptText].filter(Boolean).join(' ');

      const isRotation = motionType === 'rotation';
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontDressedUrl: vtonResult.front,
          backDressedUrl: isRotation ? vtonResult.back : null,
          category, customPrompt: fullPrompt, motionType,
          modelId, bodySize, backgroundId,
          isDirectMode: false,
          isRetry,
          fabric: analysisResult?.fabric,
          garmentFrontUrl: vtonResult.garmentFrontUrl,
          humanFrontUrl: vtonResult.humanFrontUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) throw new Error(data.error || 'Video üretimi başlatılamadı.');

      if (data.generationId) setLastGenerationId(data.generationId);
      setUser(prev => ({ ...prev, credits: data.creditsLeft }));
      startPolling(data.taskId, isRetry);

    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || 'Video başlatılırken hata oluştu.');
    }
  };

  // ---- Direct Mod: Kendi fotoğrafı doğrudan Kling'e ----
  const handleDirectGenerate = async (isRetry = false) => {
    if (!directFront) return alert('Lütfen kendi mankenli fotoğrafınızı yükleyin.');

    setPhase('generating');
    setProgressStep(2);
    setProgressText('Video canlandırılıyor...');
    setErrorMsg('');

    try {
      const bgPromptText = BACKGROUNDS.find(b => b.id === backgroundId)?.promptText || '';
      const fullPrompt = [customPrompt, bgPromptText].filter(Boolean).join(' ');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanFront: directFront,
          humanBack: directBack || directFront,
          category: category || 'elbise',
          customPrompt: fullPrompt,
          motionType,
          directMode: true,
          isRetry,
          fabric: analysisResult?.fabric,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) throw new Error(data.error || 'Video üretimi başlatılamadı.');

      if (data.generationId) setLastGenerationId(data.generationId);
      setUser(prev => ({ ...prev, credits: data.creditsLeft }));

      setProgressStep(3);
      const motionLabel = MOTION_TYPES.find(m => m.id === motionType)?.label || '360° video';
      setProgressText(`${motionLabel} canlandırılıyor...`);
      startPolling(data.taskId, isRetry);

    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || 'Bir hata oluştu.');
    }
  };

  // ---- Yeniden Dene (ücretsiz 2. run) ----
  const handleRetry = () => {
    if (retryUsed) return;
    setRetryUsed(true);
    setPhase('generating');
    setProgressStep(2);
    setProgressText('Video yeniden canlandırılıyor...');
    if (generatorMode === 'direct') {
      handleDirectGenerate(true);
    } else {
      handleStartVideo(true);
    }
  };

  // ---- Geri Bildirim Gönder ----
  const handleSendFeedback = async () => {
    if (!feedbackCategory) return alert('Lütfen bir kategori seçin.');
    setIsSendingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: lastGenerationId,
          category: feedbackCategory,
          description: feedbackDesc,
        }),
      });
      if (res.ok) {
        setFeedbackSent(true);
        setShowFeedbackForm(false);
      } else {
        alert('Geri bildirim gönderilemedi.');
      }
    } catch {
      alert('Bağlantı hatası.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  // ---- Filigran ----
  const saveWatermark = async (base64) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_watermark', watermarkUrl: base64 }),
      });
      const data = await res.json();
      if (res.ok) {
        setWatermarkUrl(data.watermarkUrl);
        setUser(prev => ({ ...prev, watermarkUrl: data.watermarkUrl }));
      }
    } catch { alert('Filigran kaydedilemedi.'); }
  };

  const handleWatermarkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => saveWatermark(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleBuyCredits = (planName) => {
    if (!user) return;
    router.push(`/payment?plan=${planName}`);
  };

  // ---- Form sıfırla ----
  const resetForm = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('idle');
    setStep(1);
    setGenderSelection(null);
    setGeneratorMode(null);
    setCategory('gelinlik');
    setActiveAccordion('all_categories');
    setMotionType('rotation');
    setGarmentFront(null);
    setGarmentBack(null);
    setDirectFront(null);
    setDirectBack(null);
    setIsHijabDirect(false);
    setGeneratedVideo(null);
    setRetryVideoUrl(null);
    setVtonResult({ front: null, back: null, garmentFrontUrl: null, humanFrontUrl: null });
    setErrorMsg('');
    setBackgroundId('original');
    setCustomPrompt('');
    setIsPromptEdited(false);
    setAnalysisResult(null);
    setAnalyzeError('');
    setIsAnalyzing(false);
    setHasDownloaded(false);
    setRetryUsed(false);
    setFeedbackSent(false);
    setShowFeedbackForm(false);
    setFeedbackCategory('');
    setFeedbackDesc('');
    setLastGenerationId(null);
    setCurrentTaskId(null);
  };

  const themeClass = genderSelection === 'WOMEN' ? 'theme-women' : 'theme-men';

  // ============================================================
  //  GİRİŞ EKRANI
  // ============================================================

  if (!user) {
    return (
      <>
        <Suspense fallback={null}>
          <SearchParamsHandler setActiveTab={setActiveTab} fetchUserSession={fetchUserSession} />
        </Suspense>
      <div className={themeClass} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
        <div className="glow-container">
          <div className="glow-blob-1" /><div className="glow-blob-2" /><div className="glow-blob-3" />
        </div>
        <div className="glass-panel animate-in" style={{ width: '100%', maxWidth: '400px', padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <img src="/icons/logo.png" alt="Aysa Moda Logo" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 0 20px rgba(232,203,245,0.2)' }} onError={e => e.target.style.display='none'} />
          </div>
          <h1 className="font-display" style={{ fontSize: '32px', background: 'var(--gradient-lavender-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            AI Moda Stüdyosu
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
            Butiğinizi yapay zeka ile canlandırın
          </p>
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>E-Posta Adresi</label>
              <input type="email" required className="glass-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@butik.com" />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Şifre</label>
              <input type="password" required className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            {authError && <div style={{ color: '#ff6b6b', fontSize: '13px', textAlign: 'center', background: 'rgba(220,53,69,0.08)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(220,53,69,0.15)' }}>{authError}</div>}
            <button 
              type="submit" 
              className="btn-gold" 
              style={{ marginTop: '8px', position: 'relative', zIndex: 100 }}
            >
              {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>
          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {authMode === 'login'
              ? <><span>Hesabınız yok mu? </span><span onClick={() => setAuthMode('register')} style={{ color: 'var(--text-gold)', cursor: 'pointer', fontWeight: 600 }}>Kayıt Olun</span></>
              : <><span>Zaten üye misiniz? </span><span onClick={() => setAuthMode('login')} style={{ color: 'var(--text-gold)', cursor: 'pointer', fontWeight: 600 }}>Giriş Yapın</span></>
            }
          </div>
        </div>
      </div>
    </>
    );
  }

  // ============================================================
  //  DASHBOARD
  // ============================================================

  const activeVideo = retryVideoUrl || generatedVideo;

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler setActiveTab={setActiveTab} fetchUserSession={fetchUserSession} />
      </Suspense>
      <div className={themeClass} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div className="glow-container">
        <div className="glow-blob-1" /><div className="glow-blob-2" /><div className="glow-blob-3" />
      </div>

      {/* ---- Header ---- */}
      <header style={{
        width: '100%', padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(232,203,245,0.03) 0%, transparent 100%)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icons/logo.png" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} onError={e => e.target.style.display='none'} />
          <h1 className="font-display" style={{ fontSize: '22px', fontWeight: 700, background: 'var(--gradient-lavender-gold)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.3px' }}>
            AI Moda Stüdyosu
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(212,174,120,0.1), rgba(232,203,245,0.1))', border: '1px solid rgba(232,203,245,0.25)', borderRadius: '30px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>⚡ Kredi:</span>
            <strong style={{ color: 'var(--text-gold)' }}>{user.credits}</strong>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
            onMouseEnter={e => e.target.style.color='var(--text-primary)'}
            onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            Çıkış ✕
          </button>
        </div>
      </header>

      {/* ---- Tabs ---- */}
      <nav style={{ display: 'flex', gap: '4px', margin: '24px 0 12px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
        {[
          { id: 'generate', label: 'Video Üret' },
          { id: 'history', label: 'Geçmiş' },
          { id: 'settings', label: 'Ayarlar / Paketler' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            width: 'auto', padding: '8px 16px', borderRadius: '30px', border: 'none', cursor: 'pointer',
            background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(212,174,120,0.15), rgba(232,203,245,0.12))' : 'transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
          }}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, width: '100%', maxWidth: '540px', padding: '12px 20px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ================================================================
            TAB: VIDEO ÜRET
        ================================================================ */}
        {activeTab === 'generate' && (
          <>

            {/* ---- İşlem Ekranı (uploading / VTON / generating) ---- */}
            {(phase === 'uploading' || phase === 'VTON' || phase === 'generating') && (
              <div className="glass-panel animate-in" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 20px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(232,203,245,0.2), rgba(212,174,120,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', animation: 'spin 2s linear infinite' }}>
                  {phase === 'uploading' ? '⬆️' : phase === 'VTON' ? '🧵' : '🎬'}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {phase === 'uploading' ? 'Hazırlanıyor...' : phase === 'VTON' ? 'Kıyafet Giydiriliyor' : 'Video Üretiliyor'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>{progressText}</p>
                {phase === 'VTON' && (
                  <p style={{ fontSize: '11px', color: 'rgba(212,174,120,0.7)', background: 'rgba(212,174,120,0.06)', border: '1px solid rgba(212,174,120,0.15)', borderRadius: '8px', padding: '10px 14px' }}>
                    ⏳ VTON işlemi 45-90 saniye sürebilir. Lütfen sayfadan ayrılmayın.
                  </p>
                )}
                {phase === 'generating' && (
                  <p style={{ fontSize: '11px', color: 'rgba(232,203,245,0.7)', background: 'rgba(232,203,245,0.06)', border: '1px solid rgba(232,203,245,0.15)', borderRadius: '8px', padding: '10px 14px' }}>
                    🎞️ Video üretimi 3-5 dakika sürebilir. Bu ekranda bekleyin.
                  </p>
                )}
                <div className="progress-dots" style={{ marginTop: '20px' }}>
                  <div className={`dot ${progressStep >= 1 ? (progressStep > 1 ? 'done' : 'active') : ''}`} />
                  <div className={`dot ${progressStep >= 2 ? (progressStep > 2 ? 'done' : 'active') : ''}`} />
                  <div className={`dot ${progressStep >= 3 ? 'active' : ''}`} />
                </div>
              </div>
            )}

            {/* ---- VTON Önizleme ---- */}
            {phase === 'vton_preview' && (
              <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>✅ Kıyafet Giydirme Tamamlandı</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Sonuç aşağıdadır. Beğeniyorsanız <strong style={{ color: 'var(--text-gold)' }}>1 kredi</strong> harcayarak videoyu başlatın.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: vtonResult.back ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid rgba(212,174,120,0.3)' }}>
                    <img src={vtonResult.front} alt="Ön Görünüm" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '6px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)' }}>Ön Görünüm</div>
                  </div>
                  {vtonResult.back && (
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid rgba(212,174,120,0.3)' }}>
                      <img src={vtonResult.back} alt="Arka Görünüm" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '6px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)' }}>Arka Görünüm</div>
                    </div>
                  )}
                </div>
                {/* Prompt */}
                <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>📝 Video Açıklaması</p>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: customPrompt.trim().length < 20 ? '#ff6666' : '#66cc88' }}>
                    {customPrompt.trim().length} / 20 karakter
                  </span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min((customPrompt.trim().length / 20) * 100, 100)}%`, background: customPrompt.trim().length < 20 ? 'linear-gradient(90deg, #ff6666, #ffaa44)' : 'linear-gradient(90deg, #66cc88, #44bbaa)', transition: 'width 0.3s' }} />
                </div>
                <textarea value={customPrompt} onChange={e => { setCustomPrompt(e.target.value); setIsPromptEdited(true); }} placeholder="Manken açıklamasını girin..." rows={3}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${customPrompt.trim().length >= 20 ? 'rgba(102,204,136,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', padding: '12px 14px', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.3s', marginBottom: '20px' }} />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setPhase('idle'); setStep(5); }} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    ← Ayarları Düzenle
                  </button>
                  <button className="btn-gold" onClick={() => handleStartVideo(false)}
                    disabled={customPrompt.trim().length < 20}
                    style={{ flex: 2, opacity: customPrompt.trim().length < 20 ? 0.45 : 1, cursor: customPrompt.trim().length < 20 ? 'not-allowed' : 'pointer', transition: 'opacity 0.3s' }}>
                    {customPrompt.trim().length < 20 ? '📝 Prompt yazın...' : '⚡ Videoyu Başlat — 1 Kredi'}
                  </button>
                </div>
              </div>
            )}

            {/* ---- SONUÇ EKRANI ---- */}
            {phase === 'done' && activeVideo && (
              <div className="glass-panel result-panel animate-in" style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎬</div>
                  <h3 className="font-display" style={{ fontSize: '18px', color: 'var(--text-gold)', fontWeight: 700 }}>
                    {retryVideoUrl ? 'Yeni Video Hazır!' : 'Videonuz Hazır!'}
                  </h3>
                </div>
                <video src={activeVideo} controls autoPlay muted loop playsInline className="video-preview" style={{ marginBottom: '16px' }} />

                {/* Butonlar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* İndir */}
                  <a
                    href={activeVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setHasDownloaded(true)}
                    className="btn-gold"
                    style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '14px' }}
                  >
                    📥 Videoyu İndir
                    {hasDownloaded && <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>✓ İndirildi</span>}
                  </a>

                  {/* Yeniden Dene */}
                  <button
                    onClick={handleRetry}
                    disabled={retryUsed || hasDownloaded || feedbackSent}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: (retryUsed || hasDownloaded || feedbackSent) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      border: `1.5px solid ${(retryUsed || hasDownloaded || feedbackSent) ? 'rgba(255,255,255,0.06)' : 'rgba(212,174,120,0.3)'}`,
                      background: (retryUsed || hasDownloaded || feedbackSent) ? 'rgba(255,255,255,0.02)' : 'rgba(212,174,120,0.06)',
                      color: (retryUsed || hasDownloaded || feedbackSent) ? 'rgba(255,255,255,0.2)' : 'var(--text-gold)',
                    }}>
                    🔄 {retryUsed ? 'Yeniden Dene (Kullanıldı)' : 'Yeniden Dene — Ücretsiz'}
                  </button>

                  {/* Geri Bildirim */}
                  {!feedbackSent ? (
                    <button
                      onClick={() => setShowFeedbackForm(prev => !prev)}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid rgba(232,203,245,0.2)', background: 'rgba(232,203,245,0.04)', color: 'var(--text-lavender)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                      💬 Geri Bildirim Gönder
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '13px', color: '#66cc88', padding: '10px', background: 'rgba(102,204,136,0.06)', borderRadius: '10px', border: '1px solid rgba(102,204,136,0.2)' }}>
                      ✓ Geri bildiriminiz alındı, teşekkürler!
                    </div>
                  )}

                  {/* Yeni Video */}
                  <button onClick={resetForm} className="btn-outline" style={{ marginTop: '4px' }}>
                    🆕 Yeni Video Oluştur
                  </button>
                </div>

                {/* Geri Bildirim Formu */}
                {showFeedbackForm && !feedbackSent && (
                  <div className="glass-panel animate-in" style={{ marginTop: '16px', padding: '20px', border: '1px solid rgba(232,203,245,0.15)' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-lavender)', marginBottom: '14px', fontWeight: 700 }}>💬 Geri Bildirim</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Video ile ilgili sorununuzu belirtin:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {FEEDBACK_CATEGORIES.map(fc => (
                        <div key={fc.id} onClick={() => setFeedbackCategory(fc.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                            border: `1px solid ${feedbackCategory === fc.id ? 'rgba(232,203,245,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            background: feedbackCategory === fc.id ? 'rgba(232,203,245,0.06)' : 'rgba(255,255,255,0.01)' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${feedbackCategory === fc.id ? 'var(--text-lavender)' : 'rgba(255,255,255,0.2)'}`, background: feedbackCategory === fc.id ? 'var(--text-lavender)' : 'transparent', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: feedbackCategory === fc.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{fc.label}</span>
                        </div>
                      ))}
                    </div>
                    {feedbackCategory === 'diger' && (
                      <textarea value={feedbackDesc} onChange={e => setFeedbackDesc(e.target.value)} placeholder="Açıklama (isteğe bağlı)..." rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', padding: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }} />
                    )}
                    <button className="btn-gold" onClick={handleSendFeedback} disabled={isSendingFeedback || !feedbackCategory}
                      style={{ opacity: (isSendingFeedback || !feedbackCategory) ? 0.5 : 1 }}>
                      {isSendingFeedback ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ---- Hata ---- */}
            {phase === 'error' && (
              <div className="glass-panel error-panel animate-in">
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>❌</div>
                <p style={{ marginBottom: '16px', fontSize: '13px', lineHeight: 1.5 }}>{errorMsg || 'Video üretilirken bir hata oluştu.'}</p>
                <button className="btn-outline" onClick={resetForm} style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}>Tekrar Dene</button>
              </div>
            )}

            {/* ================================================================
                WIZARD ADIMLARI (idle)
            ================================================================ */}
            {phase === 'idle' && (
              <>
                {/* ---- Progress Bar ---- */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 4px', marginBottom: '12px' }}>
                  {generatorMode === 'direct' ? (
                    ['Cinsiyet', 'Yöntem', 'Fotoğraf', 'Analiz', 'Üret'].map((label, i) => {
                      const stepNum = i + 1;
                      const isActive = step === stepNum;
                      const isDone = step > stepNum;
                      return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-gold)' : isDone ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }}>{stepNum}. {label}</span>
                          {i < 4 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>›</span>}
                        </div>
                      );
                    })
                  ) : generatorMode === 'vton' ? (
                    ['Cinsiyet', 'Yöntem', 'Manken', 'Ürün', 'Analiz', 'Üret'].map((label, i) => {
                      const stepNum = i + 1;
                      const isActive = step === stepNum;
                      const isDone = step > stepNum;
                      return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-gold)' : isDone ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }}>{stepNum}. {label}</span>
                          {i < 5 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>›</span>}
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Başlamak için cinsiyet seçin</span>
                  )}
                </div>

                {/* ================================================================
                    ADIM 1: CİNSİYET SEÇİMİ
                ================================================================ */}
                {step === 1 && (
                  <div className="glass-panel animate-in" style={{ padding: '32px 24px', textAlign: 'center' }}>
                    <h2 className="font-display" style={{ fontSize: '20px', color: 'var(--text-gold)', marginBottom: '8px', fontWeight: 700 }}>
                      Giyim Türünü Seçin
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.5 }}>
                      Hangi tür kıyafet için video üretmek istiyorsunuz?
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Bayan */}
                      <div onClick={() => selectGender('WOMEN')} className="glass-panel"
                        style={{ padding: '28px 16px', cursor: 'pointer', border: '1.5px solid rgba(232,203,245,0.15)', background: 'linear-gradient(135deg, rgba(232,203,245,0.04), rgba(212,174,120,0.02))', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(232,203,245,0.45)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(232,203,245,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(232,203,245,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(232,203,245,0.25), rgba(212,174,120,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>👗</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-lavender)' }}>Bayan Giyim</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Zarif &amp; Estetik Tema</div>
                        </div>
                      </div>
                      {/* Erkek */}
                      <div onClick={() => selectGender('MEN')} className="glass-panel"
                        style={{ padding: '28px 16px', cursor: 'pointer', border: '1.5px solid rgba(212,174,120,0.15)', background: 'linear-gradient(135deg, rgba(212,174,120,0.04), rgba(232,203,245,0.02))', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(212,174,120,0.45)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(212,174,120,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(212,174,120,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,174,120,0.25), rgba(255,255,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>👔</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-gold)' }}>Erkek Giyim</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Karizmatik Koyu Tema</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================
                    ADIM 2: YÖNTEM SEÇİMİ
                ================================================================ */}
                {step === 2 && (
                  <div className="glass-panel animate-in" style={{ padding: '28px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '16px', color: 'var(--text-gold)', fontWeight: 700 }}>Nasıl Üretmek İstersiniz?</h2>
                      <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                      Kıyafetinizi bir AI mankene giydirebilir ya da kendi çektiğiniz mankenli fotoğrafı doğrudan canlandırabilirsiniz.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                       {/* VTON */}
                       <div onClick={() => { setGeneratorMode('vton'); setStep(3); setBackgroundId('boutique'); }} className="glass-panel"
                         style={{ padding: '20px 18px', cursor: 'pointer', border: '1.5px solid rgba(232,203,245,0.18)', background: 'linear-gradient(135deg, rgba(232,203,245,0.04), rgba(212,174,120,0.02))', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}
                         onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(232,203,245,0.5)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,203,245,0.08)'; }}
                         onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(232,203,245,0.18)'; e.currentTarget.style.boxShadow = 'none'; }}>
                         <div style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg, rgba(232,203,245,0.2), rgba(212,174,120,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>👗</div>
                         <div style={{ flex: 1 }}>
                           <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Manken Seç &amp; Giydir</div>
                           <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Kıyafetinizi yapay zeka mankenine giydirir. Askı/düz ürün görselleri için ideal.</div>
                         </div>
                         <span style={{ color: 'var(--text-gold)', fontSize: '20px', flexShrink: 0 }}>›</span>
                       </div>
                       {/* Direct */}
                       <div onClick={() => { setGeneratorMode('direct'); setStep(3); setBackgroundId('original'); }} className="glass-panel"
                         style={{ padding: '20px 18px', cursor: 'pointer', border: '1.5px solid rgba(212,174,120,0.18)', background: 'linear-gradient(135deg, rgba(212,174,120,0.04), rgba(232,203,245,0.02))', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}
                         onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(212,174,120,0.5)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,174,120,0.08)'; }}
                         onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(212,174,120,0.18)'; e.currentTarget.style.boxShadow = 'none'; }}>
                         <div style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg, rgba(212,174,120,0.2), rgba(232,203,245,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>📸</div>
                         <div style={{ flex: 1 }}>
                           <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Kendi Fotoğrafımı Canlandır</div>
                           <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Kendi çektiğiniz mankenli görseli doğrudan animate eder. Gelinlik, abiye gibi özel çekimler için ideal.</div>
                         </div>
                         <span style={{ color: 'var(--text-gold)', fontSize: '20px', flexShrink: 0 }}>›</span>
                       </div>
                    </div>
                  </div>
                )}

                {/* ================================================================
                    ADIM 3 — DIRECT: Fotoğraf Yükle
                ================================================================ */}
                {step === 3 && generatorMode === 'direct' && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>Mankenli Fotoğrafınızı Yükleyin</h2>
                      <button onClick={() => { setStep(2); setGeneratorMode(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>
                    <input type="file" ref={fileInputDirectFrontRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleImageSelect(e, setDirectFront)} />
                    <input type="file" ref={fileInputDirectBackRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleImageSelect(e, setDirectBack)} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div onClick={() => fileInputDirectFrontRef.current?.click()} style={{ aspectRatio: '3/4', borderRadius: '12px', border: `2px dashed ${directFront ? 'var(--text-gold)' : 'rgba(255,255,255,0.15)'}`, background: directFront ? 'none' : 'rgba(255,255,255,0.02)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                        {directFront ? <img src={directFront} alt="Ön" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                          <div style={{ textAlign: 'center', padding: '16px' }}>
                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📷</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Ön Görünüm</div>
                            <div style={{ fontSize: '10px', color: '#ff8888', marginTop: '4px' }}>Zorunlu</div>
                          </div>
                        )}
                      </div>
                      <div onClick={() => fileInputDirectBackRef.current?.click()} style={{ aspectRatio: '3/4', borderRadius: '12px', border: `2px dashed ${directBack ? 'rgba(212,174,120,0.7)' : 'rgba(255,255,255,0.1)'}`, background: directBack ? 'none' : 'rgba(255,255,255,0.01)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                        {directBack ? <img src={directBack} alt="Arka" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                          <div style={{ textAlign: 'center', padding: '16px' }}>
                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔄</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Arka Görünüm</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>360° için isteğe bağlı</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tesettür toggle */}
                    <div onClick={() => setIsHijabDirect(prev => !prev)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: isHijabDirect ? 'rgba(212,174,120,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isHijabDirect ? 'rgba(212,174,120,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', cursor: 'pointer', marginBottom: '20px', transition: 'all 0.2s' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${isHijabDirect ? 'var(--text-gold)' : 'rgba(255,255,255,0.2)'}`, background: isHijabDirect ? 'var(--text-gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        {isHijabDirect && <span style={{ color: '#1a1a1a', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Mankenim Tesettürlü (Başörtülü)</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Saç, boyun korunması için prompt güncellenir</div>
                      </div>
                    </div>

                    <button className="btn-gold" disabled={!directFront}
                      onClick={() => { if (directFront) { setStep(4); analyzeGarment(directFront); } }}
                      style={{ opacity: directFront ? 1 : 0.45, cursor: directFront ? 'pointer' : 'not-allowed' }}>
                      {directFront ? '🤖 Fotoğrafı Analiz Et ›' : '📷 Önce fotoğraf yükleyin'}
                    </button>
                  </div>
                )}

                {/* ================================================================
                    ADIM 4 — DIRECT: GPT-4o Analiz Sonucu
                ================================================================ */}
                {step === 4 && generatorMode === 'direct' && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>Ürün Analizi &amp; Hareket Önerisi</h2>
                      <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>

                    {isAnalyzing && (
                      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🤖</div>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          GPT-4o kıyafetin türünü, rengini ve<br />en uygun hareket tipini tespit ediyor...
                        </p>
                      </div>
                    )}

                    {analyzeError && !isAnalyzing && (
                      <div style={{ padding: '16px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
                        <p style={{ fontSize: '13px', color: '#ff6b6b', marginBottom: '10px' }}>⚠️ {analyzeError}</p>
                        <button onClick={() => analyzeGarment(directFront)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.3)', background: 'transparent', color: '#ff6b6b', fontSize: '12px', cursor: 'pointer' }}>Tekrar Dene</button>
                      </div>
                    )}

                    {analysisResult && !isAnalyzing && (
                      <>
                        {/* Analiz Özeti */}
                        <div style={{ padding: '16px', background: 'rgba(102,204,136,0.06)', border: '1px solid rgba(102,204,136,0.2)', borderRadius: '12px', marginBottom: '20px' }}>
                          <div style={{ fontSize: '12px', color: '#66cc88', fontWeight: 700, marginBottom: '10px' }}>✅ Analiz Tamamlandı</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ürün: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.productType}</strong></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Renk: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.color}</strong></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Giyim Türü: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.clothingType || 'Belirtilmedi'}</strong></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Kumaş: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.fabric || 'Belirtilmedi'}</strong></div>
                          </div>
                        </div>

                        {/* Prompt */}
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                          📝 Video Açıklaması
                          <span style={{ marginLeft: '8px', fontSize: '10px', color: '#66cc88' }}>(düzenlenebilir)</span>
                        </p>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min((customPrompt.trim().length / 20) * 100, 100)}%`, background: customPrompt.trim().length < 20 ? 'linear-gradient(90deg, #ff6666, #ffaa44)' : 'linear-gradient(90deg, #66cc88, #44bbaa)', transition: 'width 0.3s' }} />
                        </div>
                        <textarea value={customPrompt} onChange={e => { setCustomPrompt(e.target.value); setIsPromptEdited(true); }} rows={4}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${customPrompt.trim().length >= 20 ? 'rgba(102,204,136,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', padding: '12px 14px', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '20px', transition: 'border-color 0.3s' }} />

                        <button className="btn-gold" onClick={() => handleDirectGenerate(false)}
                          disabled={customPrompt.trim().length < 20}
                          style={{ opacity: customPrompt.trim().length < 20 ? 0.45 : 1, cursor: customPrompt.trim().length < 20 ? 'not-allowed' : 'pointer' }}>
                          {customPrompt.trim().length < 20 ? '📝 Prompt yazın...' : '⚡ Canlandır — 1 Kredi'}
                        </button>
                      </>
                    )}

                    {!isAnalyzing && !analysisResult && !analyzeError && (
                      <div style={{ textAlign: 'center', padding: '24px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Analiz başlatılıyor...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ================================================================
                    ADIM 3 — VTON: Manken Seç
                ================================================================ */}
                {step === 3 && generatorMode === 'vton' && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>Manken Seçin</h2>
                      <button onClick={() => { setStep(2); setGeneratorMode(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {MODELS.filter(m => m.gender === genderSelection).map(model => (
                        <div key={model.id} onClick={() => setModelId(model.id)} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s',
                          background: modelId === model.id ? 'linear-gradient(135deg, rgba(212,174,120,0.1), rgba(232,203,245,0.08))' : 'rgba(255,255,255,0.02)',
                          border: `1.5px solid ${modelId === model.id ? 'var(--gold-400)' : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: modelId === model.id ? '0 4px 15px rgba(232,203,245,0.08)' : 'none',
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: modelId === model.id ? 'var(--text-gold)' : 'var(--text-primary)' }}>{model.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{model.desc}</div>
                          </div>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', border: modelId === model.id ? '2px solid var(--text-gold)' : '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', boxShadow: modelId === model.id ? '0 0 10px rgba(212,174,120,0.25)' : 'none', transition: 'all 0.3s' }}>
                            <img src={`/models/${model.id}_standard_front.png`} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Beden */}
                    <div style={{ marginTop: '20px', marginBottom: '24px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Manken Bedeni</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button className={`btn-outline ${bodySize === 'STANDARD' ? 'selected' : ''}`} onClick={() => setBodySize('STANDARD')} style={{ padding: '12px', fontSize: '12px' }}>
                          {genderSelection === 'MEN' ? 'Standart (M / 48-50)' : 'Standart (36-38)'}
                        </button>
                        <button className={`btn-outline ${bodySize === 'PLUS_SIZE' ? 'selected' : ''}`} onClick={() => setBodySize('PLUS_SIZE')} style={{ padding: '12px', fontSize: '12px' }}>
                          {genderSelection === 'MEN' ? 'Büyük (XL / 54-56)' : 'Büyük (42-44)'}
                        </button>
                      </div>
                    </div>

                    <button className="btn-gold" onClick={() => setStep(4)}>Devam Et ›</button>
                  </div>
                )}

                {/* ================================================================
                    ADIM 4 — VTON: Ürün Görselleri Yükle
                ================================================================ */}
                {step === 4 && generatorMode === 'vton' && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>Ürün Fotoğrafları Yükleyin</h2>
                      <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>
                    <input type="file" ref={fileInputFrontRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleImageSelect(e, setGarmentFront)} />
                    <input type="file" ref={fileInputBackRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleImageSelect(e, setGarmentBack)} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className={`upload-area ${garmentFront ? 'has-image' : ''}`} onClick={() => fileInputFrontRef.current?.click()} style={{ minHeight: '180px' }}>
                        {!garmentFront ? (
                          <>
                            <span className="upload-icon" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📸</span>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-gold)' }}>Ön Görünüm</div>
                            <SVGOutline category={category} />
                          </>
                        ) : (
                          <div className="preview-container" style={{ margin: 0 }}>
                            <img src={garmentFront} alt="Front" className="preview-img" style={{ maxHeight: '160px' }} />
                            <button className="remove-btn" onClick={e => { e.stopPropagation(); setGarmentFront(null); }}>✕</button>
                          </div>
                        )}
                      </div>
                      <div className={`upload-area ${garmentBack ? 'has-image' : ''}`} onClick={() => fileInputBackRef.current?.click()} style={{ minHeight: '180px' }}>
                        {!garmentBack ? (
                          <>
                            <span className="upload-icon" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📸</span>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-gold)' }}>Arka Görünüm</div>
                            <SVGOutline category={category} />
                          </>
                        ) : (
                          <div className="preview-container" style={{ margin: 0 }}>
                            <img src={garmentBack} alt="Back" className="preview-img" style={{ maxHeight: '160px' }} />
                            <button className="remove-btn" onClick={e => { e.stopPropagation(); setGarmentBack(null); }}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="btn-gold" style={{ marginTop: '24px' }}
                      disabled={!garmentFront && !garmentBack}
                      onClick={() => { if (garmentFront || garmentBack) { setStep(5); analyzeGarment(garmentFront || garmentBack); } }}>
                      {(garmentFront || garmentBack) ? '🤖 Ürünü Analiz Et ›' : 'Önce görsel yükleyin'}
                    </button>
                  </div>
                )}

                {/* ================================================================
                    ADIM 5 — VTON: GPT-4o Analiz + Kategori Seç
                ================================================================ */}
                {step === 5 && generatorMode === 'vton' && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>Ürün Analizi &amp; Kategori</h2>
                      <button onClick={() => setStep(4)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>

                    {isAnalyzing && (
                      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🤖</div>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Ürün analiz ediliyor...</p>
                      </div>
                    )}

                    {(analysisResult || analyzeError) && !isAnalyzing && (
                      <>
                        {analyzeError && (
                          <div style={{ padding: '12px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '13px', color: '#ff6b6b' }}>⚠️ {analyzeError} — Manuel kategori seçin.</p>
                          </div>
                        )}
                        {analysisResult && (
                          <div style={{ padding: '14px', background: 'rgba(102,204,136,0.06)', border: '1px solid rgba(102,204,136,0.2)', borderRadius: '12px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#66cc88', fontWeight: 700, marginBottom: '10px' }}>✅ Ürün Analizi Tamamlandı</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ürün: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.productType}</strong></div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Renk: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.color}</strong></div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Giyim Türü: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.clothingType || 'Belirtilmedi'}</strong></div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Kumaş: <strong style={{ color: 'var(--text-primary)' }}>{analysisResult.fabric || 'Belirtilmedi'}</strong></div>
                            </div>
                          </div>
                        )}

                        {/* Prompt */}
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>📝 Video Açıklaması</p>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: customPrompt.trim().length < 20 ? '#ff6666' : '#66cc88' }}>
                            {customPrompt.trim().length} / 20 karakter
                          </span>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min((customPrompt.trim().length / 20) * 100, 100)}%`, background: customPrompt.trim().length < 20 ? 'linear-gradient(90deg, #ff6666, #ffaa44)' : 'linear-gradient(90deg, #66cc88, #44bbaa)', transition: 'width 0.3s' }} />
                        </div>
                        <textarea value={customPrompt} onChange={e => { setCustomPrompt(e.target.value); setIsPromptEdited(true); }} placeholder="Manken açıklamasını girin..." rows={3}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${customPrompt.trim().length >= 20 ? 'rgba(102,204,136,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', padding: '12px 14px', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.3s', marginBottom: '20px' }} />

                        {/* Arka Plan Seçimi (Accordion) */}
                        <div style={{ marginBottom: '20px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
                          <div onClick={() => setShowAdvancedBg(!showAdvancedBg)} 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', userSelect: 'none' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              🖼️ Arka Plan Seçimi (Gelişmiş)
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontWeight: 700 }}>
                              {showAdvancedBg ? 'Gösteriliyor ▲' : 'Değiştir/Seç ▼'}
                            </span>
                          </div>
                          
                          {showAdvancedBg && (
                            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                                Görsel için kullanılacak ortam şablonu. Varsayılan olarak yapay zeka en uygun ortamı otomatik seçer.
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {BACKGROUNDS.map(bg => {
                                  const isSelected = backgroundId === bg.id;
                                  const labelText = bg.id === 'original' ? 'Sade Stüdyo' : bg.label;
                                  return (
                                    <button key={bg.id} type="button" onClick={() => { setBackgroundId(bg.id); setIsPromptEdited(true); }}
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        border: `1.5px solid ${isSelected ? 'var(--text-gold)' : 'rgba(255,255,255,0.1)'}`,
                                        background: isSelected ? 'rgba(212,174,120,0.12)' : 'rgba(255,255,255,0.02)',
                                        color: isSelected ? 'var(--text-gold)' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                      }}>
                                      {labelText}
                                    </button>
                                  );
                                })}
                              </div>

                              {backgroundId === 'custom' && (
                                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Kendi Mağaza Arka Planınızı Yükleyin:
                                  </label>
                                  <input type="file" ref={fileInputBgRef} accept="image/*" 
                                    onChange={(e) => handleImageSelect(e, setCustomBg)} 
                                    style={{ display: 'none' }} />
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button type="button" onClick={() => fileInputBgRef.current?.click()}
                                      className="btn-gold" style={{ padding: '6px 12px', fontSize: '11px', width: 'auto', margin: 0 }}>
                                      📸 Görsel Seç
                                    </button>
                                    {customBg ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <img src={customBg} alt="Mağaza Önizleme" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} />
                                        <span style={{ fontSize: '11px', color: '#66cc88', fontWeight: 600 }}>Yüklendi ✓</span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Henüz görsel seçilmedi.</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <button className="btn-gold" onClick={handleVTONGenerate}
                          disabled={customPrompt.trim().length < 20}
                          style={{ opacity: customPrompt.trim().length < 20 ? 0.45 : 1, cursor: customPrompt.trim().length < 20 ? 'not-allowed' : 'pointer' }}>
                          {customPrompt.trim().length < 20 ? '📝 Prompt yazın...' : '🧵 Giydirmeye Başla ›'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ================================================================
                    ADIM 6 — VTON SONRASI: Arka Plan & Prompt (ayrı panel)
                ================================================================ */}
                {step === 6 && generatorMode === 'vton' && (
                  <div className="glass-panel animate-in" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>Stüdyo Arka Planı &amp; Prompt</h2>
                      <button onClick={() => setStep(5)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>← Geri</button>
                    </div>
                    {/* Bu adım artık vton_preview phase'de gösteriliyor */}
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Kıyafet giydirme tamamlandığında önizleme ekranı gösterilecek...</p>
                  </div>
                )}

              </>
            )}
          </>
        )}

        {/* ================================================================
            TAB: GEÇMİŞ
        ================================================================ */}
        {activeTab === 'history' && (
          <div className="glass-panel animate-in" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '16px', fontWeight: 600 }}>Üretim Geçmişi</h2>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0', fontSize: '13px' }}>Henüz video üretilmemiş.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {history.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <img src={item.frontGarmUrl} alt="Garment" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }} onError={e => e.target.style.display='none'} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.category?.toUpperCase()} — {item.bodySize}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</div>
                      </div>
                      <div>
                        {item.status === 'SUCCESS' && item.videoUrl ? (
                          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--text-gold)', textDecoration: 'none', fontWeight: 600 }}>▶ İzle &amp; İndir</a>
                        ) : item.status === 'FAILED' ? (
                          <span style={{ fontSize: '11px', color: '#ff6b6b' }}>Hata Oluştu</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-gold)' }}>İşleniyor...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB: AYARLAR / PAKETLER
        ================================================================ */}
        {activeTab === 'settings' && (
          <>
            {/* Filigran */}
            <div className="glass-panel animate-in" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-gold)', marginBottom: '12px', fontWeight: 600 }}>Filigran (Logo) Ayarı</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Videolarınızın sağ alt köşesine otomatik olarak eklenecek yarı-şeffaf butik logonuzu yükleyin.
              </p>
              <input type="file" ref={fileInputWatermarkRef} accept="image/*" style={{ display: 'none' }} onChange={handleWatermarkUpload} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn-outline" onClick={() => fileInputWatermarkRef.current?.click()} style={{ width: 'auto', fontSize: '13px', padding: '10px 16px' }}>📁 Logo Seç &amp; Yükle</button>
                {watermarkUrl && (
                  <div style={{ position: 'relative' }}>
                    <img src={watermarkUrl} alt="Logo preview" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button onClick={() => saveWatermark(null)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Kredi Paketleri */}
            <div className="glass-panel animate-in" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-gold)', marginBottom: '18px', fontWeight: 600 }}>Kredi Yükleme Paketleri</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { name: 'SILVER', label: 'Silver Paket (30 Kredi)', desc: 'Her gün 1 video hakkı', price: '499 TL', featured: false },
                  { name: 'GOLD', label: 'Gold Paket (60 Kredi) 🌟', desc: 'Her gün 2 video hakkı', price: '899 TL', featured: true },
                  { name: 'PLATINUM', label: 'Platinum Paket (150 Kredi)', desc: 'Her gün 5 video hakkı', price: '1.999 TL', featured: false },
                ].map(pkg => (
                  <div key={pkg.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: pkg.featured ? 'linear-gradient(135deg, rgba(212,174,120,0.12), rgba(232,203,245,0.06))' : 'rgba(255,255,255,0.01)', border: pkg.featured ? '1.5px solid var(--gold-400)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', boxShadow: pkg.featured ? '0 0 15px rgba(212,174,120,0.08)' : 'none', transition: 'all 0.3s' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: pkg.featured ? 'var(--text-gold)' : 'var(--text-primary)' }}>{pkg.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{pkg.desc}</div>
                    </div>
                    <button onClick={() => handleBuyCredits(pkg.name)} style={{ padding: '8px 16px', color: '#17120a', background: 'var(--gradient-gold)', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: pkg.featured ? '0 4px 15px rgba(212,174,120,0.2)' : 'none' }}>
                      {pkg.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>

      <footer className="footer">Karneyn Yazılım — AI Moda Stüdyosu</footer>
    </div>
    </>
  );
}

// ============================================================
//  EXPORT
// ============================================================

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
