/**
 * Kling AI (via Kie AI or Replicate) — Image-to-Video API Client
 * 
 * Giydirilmiş manken fotoğraflarını (ön ve arka) 360° dönüş videosuna dönüştürür.
 */

const KIE_API_KEY = process.env.KLING_API_KEY || process.env.KIE_API_KEY;
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;

// Kategori bazlı ön tanımlı promptlar (kullanıcı bunu düzenleyebilir)
export const DEFAULT_PROMPTS = {
  gelinlik: 
    "A professional fashion runway video of the model wearing the bridal dress. Gentle breeze animation on the dress. " +
    "Slow camera orbit turnaround, showing the front view and then the back view of the dress. " +
    "High-end lighting, photorealistic 4k fashion presentation, smooth 360 degree rotation.",

  abiye:
    "A professional haute couture fashion showcase video. The model slowly rotates 360 degrees. " +
    "Cinematic camera orbit revealing the dress details from the front and back views. " +
    "Luxury boutique background, studio lighting, smooth fabric animation.",

  ceket:
    "A stylish clothing showcase of the jacket. The model rotates slowly. " +
    "Camera orbits around the model showing the jacket cut, buttons, and fit from front to back views. " +
    "Modern clean background, professional product commercial style.",

  tisort:
    "A clean streetwear product video. The model does a slow turnaround rotation. " +
    "Showcasing the t-shirt print and design on both the front and back views. " +
    "Studio lighting, natural motion, sharp details.",

  pantolon:
    "A fashion presentation of the trousers. The model does a slow orbit rotation. " +
    "Highlighting the fabric, fit, and style of the pants from the front and back views. " +
    "Neutral studio background, smooth camera movement."
};

/**
 * Kling AI ile video oluşturma başlatır
 * @param {string|string[]} imageUrls - Tekil görsel veya [ön, arka] görsel URL'leri dizisi
 * @param {string} category - gelinlik | abiye | ceket | tisort | pantolon
 * @param {string} [customPrompt] - Kullanıcının düzenlediği prompt
 * @returns {Promise<{taskId: string}>}
 */
export async function createVideo(imageUrls, category, customPrompt) {
  const prompt = customPrompt || DEFAULT_PROMPTS[category] || DEFAULT_PROMPTS.tisort;
  const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  // 1. Kie AI (Primary)
  if (KIE_API_KEY && !KIE_API_KEY.startsWith('r8_')) {
    return await kieVideoAPI(urls, prompt);
  }

  // 2. Replicate (Fallback)
  if (KIE_API_KEY && KIE_API_KEY.startsWith('r8_')) {
    return await replicateAPI(urls[0], prompt);
  }

  // 3. Direct Kling API (Fallback)
  if (KLING_ACCESS_KEY && KLING_SECRET_KEY) {
    return await klingDirectAPI(urls[0], prompt);
  }

  throw new Error('Video API anahtarı (KLING_API_KEY veya KIE_API_KEY) yapılandırılmamış.');
}

/**
 * Video oluşturma durumunu sorgular
 * @param {string} taskId
 * @returns {Promise<{status: string, videoUrl?: string, error?: string}>}
 */
export async function checkVideoStatus(taskId) {
  // 1. Kie AI Task Check
  if (KIE_API_KEY && !KIE_API_KEY.startsWith('r8_')) {
    return await kieVideoStatus(taskId);
  }

  // 2. Replicate
  if (KIE_API_KEY && KIE_API_KEY.startsWith('r8_')) {
    return await replicateStatus(taskId);
  }

  // 3. Direct Kling API
  if (KLING_ACCESS_KEY && KLING_SECRET_KEY) {
    return await klingDirectStatus(taskId);
  }

  throw new Error('Video API anahtarı bulunamadı.');
}

// ========================
// Kie AI API Implementation
// ========================
async function kieVideoAPI(imageUrls, prompt) {
  console.log('[Kie AI] Creating Kling 3.0 video task. Images:', imageUrls);
  
  const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'kling-3.0/video',
      input: {
        image_urls: imageUrls,
        prompt: prompt,
        duration: '5', // 5 seconds duration
        mode: 'pro',
        multi_shots: false,
        sound: false,
      },
    }),
  });

  const data = await res.json();
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(data.message || 'Kie AI video görevi başlatılamadı.');
  }

  return { taskId: data.data.taskId };
}

async function kieVideoStatus(taskId) {
  const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
    },
  });

  const data = await res.json();
  
  if (data.code !== 200 || !data.data) {
    return { status: 'processing' };
  }

  const record = data.data;

  if (record.state === 'success' && record.resultJson) {
    try {
      const result = JSON.parse(record.resultJson);
      if (result.resultUrls && result.resultUrls.length > 0) {
        return { status: 'done', videoUrl: result.resultUrls[0] };
      }
    } catch (e) {
      console.error('Kie AI result parsing error:', e);
    }
  }

  if (record.state === 'failed' || record.state === 'fail') {
    return { status: 'error', error: record.failMsg || 'Kie AI video üretimi başarısız oldu.' };
  }

  return { status: 'processing' };
}

// ========================
// Replicate Fallback (Single Image)
// ========================
async function replicateAPI(imageUrl, prompt) {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      version: 'kwaivgi/kling-v1-5-image2video',
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
      'Authorization': `Bearer ${KIE_API_KEY}`,
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

// ========================
// Kling Direct API Fallback
// ========================
async function klingDirectAPI(imageUrl, prompt) {
  const res = await fetch('https://api.klingai.com/v1/videos/image2video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KLING_ACCESS_KEY}`, // Or Token
    },
    body: JSON.stringify({
      model_name: 'kling-v1',
      image: imageUrl,
      prompt: prompt,
      negative_prompt: 'nudity, revealing clothing',
      duration: '5',
      mode: 'std',
    }),
  });

  const data = await res.json();
  if (data.code !== 0 || !data.data?.task_id) {
    throw new Error(data.message || 'Kling Direct API hatası');
  }

  return { taskId: data.data.task_id };
}

async function klingDirectStatus(taskId) {
  const res = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KLING_ACCESS_KEY}`,
    },
  });

  const data = await res.json();
  const task = data.data;

  if (task && task.task_status === 'succeed' && task.task_result?.videos?.[0]?.url) {
    return { status: 'done', videoUrl: task.task_result.videos[0].url };
  }

  if (task && task.task_status === 'failed') {
    return { status: 'error', error: task.task_status_msg || 'Kling Direct video üretimi başarısız.' };
  }

  return { status: 'processing' };
}
