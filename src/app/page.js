'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
      { id: 'etek', label: 'Etek' }
    ]
  }
];

const MOTION_TYPES = [
  { id: 'rotation', label: '360° Dönüş', prompt: 'Slow, majestic 360 degree turntable rotation showcasing the outfit from front, side, and back views.' },
  { id: 'walk', label: 'Podyum Yürüyüşü', prompt: 'The model elegantly walks forward on a fashion runway, showing off the clothing movement, flow, and texture. Slow motion, professional presentation.' },
  { id: 'pose', label: 'Zarif Pozlar', prompt: 'The model strikes slow, elegant fashion poses, turning slightly to showcase the outfit details, fabric texture, and fit from different angles.' },
  { id: 'breeze', label: 'Rüzgar Duruşu', prompt: 'The model stands elegantly as a gentle breeze blows through the fabric, creating natural, flowing movement in the dress/outfit.' },
];

const MODELS = [
  { id: 'melisa', name: 'Melisa (Sarışın)', gender: 'Kayıtlı Kadın' },
  { id: 'derin', name: 'Derin (Esmer)', gender: 'Kayıtlı Kadın' },
  { id: 'huma', name: 'Hüma (Tesettürlü)', gender: 'Kayıtlı Kadın' },
  { id: 'can', name: 'Can (Kumral)', gender: 'Kayıtlı Erkek' },
  { id: 'ayaz', name: 'Ayaz (Sarışın)', gender: 'Kayıtlı Erkek' },
  { id: 'cem', name: 'Cem (Esmer)', gender: 'Kayıtlı Erkek' },
];

