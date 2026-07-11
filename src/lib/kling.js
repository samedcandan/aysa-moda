/**
 * Kling AI (via Kie AI or Replicate) — Image-to-Video API Client
 * 
 * Giydirilmiş manken fotoğraflarını (ön ve arka) 360° dönüş videosuna dönüştürür.
 */

const KIE_API_KEY = process.env.KLING_API_KEY || process.env.KIE_API_KEY;
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;

// Kategori bazlı ön tanımlı promptlar — Arka plan NÖTR (arka plan metin olarak customPrompt'tan geliyor)
export const DEFAULT_PROMPTS = {
  gelinlik: 
    "A professional fashion video of the model wearing a bridal dress. " +
    "Gentle breeze creates natural movement in the fabric and veil. " +
    "Slow camera reveals the intricate lace details, elegant draping, and full silhouette from front and back. " +
    "High-end lighting, photorealistic 4K fashion presentation.",

  abiye:
    "A professional haute couture fashion video. The model moves elegantly. " +
    "Cinematic camera reveals the gown's fabric quality, draping details, and full silhouette from front and back views. " +
    "Soft studio lighting, smooth fabric animation, photorealistic quality.",

  elbise:
    "A gorgeous fashion video of the dress. The model moves gracefully. " +
    "Showcasing the style, draping, and natural flow of the dress from the front and back views. " +
    "Professional cinematic lighting.",

  gomlek:
    "A professional fashion video of the shirt. The model moves naturally. " +
    "Showcasing the collar, buttons, cuffs, and clean fabric texture from the front and back views. " +
    "Soft cinematic lighting, detailed product presentation.",

  straplez:
    "A stunning fashion video of the strapless outfit. The model moves gracefully. " +
    "Revealing the neckline, silhouette, and drape from front and back angles. " +
    "High-end cinematic lighting.",

  askili:
    "A beautiful fashion video of the strap top. The model moves naturally. " +
    "Highlighting the shoulder straps, neckline, and fabric fit from front and back views. " +
    "Professional cinematic lighting.",

  ceket:
    "A stylish fashion video of the jacket. The model moves slowly and confidently. " +
    "Showcasing the jacket cut, buttons, structure, and fit from front and back views. " +
    "Professional product presentation lighting.",

  trenckot:
    "A professional fashion video of the trenchcoat. The model moves elegantly. " +
    "Showcasing the belt, collar, fabric quality, and fit from the front and back views. " +
    "Soft cinematic lighting.",

  mont:
    "A high-quality fashion video of the winter coat. The model turns slowly. " +
    "Showcasing the zippers, hood, texture, and volume of the coat from the front and back views. " +
    "Natural cinematic lighting.",

  pelus:
    "A cozy fashion video of the plush jacket. The model rotates gracefully. " +
    "Revealing the soft plush texture, collar, and warm fit from the front and back views. " +
    "Warm cinematic lighting.",

  kurk:
    "A luxury fashion video of the faux fur coat. The model moves slowly and confidently. " +
    "Highlighting the rich fur texture, volume, and elegance from the front and back views. " +
    "Soft cinematic lighting.",

  tisort:
    "A clean fashion product video of the t-shirt. The model does a slow natural rotation. " +
    "Showcasing the print, design, and fabric on both the front and back views. " +
    "Natural lighting, sharp details.",

  kazak:
    "A cozy fashion video of the sweater. The model moves naturally. " +
    "Highlighting the knit textures, patterns, and fit of the sweater from the front and back. " +
    "Soft warm cinematic lighting.",

  pantolon:
    "A fashion video of the trousers. The model moves confidently. " +
    "Highlighting the fabric, fit, and style of the pants from the front and back views. " +
    "Smooth cinematic camera movement.",

  etek:
    "A beautiful fashion video of the skirt. The model moves gracefully. " +
    "Showcasing the pleats, length, and natural movement of the skirt from the front and back views. " +
    "Professional cinematic lighting."
};

/**
 * Kling AI ile video oluşturma başlatır
 * @param {string|string[]} imageUrls - Tekil görsel veya [ön, arka] görsel URL'leri dizisi
 * @param {string} category - gelinlik | abiye | ceket | tisort | pantolon
 * @param {string} [customPrompt] - Kullanıcının düzenlediği prompt
 * @param {string} [modelId] - Manken kimliği
 * @param {string} [fabric] - Kumaş türü (örn: Keten, Pamuk)
 * @returns {Promise<{taskId: string}>}
 */
