/**
 * Kling AI — Image-to-Video API Client
 * 
 * Kıyafet fotoğraflarını AI manken videolarına dönüştürür.
 * Prompt mühendisliği ile kıyafet stilinin korunması garanti altına alınır.
 * 
 * Desteklenen platformlar:
 * - Kling AI Direct API (klingai.com)
 * - Replicate (replicate.com)
 * - fal.ai
 * 
 * TODO: Samed API key sağladığında platforma göre implementasyon aktifleştirilecek.
 */

const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;

// Kategori bazlı prompt mühendisliği
const CATEGORY_PROMPTS = {
  gelinlik: 
    "A professional fashion runway video. Gentle breeze softly animates the bridal dress fabric. " +
    "Slow cinematic camera orbit around the dress. " +
    "CRITICAL RULES: Preserve the EXACT original clothing design, cut, fabric texture, and style. " +
    "Do NOT modify, add, or remove ANY clothing element. Keep the dress EXACTLY as shown in the photo.",

  tesettur:
    "A professional modest fashion showcase video. Gentle wind softly animates the fabric. " +
    "Slow cinematic camera orbit around the outfit. " +
    "ABSOLUTE REQUIREMENTS: Preserve ALL clothing EXACTLY as shown — headscarf, hijab, long sleeves, " +
    "full body coverage MUST remain COMPLETELY unchanged. Do NOT reveal any skin that is covered in the original. " +
    "Do NOT remove, shorten, or modify the headscarf or any covering. The modesty level MUST be identical to the source image.",

  gunluk:
    "A professional fashion showcase video. Natural gentle movement animates the outfit. " +
    "Slow cinematic camera orbit around the clothing. " +
    "CRITICAL: Preserve the EXACT original clothing style, design, colors, and coverage level. " +
    "Do NOT modify or change any clothing element from the source photo.",
};

/**
 * Kling AI ile video oluşturma başlat
 * @param {string} imageUrl - Public erişilebilir görsel URL'i
 * @param {string} category - gelinlik | tesettur | gunluk
 * @returns {Promise<{taskId: string}>}
 */
export async function createVideo(imageUrl, category) {
  const prompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.gunluk;

  // --- Kling Direct API Implementation ---
  if (KLING_ACCESS_KEY && KLING_SECRET_KEY) {
    return await klingDirectAPI(imageUrl, prompt);
  }

  // --- Replicate Implementation ---
  if (KLING_API_KEY && KLING_API_KEY.startsWith('r8_')) {
    return await replicateAPI(imageUrl, prompt);
  }

  // --- Generic / Placeholder ---
  if (KLING_API_KEY) {
    return await klingDirectAPI(imageUrl, prompt);
  }

  throw new Error('API anahtarı yapılandırılmamış. .env.local dosyasını kontrol edin.');
}

/**
 * Video oluşturma durumunu sorgula
 * @param {string} taskId
 * @returns {Promise<{status: string, videoUrl?: string, error?: string}>}
 */
export async function checkVideoStatus(taskId) {
  // --- Kling Direct API ---
  if (KLING_ACCESS_KEY && KLING_SECRET_KEY) {
    return await klingDirectStatus(taskId);
  }

  // --- Replicate ---
  if (KLING_API_KEY && KLING_API_KEY.startsWith('r8_')) {
    return await replicateStatus(taskId);
  }

  // --- Generic ---
  if (KLING_API_KEY) {
    return await klingDirectStatus(taskId);
  }

  throw new Error('API anahtarı yapılandırılmamış.');
}


// ========================
// Kling Direct API
// ========================
async function klingDirectAPI(imageUrl, prompt) {
  const apiBase = 'https://api.klingai.com/v1';
  
  const res = await fetch(`${apiBase}/videos/image2video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KLING_API_KEY || KLING_ACCESS_KEY}`,
    },
    body: JSON.stringify({
      model_name: 'kling-v1',
      image: imageUrl,
      prompt: prompt,
      negative_prompt: 'nudity, revealing clothing, changed outfit, different dress, modified clothing, removed headscarf',
      duration: '5',
      mode: 'std',
    }),
  });

  const data = await res.json();

  if (data.code !== 0 && !data.data?.task_id) {
    throw new Error(data.message || 'Kling API hatası');
  }

  return { taskId: data.data?.task_id || data.task_id };
}

async function klingDirectStatus(taskId) {
  const apiBase = 'https://api.klingai.com/v1';

  const res = await fetch(`${apiBase}/videos/image2video/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY || KLING_ACCESS_KEY}`,
    },
  });

  const data = await res.json();
  const task = data.data;

  if (!task) {
    return { status: 'processing' };
  }

  if (task.task_status === 'succeed' && task.task_result?.videos?.[0]?.url) {
    return { status: 'done', videoUrl: task.task_result.videos[0].url };
  }

  if (task.task_status === 'failed') {
    return { status: 'error', error: task.task_status_msg || 'Video oluşturulamadı.' };
  }

  return { status: 'processing' };
}


// ========================
// Replicate API
// ========================
async function replicateAPI(imageUrl, prompt) {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KLING_API_KEY}`,
    },
    body: JSON.stringify({
      version: 'kwaivgi/kling-v1-5-image2video',  // Kling on Replicate
      input: {
        image: imageUrl,
        prompt: prompt,
        negative_prompt: 'nudity, revealing, changed outfit, modified clothing, removed headscarf',
        duration: 5,
      },
    }),
  });

  const data = await res.json();

  if (!data.id) {
    throw new Error(data.detail || 'Replicate API hatası');
  }

  return { taskId: data.id };
}

async function replicateStatus(taskId) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY}`,
    },
  });

  const data = await res.json();

  if (data.status === 'succeeded' && data.output) {
    const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    return { status: 'done', videoUrl };
  }

  if (data.status === 'failed') {
    return { status: 'error', error: data.error || 'Video oluşturulamadı.' };
  }

  return { status: 'processing' };
}