const BACKGROUNDS = [
  { id: 'boutique', label: 'Lüks Butik', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800' },
  { id: 'runway', label: 'Moda Podyumu', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800' },
  { id: 'street', label: 'Şehir Caddesi', url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800' },
  { id: 'custom', label: 'Kendi Mağazam', url: null },
];

const PROMPT_TAGS = [
  { label: 'Rüzgarlı Hava', text: 'Rüzgarlı hava, kumaşta doğal uçuşma hareketi.' },
  { label: 'Stüdyo Işığı', text: 'Stüdyo ışığı, sinematik aydınlatma.' },
  { label: 'Yavaş Dönüş', text: 'Yavaş dönüş, manken kendi etrafında yavaşça döner.' },
  { label: 'Yüksek Kalite', text: 'Yüksek kalite, ultra gerçekçi detaylar, 4k çözünürlük.' },
];

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth states
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Main UI state
  const [activeTab, setActiveTab] = useState('generate'); // generate | history | settings
  const [history, setHistory] = useState([]);
  const [watermarkUrl, setWatermarkUrl] = useState(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [genderSelection, setGenderSelection] = useState(null); // WOMEN | MEN | null
  const [category, setCategory] = useState('gelinlik');
  const [garmentFront, setGarmentFront] = useState(null);
  const [garmentBack, setGarmentBack] = useState(null);
  const [modelId, setModelId] = useState('melisa');
  const [bodySize, setBodySize] = useState('STANDARD'); // STANDARD | PLUS_SIZE
  const [backgroundId, setBackgroundId] = useState('boutique');
  const [customBg, setCustomBg] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeAccordion, setActiveAccordion] = useState('all_categories');
  const [motionType, setMotionType] = useState('rotation');

  // Generation status
  const [phase, setPhase] = useState('idle'); // idle | uploading | VTON | generating | done | error
  const [progressText, setProgressText] = useState('');
  const [progressStep, setProgressStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState(null);

  const fileInputFrontRef = useRef(null);
  const fileInputBackRef = useRef(null);
  const fileInputBgRef = useRef(null);
  const fileInputWatermarkRef = useRef(null);
  const pollRef = useRef(null);

  // Helper logic for gender categories and styling
  const getFilteredCategoryGroups = () => {
    if (genderSelection === 'MEN') {
      const menAllowedIds = ['gomlek', 'tisort', 'kazak', 'ceket', 'trenckot', 'mont', 'pantolon'];
      return CATEGORY_GROUPS.map(group => ({
        ...group,
        categories: group.categories.filter(cat => menAllowedIds.includes(cat.id))
      }));
    }
    // WOMEN has access to all categories
    return CATEGORY_GROUPS;
  };

  const selectGender = (gender) => {
    setGenderSelection(gender);
    if (gender === 'MEN') {
      setCategory('gomlek');
      setModelId('can');
    } else {
      setCategory('gelinlik');
      setModelId('melisa');
    }
    setStep(2);
  };

  // Fetch session & user data
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

  useEffect(() => {
    fetchUserSession();
  }, []);

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
  }, [searchParams, router]);

  // Set default prompt when category, background or motionType changes (in Turkish)
  useEffect(() => {
    const trCategoryPrompts = {
      gelinlik: "Gelinlik giyen bayan mankenin profesyonel moda tanıtım videosu. Gelinliğin tüm ince detayları, dantelleri ve zarif dökümü ön planda.",
      abiye: "Abiye giyen bayan mankenin lüks moda tanıtım videosu. Kumaş kalitesi, drapeleri ve şık detayları ön planda.",
      elbise: "Günlük elbise giyen bayan mankenin modern ve hareketli tanıtım videosu. Elbisenin kalıbı ve şık tasarımı ön planda.",
      gomlek: "Gömlek giyen bayan mankenin profesyonel ürün tanıtım videosu. Yakası, düğmeleri, manşetleri ve kalıbı ön planda.",
      straplez: "Straplez kıyafet giyen bayan mankenin zarif tanıtım videosu. Boyun çizgisi, omuz dekoltesi ve silüeti ön planda.",
      askili: "Askılı bluz giyen bayan mankenin yazlık ve şık moda videosu. Askı detayları, yaka kesimi ve kumaş dokusu ön planda.",
      ceket: "Ceket giyen bayan mankenin modern ürün tanıtım videosu. Ceketin kesimi, düğmeleri, omuz yapısı ve kalıbı ön planda.",
      trenckot: "Trençkot/hırka giyen bayan mankenin sonbahar modası tanıtım videosu. Kemer, yaka detayları ve kumaş kalitesi ön planda.",
      mont: "Mont giyen bayan mankenin kışlık ürün tanıtım videosu. Montun dolgunluğu, fermuar detayları ve modern kalıbı ön planda.",
      pelus: "Peluş ceket giyen bayan mankenin yumuşak kış modası videosu. Peluşun yumuşak dokusu, sıcaklığı ve duruşu ön planda.",
      kurk: "Kürk giyen bayan mankenin lüks kış modası tanıtım videosu. Kürkün hacmi, kalitesi ve zengin dokusu ön planda.",
      tisort: "Tişört/bluz giyen bayan mankenin spor/sokak modası tanıtım videosu. Kumaş yapısı, kalıbı ve baskı detayları ön planda.",
      kazak: "Kazak giyen bayan mankenin sıcak kış modası tanıtım videosu. Örgü detayları, yaka kesimi ve dokusu ön planda.",
      pantolon: "Pantolon/jean giyen bayan mankenin ürün tanıtım videosu. Kesimi, kalıbı ve cepleri ön planda.",
      etek: "Etek giyen bayan mankenin hareketli ve şık tanıtım videosu. Eteğin pilileri, boyu ve uçuşması ön planda."
    };

    const trBackgroundPrompts = {
      boutique: "Lüks ve şık butik mağaza arka planında.",
      runway: "Moda podyumunda, profesyonel podyum ışıkları altında.",
      street: "Şık ve hareketli bir şehir caddesinde, dış mekan sokak arka planında.",
      custom: "Butiğin kendi mağaza dekoru arka planında."
    };

    const trMotionPrompts = {
      rotation: "Manken yavaşça 360 derece kendi etrafında dönerek kıyafetin ön, yan ve arka duruşunu sergiliyor.",
      walk: "Manken zarif adımlarla kameraya doğru yürüyor, kıyafetin kumaş hareketini ve akışını gösteriyor.",
      pose: "Manken yavaş ve zarif moda pozları vererek kıyafetin tüm detaylarını farklı açılardan sergiliyor.",
      breeze: "Manken sabit dururken hafif bir rüzgar kıyafetin eteklerini ve kumaşını uçuruyor."
    };

    const trFramingPrompts = {
      gelinlik: "Baştan sona mankenin tüm vücudunu (full body showcase) gösteren profesyonel boydan çekim.",
      abiye: "Baştan sona mankenin tüm vücudunu (full body showcase) gösteren profesyonel boydan çekim.",
      elbise: "Baştan sona mankenin tüm vücudunu (full body showcase) gösteren profesyonel boydan çekim.",
      gomlek: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      straplez: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      askili: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      tisort: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      kazak: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      ceket: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      trenckot: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      mont: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      pelus: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      kurk: "Video üst vücuda odaklanmış yakın plan (upper body zoom) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      pantolon: "Video alt vücuda odaklanmış (lower body focus) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler.",
      etek: "Video alt vücuda odaklanmış (lower body focus) olarak başlar ve videonun sonuna doğru pürüzsüzce geri çekilerek tüm vücudu (full body) gösterecek şekilde genişler."
    };

    let catText = trCategoryPrompts[category] || trCategoryPrompts.tisort;
    if (modelId === 'huma') {
      catText = catText.replaceAll("bayan mankenin", "tesettürlü bayan mankenin");
      catText += " Manken şık ve modern bir tesettür başörtüsü (şal/eşarp) takmaktadır, boyun ve saçlar tamamen kapalıdır (model wears an elegant, modern hijab headscarf, covering all hair and neck perfectly).";
    }
    const bgText = trBackgroundPrompts[backgroundId] || trBackgroundPrompts.boutique;
    const motionText = trMotionPrompts[motionType] || trMotionPrompts.rotation;
    const framingText = trFramingPrompts[category] || "";
    const fidelityText = "Kıyafetin tasarımı, orijinal renkleri, kumaş dokusu, desenleri ve tüm detayları video boyunca %100 birebir korunur, hiçbir bozulma veya değişiklik olmaz.";
    const bgConsistencyText = "İlk kareden itibaren manken, seçilen arka plan ile tam uyumlu olarak konumlandırılır. Video, mankenin bu arka planın içinde doğal ve kusursuz bir şekilde entegre olmasıyla başlar, arka plan baştan sona tutarlıdır.";

    // Combine with clean spacing
    setCustomPrompt(`${catText} ${bgText} ${motionText} ${framingText} ${fidelityText} ${bgConsistencyText}`);
  }, [category, backgroundId, motionType, modelId]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchUserSession();
      } else {
        setAuthError(data.error || 'Giriş yapılamadı.');
      }
    } catch {
      setAuthError('Bağlantı hatası.');
    }
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchUserSession();
      } else {
        setAuthError(data.error || 'Kayıt yapılamadı.');
      }
    } catch {
      setAuthError('Bağlantı hatası.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setUser(null);
      setHistory([]);
    } catch {
      setUser(null);
    }
  };

  // SVG Outlines based on Category
  const renderOutlineOverlay = () => {
    if (category === 'pantolon' || category === 'etek') {
      return (
        <svg viewBox="0 0 100 150" style={{ position: 'absolute', top: '15%', left: '30%', width: '40%', height: '70%', opacity: 0.25, pointerEvents: 'none' }}>
          <path d="M30 10 L70 10 L72 30 L60 140 L50 140 L50 60 L50 140 L40 140 L28 30 Z" fill="none" stroke="var(--text-gold)" strokeWidth="2" strokeDasharray="3 3"/>
        </svg>
      );
    }
    if (category === 'gelinlik' || category === 'abiye' || category === 'elbise' || category === 'straplez') {
      return (
        <svg viewBox="0 0 100 150" style={{ position: 'absolute', top: '10%', left: '25%', width: '50%', height: '80%', opacity: 0.25, pointerEvents: 'none' }}>
          <path d="M45 20 L55 20 L60 40 L85 140 L15 140 L40 40 Z M45 20 L50 35 L55 20" fill="none" stroke="var(--text-gold)" strokeWidth="2" strokeDasharray="3 3"/>
        </svg>
      );
    }
    // Default/T-shirt/Jacket/Cardigan/Sweater/Trenchcoat
    return (
      <svg viewBox="0 0 100 150" style={{ position: 'absolute', top: '15%', left: '25%', width: '50%', height: '70%', opacity: 0.25, pointerEvents: 'none' }}>
          <path d="M30 20 L40 15 L50 22 L60 15 L70 20 L85 40 L75 50 L70 45 L70 130 L30 130 L30 45 L25 50 L15 40 Z" fill="none" stroke="var(--text-gold)" strokeWidth="2" strokeDasharray="3 3"/>
      </svg>
    );
  };

  // Image Upload helper
  const triggerImageUpload = (ref) => {
    if (ref.current) ref.current.click();
  };

  const handleImageSelect = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Canvas overlay compositor
  const composeModelWithBackground = (modelSrc, bgSrc) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = bgSrc;
      bgImg.onload = () => {
        canvas.width = 768;
        canvas.height = 1024;

        // Draw cover bg
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);

        // Draw model
        const modelImg = new Image();
        modelImg.crossOrigin = 'anonymous';
        modelImg.src = modelSrc;
        modelImg.onload = () => {
          const modelScale = 0.85;
          const modelHeight = canvas.height * modelScale;
          const modelWidth = (modelImg.width / modelImg.height) * modelHeight;
          const modelX = (canvas.width - modelWidth) / 2;
          const modelY = canvas.height - modelHeight;

          // Add drop shadow under feet
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
          ctx.drawImage(modelImg, modelX, modelY, modelWidth, modelHeight);
          ctx.restore();

          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
      };
    });
  };

  // Start Pipeline
  const handleGenerate = async () => {
    if (!garmentFront && !garmentBack) return;

    const activeGarmentFront = garmentFront || garmentBack;
    const activeGarmentBack = garmentBack || garmentFront;

    setPhase('uploading');
    setProgressStep(1);
    setProgressText('Görseller sunucuya aktarılıyor...');
    setErrorMsg('');

    try {
      // Determine background URL
      let bgUrl = BACKGROUNDS.find(b => b.id === backgroundId)?.url;
      if (backgroundId === 'custom') {
        if (!customBg) throw new Error('Lütfen kendi mağaza fotoğrafınızı yükleyin.');
        bgUrl = customBg;
      }

      // Model templates local paths
      const sizeSuffix = bodySize === 'PLUS_SIZE' ? 'plus' : 'standard';
      const frontLocalPath = `/models/${modelId}_${sizeSuffix}_front.png`;
      const backLocalPath = `/models/${modelId}_${sizeSuffix}_back.png`;

      // Compose human images on client side canvas
      setProgressText('Manken ve arka plan birleştiriliyor...');
      const [humanFrontComposed, humanBackComposed] = await Promise.all([
        composeModelWithBackground(frontLocalPath, bgUrl),
        composeModelWithBackground(backLocalPath, bgUrl),
      ]);

      // Call API
      setProgressStep(2);
      setProgressText('Yapay zeka mankeni giydiriyor...');
      setPhase('VTON');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanFront: humanFrontComposed,
          humanBack: humanBackComposed,
          garmentFront: activeGarmentFront,
          garmentBack: activeGarmentBack,
          category,
          modelId,
          bodySize,
          backgroundId,
          customPrompt,
          motionType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) {
        throw new Error(data.error || 'Video üretimi başlatılamadı.');
      }

      // Update local credit balance
      setUser(prev => ({ ...prev, credits: data.creditsLeft }));

      // Poll Kling status
      setPhase('generating');
      setProgressStep(3);
      const motionLabel = MOTION_TYPES.find(m => m.id === motionType)?.label || '360° video dönüşü';
      setProgressText(`${motionLabel} canlandırılıyor...`);

      const taskId = data.taskId;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 10s = 10 mins

      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollRef.current);
          setPhase('error');
          setErrorMsg('Video canlandırma işlemi zaman aşımına uğradı.');
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
            setGeneratedVideo(statusData.videoUrl);
            setPhase('done');
            fetchUserSession(); // reload history
          } else if (statusData.status === 'error') {
            clearInterval(pollRef.current);
            setPhase('error');
            setErrorMsg(statusData.error || 'Kling AI video üretimi başarısız oldu.');
          }
        } catch {
          // keep polling
        }
      }, 10000);

    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || 'Bir hata oluştu.');
    }
  };

  // Watermark Settings upload
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
    } catch {
      alert('Filigran kaydedilemedi.');
    }
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

  const appendTagToPrompt = (tagText) => {
    setCustomPrompt(prev => `${prev.trim()} ${tagText}`);
  };

  const resetForm = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('idle');
    setStep(1);
    setGenderSelection(null);
    setCategory('gelinlik');
    setActiveAccordion('all_categories');
    setMotionType('rotation');
    setGarmentFront(null);
    setGarmentBack(null);
    setGeneratedVideo(null);
    setErrorMsg('');
  };

  const themeClass = genderSelection === 'WOMEN' ? 'theme-women' : 'theme-men';

  // Login view if not logged in
  if (!user) {
    return (
      <div className={themeClass} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div className="glass-panel animate-in" style={{ width: '100%', maxWidth: '400px', padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <img src="/icons/logo.png" alt="Aysa Moda Logo" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 0 20px rgba(232, 203, 245, 0.2)' }} />
          </div>
          <h1 className="font-display" style={{ fontSize: '32px', background: 'var(--gradient-lavender-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            AI Moda Stüdyosu
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', letterSpacing: '0.2px' }}>
            Butiğinizi yapay zeka ile canlandırın
          </p>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>E-Posta Adresi</label>
              <input
                type="email"
                required
                className="glass-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@butik.com"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Şifre</label>
              <input
                type="password"
                required
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>

            {authError && <div style={{ color: '#ff6b6b', fontSize: '13px', textAlign: 'center', background: 'rgba(220, 53, 69, 0.08)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(220, 53, 69, 0.15)' }}>{authError}</div>}

            <button type="submit" className="btn-gold" style={{ marginTop: '8px' }}>
              {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>

          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {authMode === 'login' ? (
              <>Hesabınız yok mu? <span onClick={() => setAuthMode('register')} style={{ color: 'var(--text-gold)', cursor: 'pointer', fontWeight: 600 }}>Kayıt Olun</span></>
            ) : (
              <>Zaten üye misiniz? <span onClick={() => setAuthMode('login')} style={{ color: 'var(--text-gold)', cursor: 'pointer', fontWeight: 600 }}>Giriş Yapın</span></>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard layout
  return (
    <div className={themeClass} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header */}
      <header style={{
        width: '100%', padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'linear-gradient(180deg, rgba(232, 203, 245, 0.03) 0%, rgba(212, 174, 120, 0.01) 50%, transparent 100%)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icons/logo.png" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }} onError={(e) => e.target.style.display = 'none'} />
          <h1 className="font-display" style={{ fontSize: '22px', fontWeight: 700, background: 'var(--gradient-lavender-gold)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.3px' }}>
            AI Moda Stüdyosu
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(212, 174, 120, 0.1) 0%, rgba(232, 203, 245, 0.1) 100%)', border: '1px solid rgba(232, 203, 245, 0.25)', borderRadius: '30px', boxShadow: '0 0 10px rgba(232, 203, 245, 0.05)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>⚡ Kredi:</span>
            <strong style={{ color: 'var(--text-gold)' }}>{user.credits}</strong>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
            Çıkış ✕
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: '4px', margin: '24px 0 12px', background: 'rgba(255, 255, 255, 0.02)', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <button className={`btn-outline ${activeTab === 'generate' ? 'selected' : ''}`} onClick={() => setActiveTab('generate')} style={{ width: 'auto', padding: '8px 16px', borderRadius: '30px', border: 'none', background: activeTab === 'generate' ? 'linear-gradient(135deg, rgba(212, 174, 120, 0.15) 0%, rgba(232, 203, 245, 0.12) 100%)' : 'transparent', color: activeTab === 'generate' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'generate' ? '0 4px 15px rgba(232, 203, 245, 0.05)' : 'none', fontSize: '13px', fontWeight: 600 }}>
          Video Üret
        </button>
        <button className={`btn-outline ${activeTab === 'history' ? 'selected' : ''}`} onClick={() => setActiveTab('history')} style={{ width: 'auto', padding: '8px 16px', borderRadius: '30px', border: 'none', background: activeTab === 'history' ? 'linear-gradient(135deg, rgba(212, 174, 120, 0.15) 0%, rgba(232, 203, 245, 0.12) 100%)' : 'transparent', color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'history' ? '0 4px 15px rgba(232, 203, 245, 0.05)' : 'none', fontSize: '13px', fontWeight: 600 }}>
          Geçmiş
        </button>
        <button className={`btn-outline ${activeTab === 'settings' ? 'selected' : ''}`} onClick={() => setActiveTab('settings')} style={{ width: 'auto', padding: '8px 16px', borderRadius: '30px', border: 'none', background: activeTab === 'settings' ? 'linear-gradient(135deg, rgba(212, 174, 120, 0.15) 0%, rgba(232, 203, 245, 0.12) 100%)' : 'transparent', color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'settings' ? '0 4px 15px rgba(232, 203, 245, 0.05)' : 'none', fontSize: '13px', fontWeight: 600 }}>
          Ayarlar / Paketler
        </button>
      </nav>

      <main style={{ flex: 1, width: '100%', maxWidth: '540px', padding: '12px 20px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* TAB 1: GENERATE */}
        {activeTab === 'generate' && (
          <>
            {phase === 'idle' && (
              <>
                {/* Step indicators */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', padding: '0 4px', marginBottom: '12px', gap: '4px' }}>
                  <span style={{ color: step >= 1 ? 'var(--text-gold)' : '', fontWeight: step === 1 ? '700' : '400', transition: 'color 0.3s' }}>1. Giyim Türü</span>
                  <span style={{ color: step >= 2 ? 'var(--text-gold)' : '', fontWeight: step === 2 ? '700' : '400', transition: 'color 0.3s' }}>2. Kategori</span>
                  <span style={{ color: step >= 3 ? 'var(--text-gold)' : '', fontWeight: step === 3 ? '700' : '400', transition: 'color 0.3s' }}>3. Görseller</span>
                  <span style={{ color: step >= 4 ? 'var(--text-gold)' : '', fontWeight: step === 4 ? '700' : '400', transition: 'color 0.3s' }}>4. Manken</span>
                  <span style={{ color: step >= 5 ? 'var(--text-gold)' : '', fontWeight: step === 5 ? '700' : '400', transition: 'color 0.3s' }}>5. Arka Plan</span>
                </div>

                {/* Step 1: Gender Selection */}
                {step === 1 && (
                  <div className="glass-panel animate-in" style={{ padding: '24px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '8px', fontWeight: 700 }}>
                      Giyim Türü Seçin
                    </h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                      Butiğinizin tasarım çizgisini ve canlandırmak istediğiniz giyim türünü seçin.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                      {/* Bayan Giyim Card */}
                      <div 
                        onClick={() => selectGender('WOMEN')}
                        className="glass-panel"
                        style={{
                          padding: '24px 16px',
                          cursor: 'pointer',
                          border: '1.5px solid rgba(232, 203, 245, 0.15)',
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(232, 203, 245, 0.03) 100%)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = 'rgba(232, 203, 245, 0.45)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(232, 203, 245, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(232, 203, 245, 0.15)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(232, 203, 245, 0.2) 0%, rgba(212, 174, 120, 0.1) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px'
                        }}>
                          👗
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-lavender)' }}>Bayan Giyim</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Zarif & Estetik Tema</div>
                        </div>
                      </div>

                      {/* Erkek Giyim Card */}
                      <div 
                        onClick={() => selectGender('MEN')}
                        className="glass-panel"
                        style={{
                          padding: '24px 16px',
                          cursor: 'pointer',
                          border: '1.5px solid rgba(212, 174, 120, 0.15)',
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(212, 174, 120, 0.03) 100%)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = 'rgba(212, 174, 120, 0.45)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 174, 120, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(212, 174, 120, 0.15)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(212, 174, 120, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px'
                        }}>
                          👔
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-gold)' }}>Erkek Giyim</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Karizmatik Koyu Tema</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Category */}
                {step === 2 && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Kıyafet Kategorisi Seçin
                      </h2>
                      <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>geri</button>
                    </div>
                    
                    <div className="accordion-wrapper">
                      {getFilteredCategoryGroups().map((group) => {
                        const isActive = activeAccordion === group.id;
                        return (
                          <div key={group.id} className={`accordion-item ${isActive ? 'active' : ''}`}>
                            <div className="accordion-header" onClick={() => setActiveAccordion(isActive ? '' : group.id)}>
                              <span className="accordion-title">{group.title}</span>
                              <span className="accordion-arrow">▼</span>
                            </div>
                            <div className="accordion-content">
                              <div className="accordion-category-list">
                                {group.categories.map((cat) => (
                                  <div
                                    key={cat.id}
                                    className={`accordion-category-card ${category === cat.id ? 'selected' : ''}`}
                                    onClick={() => setCategory(cat.id)}
                                  >
                                    <span className="label">{cat.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button className="btn-gold" style={{ marginTop: '24px' }} onClick={() => setStep(3)}>
                      Devam Et ➔
                    </button>
                  </div>
                )}

                {/* Step 3: Upload images */}
                {step === 3 && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Ürün Fotoğrafları Yükleyin
                      </h2>
                      <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}> geri</button>
                    </div>

                    <input type="file" ref={fileInputFrontRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageSelect(e, setGarmentFront)} />
                    <input type="file" ref={fileInputBackRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageSelect(e, setGarmentBack)} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Front Upload */}
                      <div className={`upload-area ${garmentFront ? 'has-image' : ''}`} onClick={() => triggerImageUpload(fileInputFrontRef)} style={{ minHeight: '180px' }}>
                        {!garmentFront ? (
                          <>
                            <span className="upload-icon" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📸</span>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-gold)' }}>Ön Görünüm</div>
                            {renderOutlineOverlay()}
                          </>
                        ) : (
                          <div className="preview-container" style={{ margin: 0 }}>
                            <img src={garmentFront} alt="Front" className="preview-img" style={{ maxHeight: '160px' }} />
                            <button className="remove-btn" onClick={(e) => { e.stopPropagation(); setGarmentFront(null); }}>✕</button>
                          </div>
                        )}
                      </div>

                      {/* Back Upload */}
                      <div className={`upload-area ${garmentBack ? 'has-image' : ''}`} onClick={() => triggerImageUpload(fileInputBackRef)} style={{ minHeight: '180px' }}>
                        {!garmentBack ? (
                          <>
                            <span className="upload-icon" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📸</span>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-gold)' }}>Arka Görünüm</div>
                            {renderOutlineOverlay()}
                          </>
                        ) : (
                          <div className="preview-container" style={{ margin: 0 }}>
                            <img src={garmentBack} alt="Back" className="preview-img" style={{ maxHeight: '160px' }} />
                            <button className="remove-btn" onClick={(e) => { e.stopPropagation(); setGarmentBack(null); }}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button className="btn-gold" style={{ marginTop: '24px' }} disabled={!garmentFront && !garmentBack} onClick={() => setStep(4)}>
                      Devam Et ➔
                    </button>
                  </div>
                )}

                {/* Step 4: Model & Size */}
                {step === 4 && (
                  <div className="glass-panel animate-in" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Manken ve Beden Seçimi
                      </h2>
                      <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}> geri</button>
                    </div>

                    {/* Model Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {MODELS.filter(m => m.gender.includes(genderSelection === 'MEN' ? 'Erkek' : 'Kadın')).map((model) => (
                        <div
                          key={model.id}
                          onClick={() => setModelId(model.id)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', background: modelId === model.id ? 'linear-gradient(135deg, rgba(212, 174, 120, 0.1) 0%, rgba(232, 203, 245, 0.08) 100%)' : 'rgba(255,255,255,0.02)',
                            border: `1.5px solid ${modelId === model.id ? 'var(--gold-400)' : 'rgba(255, 255, 255, 0.06)'}`,
                            borderRadius: '16px', cursor: 'pointer',
                            boxShadow: modelId === model.id ? '0 4px 15px rgba(232, 203, 245, 0.08)' : 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: modelId === model.id ? 'var(--text-gold)' : 'var(--text-primary)', transition: 'color 0.3s' }}>{model.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{model.gender}</div>
                          </div>
                          
                          {/* Premium Omuz Hizası Gerçek Manken Önizleme */}
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: modelId === model.id ? '2px solid var(--text-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            boxShadow: modelId === model.id ? '0 0 10px rgba(212, 174, 120, 0.25)' : 'none',
                            transition: 'all 0.3s ease'
                          }}>
                            <img 
                              src={`/models/${model.id}_standard_front.png`} 
                              alt={model.name} 
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center 15%'
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Size selector */}
                    <div style={{ marginTop: '20px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Manken Bedeni</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          className={`btn-outline ${bodySize === 'STANDARD' ? 'selected' : ''}`}
                          onClick={() => setBodySize('STANDARD')}
                          style={{ padding: '12px' }}
                        >
                          {MODELS.find(m => m.id === modelId)?.gender.includes('Erkek') ? 'Standart Beden (M / 48-50)' : 'Standart Beden (36-38)'}
                        </button>
                        <button
                          className={`btn-outline ${bodySize === 'PLUS_SIZE' ? 'selected' : ''}`}
                          onClick={() => setBodySize('PLUS_SIZE')}
                          style={{ padding: '12px' }}
                        >
                          {MODELS.find(m => m.id === modelId)?.gender.includes('Erkek') ? 'Büyük Beden (XL / 54-56)' : 'Büyük Beden (42-44)'}
                        </button>
                      </div>
                    </div>

                    <button className="btn-gold" style={{ marginTop: '24px' }} onClick={() => setStep(5)}>
                      Devam Et ➔
                    </button>
                  </div>
                )}

                {/* Step 5: Background & Prompt */}
                {step === 5 && (
                  <div className="glass-panel animate-in" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h2 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Stüdyo Arka Planı & Prompt
                      </h2>
                      <button onClick={() => setStep(4)} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}> geri</button>
                    </div>

                    {/* Background selector */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      {BACKGROUNDS.map((bg) => (
                        <button
                          key={bg.id}
                          className={`btn-outline ${backgroundId === bg.id ? 'selected' : ''}`}
                          onClick={() => setBackgroundId(bg.id)}
                          style={{ fontSize: '12px', padding: '12px 4px' }}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>

                    {/* Motion/Pose Selector */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Manken Hareket / Poz Tipi</label>
                      <div className="segment-wrapper">
                        {MOTION_TYPES.map((mot) => (
                          <button
                            key={mot.id}
                            className={`segment-btn ${motionType === mot.id ? 'selected' : ''}`}
                            onClick={() => setMotionType(mot.id)}
                          >
                            {mot.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Background Upload */}
                    {backgroundId === 'custom' && (
                      <div className="glass-panel" style={{ padding: '20px', borderStyle: 'dashed', borderColor: 'rgba(232, 203, 245, 0.3)', textAlign: 'center', marginBottom: '16px', cursor: 'pointer' }} onClick={() => triggerImageUpload(fileInputBgRef)}>
                        <input type="file" ref={fileInputBgRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageSelect(e, setCustomBg)} />
                        {!customBg ? (
                          <>
                            <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>📸</span>
                            <div style={{ fontSize: '13px', color: 'var(--text-gold)', fontWeight: 600 }}>Mağaza Fotoğrafı Yükle</div>
                          </>
                        ) : (
                          <div className="preview-container" style={{ margin: 0 }}>
                            <img src={customBg} alt="Custom BG" className="preview-img" style={{ maxHeight: '120px' }} />
                            <button className="remove-btn" onClick={(e) => { e.stopPropagation(); setCustomBg(null); }} style={{ width: '24px', height: '24px', fontSize: '11px', top: '8px', right: '8px' }}>✕</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Editable Prompt */}
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Video Açıklaması (Prompt)</label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="glass-input"
                        style={{ minHeight: '90px', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}
                      />
                    </div>

                    {/* Prompt tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', marginBottom: '20px' }}>
                      {PROMPT_TAGS.map((tag) => (
                        <span
                          key={tag.label}
                          onClick={() => appendTagToPrompt(tag.text)}
                          style={{ fontSize: '11px', background: 'rgba(232, 203, 245, 0.1)', border: '1px solid rgba(232, 203, 245, 0.15)', color: 'var(--text-lavender)', padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.target.style.background = 'rgba(232, 203, 245, 0.18)'; e.target.style.borderColor = 'rgba(232, 203, 245, 0.3)'; }}
                          onMouseLeave={(e) => { e.target.style.background = 'rgba(232, 203, 245, 0.1)'; e.target.style.borderColor = 'rgba(232, 203, 245, 0.15)'; }}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>

                    <button className="btn-gold" onClick={handleGenerate}>
                      ✨ Video Oluştur (1 Kredi)
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Processing step */}
            {(phase === 'uploading' || phase === 'VTON' || phase === 'generating') && (
              <div className="glass-panel status-panel animate-in">
                <div className="spinner" />
                <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>
                  {progressText}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Bu işlem 1-3 dakika sürebilir. Lütfen sayfayı kapatmayın.
                </p>
                <div className="progress-dots">
                  <div className={`dot ${progressStep >= 1 ? (progressStep > 1 ? 'done' : 'active') : ''}`} />
                  <div className={`dot ${progressStep >= 2 ? (progressStep > 2 ? 'done' : 'active') : ''}`} />
                  <div className={`dot ${progressStep >= 3 ? 'active' : ''}`} />
                </div>
              </div>
            )}

            {/* Result done */}
            {phase === 'done' && generatedVideo && (
              <div className="glass-panel result-panel animate-in">
                <div style={{ fontSize: '42px', marginBottom: '12px' }}>🎬</div>
                <h3 className="font-display" style={{ fontSize: '18px', color: 'var(--text-gold)', fontWeight: 700, marginBottom: '16px' }}>
                  Videonuz Hazır!
                </h3>
                <video src={generatedVideo} controls autoPlay muted loop playsInline className="video-preview" />
                <a href={generatedVideo} target="_blank" rel="noopener noreferrer" className="btn-download">
                  📥 Videoyu İndir
                </a>
                <button className="btn-outline" onClick={resetForm}>
                  🔄 Yeni Video Oluştur
                </button>
              </div>
            )}

            {/* Error state */}
            {phase === 'error' && (
              <div className="glass-panel error-panel animate-in">
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>❌</div>
                <p style={{ marginBottom: '16px', fontSize: '13px', lineHeight: 1.5 }}>{errorMsg || 'Video üretilirken bir hata oluştu.'}</p>
                <button className="btn-outline" onClick={resetForm} style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}>
                  Tekrar Dene
                </button>
              </div>
            )}
          </>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
          <div className="glass-panel animate-in" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '16px', fontWeight: 600 }}>
              Üretim Geçmişi
            </h2>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0', fontSize: '13px' }}>
                Henüz video üretilmemiş.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {history.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <img src={item.frontGarmUrl} alt="Garment" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.category.toUpperCase()} - {item.bodySize}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</div>
                      </div>
                      <div>
                        {item.status === 'SUCCESS' && item.videoUrl ? (
                          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--text-gold)', textDecoration: 'none', fontWeight: 600 }}>
                            ▶ İzle & İndir
                          </a>
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

        {/* TAB 3: SETTINGS / PACKAGES */}
        {activeTab === 'settings' && (
          <>
            {/* Watermark Section */}
            <div className="glass-panel animate-in" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-gold)', marginBottom: '12px', fontWeight: 600 }}>
                Filigran (Logo) Ayarı
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Videolarınızın sağ alt köşesine otomatik olarak eklenecek yarı-şeffaf butik logonuzu yükleyin.
              </p>

              <input type="file" ref={fileInputWatermarkRef} accept="image/*" style={{ display: 'none' }} onChange={handleWatermarkUpload} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn-outline" onClick={() => triggerImageUpload(fileInputWatermarkRef)} style={{ width: 'auto', fontSize: '13px', padding: '10px 16px' }}>
                  📁 Logo Seç & Yükle
                </button>
                {watermarkUrl && (
                  <div style={{ position: 'relative' }}>
                    <img src={watermarkUrl} alt="Logo preview" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                    <button onClick={() => saveWatermark(null)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Credit packages */}
            <div className="glass-panel animate-in" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', color: 'var(--text-gold)', marginBottom: '18px', fontWeight: 600 }}>
                Kredi Yükleme Paketleri (SaaS)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Silver */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', transition: 'all 0.3s ease' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Silver Paket (30 Kredi)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Her gün 1 video hakkı</div>
                  </div>
                  <button className="btn-outline" onClick={() => handleBuyCredits('SILVER')} style={{ width: 'auto', fontSize: '13px', padding: '8px 16px', color: '#17120a', background: 'var(--gradient-gold)', border: 'none', borderRadius: '12px', fontWeight: 700 }}>
                    499 TL
                  </button>
                </div>

                {/* Gold */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'linear-gradient(135deg, rgba(212, 174, 120, 0.12) 0%, rgba(232, 203, 245, 0.06) 100%)', border: '1.5px solid var(--gold-400)', borderRadius: '16px', boxShadow: '0 0 15px rgba(212, 174, 120, 0.08)', transition: 'all 0.3s ease' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-gold)' }}>Gold Paket (60 Kredi) 🌟</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Her gün 2 video hakkı</div>
                  </div>
                  <button className="btn-outline" onClick={() => handleBuyCredits('GOLD')} style={{ width: 'auto', fontSize: '13px', padding: '8px 16px', color: '#17120a', background: 'var(--gradient-gold)', border: 'none', borderRadius: '12px', fontWeight: 700, boxShadow: '0 4px 15px rgba(212, 174, 120, 0.2)' }}>
                    899 TL
                  </button>
                </div>

                {/* Platinum */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', transition: 'all 0.3s ease' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Platinum Paket (150 Kredi)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Her gün 5 video hakkı</div>
                  </div>
                  <button className="btn-outline" onClick={() => handleBuyCredits('PLATINUM')} style={{ width: 'auto', fontSize: '13px', padding: '8px 16px', color: '#17120a', background: 'var(--gradient-gold)', border: 'none', borderRadius: '12px', fontWeight: 700 }}>
                    1.999 TL
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="footer">
        Karneyn Yazılım — AI Moda Stüdyosu
      </footer>

    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #0a0e1a)', color: 'white' }}>
        <div className="spinner" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