export async function createVideo(imageUrls, category, customPrompt, modelId, fabric) {
  let prompt = customPrompt || DEFAULT_PROMPTS[category] || DEFAULT_PROMPTS.tisort;
  const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  const lowerPrompt = prompt.toLowerCase();
  const lowerFabric = (fabric || '').toLowerCase();

  // Detect if the fabric is a matte/non-reflective material (e.g. Linen, Cotton, Denim, Wool)
  const isMatteFabric = lowerFabric.includes('keten') || 
                        lowerFabric.includes('pamuk') || 
                        lowerFabric.includes('kot') || 
                        lowerFabric.includes('yün') ||
                        lowerFabric.includes('linen') || 
                        lowerFabric.includes('cotton') || 
                        lowerFabric.includes('denim') || 
                        lowerFabric.includes('wool') ||
                        lowerPrompt.includes('linen') ||
                        lowerPrompt.includes('cotton') ||
                        lowerPrompt.includes('denim') ||
                        lowerPrompt.includes('wool') ||
                        lowerPrompt.includes('keten') ||
                        lowerPrompt.includes('pamuk') ||
                        lowerPrompt.includes('kot');

  // Dynamic negative prompt to prevent fabric transparency, exposed skin/slits, cleavage, plain backgrounds and outfit morphing
  let negativePrompt = 'changed garment details, modified design, altered pattern, different buttons, different seams, added details, removed details, transparent clothing, see-through fabric, sheer fabric, chiffon, tulle, lace, organza, changed outfit, modified clothing, altered proportions, changed garment length, nudity, revealing, slit, torn clothing, deep neckline, exposed cleavage, visible nipples, revealing top, low-cut, plunging neckline, bare chest, exposed breast, undergarment visible, exposed skin, white background, plain background, studio background, blank background, solid color background, cropped garment, out of frame clothing, cut off top, cut off pants, cut off skirt, cut off legs, cropped clothing, out of frame, body cut off';
  if (modelId === 'huma' || lowerPrompt.includes('hijab') || lowerPrompt.includes('headscarf') || lowerPrompt.includes('tesettür')) {
    negativePrompt = 'changed garment details, modified design, altered pattern, different buttons, different seams, transparent clothing, see-through fabric, sheer fabric, chiffon, tulle, lace, organza, changed outfit, modified clothing, altered proportions, changed garment length, nudity, revealing, slit, torn clothing, exposed skin, exposed hair, exposed neck, bare arms, bare shoulders, removed headscarf, removed hijab, uncovered hair, deep neckline, exposed cleavage, visible nipples, revealing top, low-cut, plunging neckline, bare chest, exposed breast, undergarment visible, white background, plain background, studio background, blank background, solid color background, cropped garment, out of frame clothing, cut off top, cut off pants, cut off skirt, cut off legs, cropped clothing, out of frame, body cut off';
  }

  // === PROMPT ARCHITECTURE ===
  // Kling AI pays most attention to the BEGINNING of the prompt.
  // Strategy: IMAGE_FIDELITY_PREFIX + customPrompt + short quality suffix
  
  // 1. PREPEND: Image fidelity prefix + immediate scene start — this is what Kling sees FIRST
  const fidelityPrefix = 'FROM THE VERY FIRST FRAME, the model is ALREADY inside the described environment — there is NO white background, NO plain background, NO studio background at ANY point in the video. The scene starts IMMEDIATELY in the rich 3D environment. Strictly preserve every detail of the garment exactly as shown in the input image: same design, same length, same width, same proportions, same fabric texture, same color, same pattern, completely opaque and non-transparent. The entire garment must remain fully in-frame and visible at all times, without being cropped or cut off at the edges.';
  
  // 2. APPEND: Short quality suffix
  const qualitySuffix = ' Photorealistic, 8K, cinematic lighting. The background environment is fully established from frame 1.';
  
  // Final prompt: fidelity first, then content, then quality
  prompt = `${fidelityPrefix} ${prompt}${qualitySuffix}`;

  if (isMatteFabric) {
    console.log(`[Kling AI] Matte fabric protection activated for: ${fabric || 'detected in prompt'}`);
    negativePrompt += ', satin, silk, shiny fabric, glossy fabric, reflective fabric, metallic sheen';
  }

  // 1. Kie AI (Primary)
  if (KIE_API_KEY && !KIE_API_KEY.startsWith('r8_')) {
    return await kieVideoAPI(urls, prompt, negativePrompt);
  }

  // 2. Replicate (Fallback)
  if (KIE_API_KEY && KIE_API_KEY.startsWith('r8_')) {
    return await replicateAPI(urls[0], prompt, negativePrompt);
  }

  // 3. Direct Kling API (Fallback)
  if (KLING_ACCESS_KEY && KLING_SECRET_KEY) {
    return await klingDirectAPI(urls[0], prompt, negativePrompt);
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
async function kieVideoAPI(imageUrls, prompt, negativePrompt) {
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
        negative_prompt: negativePrompt || 'nudity, revealing, changed outfit, modified clothing, removed headscarf, slit, leg slit, torn clothing, deformed leg',
        duration: '5', // 5 seconds duration
        mode: 'pro',
        multi_shots: false,
        sound: false,
        aspect_ratio: '9:16', // Reels size
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
async function replicateAPI(imageUrl, prompt, negativePrompt) {
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
        negative_prompt: negativePrompt || 'nudity, revealing, changed outfit, modified clothing, removed headscarf, slit, leg slit, torn clothing, deformed leg',
        duration: 5,
        aspect_ratio: '9:16', // Reels size
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
async function klingDirectAPI(imageUrl, prompt, negativePrompt) {
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
      negative_prompt: negativePrompt || 'nudity, revealing clothing, changed outfit, modified clothing, slit, leg slit, torn clothing, deformed leg',
      duration: '5',
      mode: 'std',
      aspect_ratio: '9:16', // Reels size
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
