/**
 * Fal.ai IDM-VTON (Virtual Try-On) API Client
 * 
 * Kıyafet fotoğraflarını mankenler üzerine giydirir.
 */

export async function runVirtualTryOn({ humanUrl, garmentUrl, category }) {
  const FAL_API_KEY = process.env.FAL_API_KEY;
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY ortam değişkeni tanımlı değil. Lütfen .env.local dosyasını güncelleyin.');
  }

  // Map our UI categories to Fashn VTON categories (one-pieces, tops, bottoms, auto)
  let falCategory = 'auto'; // default to auto
  if (category === 'pantolon' || category === 'etek') {
    falCategory = 'bottoms';
  } else if (
    category === 'tisort' ||
    category === 'ceket' ||
    category === 'trenckot' ||
    category === 'kazak' ||
    category === 'gomlek' ||
    category === 'askili' ||
    category === 'mont' ||
    category === 'pelus' ||
    category === 'kurk'
  ) {
    falCategory = 'tops';
  } else if (category === 'gelinlik' || category === 'abiye' || category === 'elbise' || category === 'straplez') {
    falCategory = 'one-pieces';
  }

  console.log(`[Fal VTON] Starting try-on with Fashn v1.6. Category: ${falCategory}, Model: ${humanUrl}`);

  const response = await fetch('https://queue.fal.run/fal-ai/fashn/tryon/v1.6', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_image: humanUrl,
      garment_image: garmentUrl,
      category: falCategory,
      garment_photo_type: 'auto',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Fal.ai try-on başlatma hatası.');
  }

  const statusUrl = data.status_url;
  console.log(`[Fal VTON] Task queued. Status URL: ${statusUrl}`);

  // Polling queue status
  let attempts = 0;
  const maxAttempts = 30; // 30 * 2s = 60s max
  while (attempts < maxAttempts) {
    attempts++;
    const statusRes = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      console.log(`[Fal VTON] Success after ${attempts} attempts.`);
      let result = statusData.outputs;
      if (!result && statusData.response_url) {
        const responseRes = await fetch(statusData.response_url, {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        });
        result = await responseRes.json();
      }
      if (result) {
        const imageUrl = result.image?.url || result.images?.[0]?.url;
        if (imageUrl) return imageUrl;
      }
      throw new Error('Fal.ai try-on çıktısı alınamadı.');
    } else if (statusData.status === 'FAILED') {
      throw new Error(`Fal.ai try-on işlemi başarısız oldu: ${statusData.error || 'Bilinmeyen hata'}`);
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Fal.ai try-on işlemi zaman aşımına uğradı.');
}

/**
 * Fal.ai Bria RMBG 2.0 (Background Removal) API Client
 * 
 * Görselin arka planını temizler ve şeffaf hale getirir.
 * @param {object} params
 * @param {string} params.imageUrl
 * @returns {Promise<string>} Transparent image URL
 */
export async function removeBackground({ imageUrl }) {
  const FAL_API_KEY = process.env.FAL_API_KEY;
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY ortam değişkeni tanımlı değil. Lütfen .env.local dosyasını güncelleyin.');
  }

  console.log(`[Fal Background Remove] Submitting job for: ${imageUrl}`);

  const response = await fetch('https://queue.fal.run/fal-ai/bria/background/remove', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Fal.ai arka plan temizleme başlatma hatası.');
  }

  const statusUrl = data.status_url;
  console.log(`[Fal Background Remove] Task queued. Status URL: ${statusUrl}`);

  // Polling queue status
  let attempts = 0;
  const maxAttempts = 30; // 30 * 2s = 60s max
  while (attempts < maxAttempts) {
    attempts++;
    const statusRes = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      console.log(`[Fal Background Remove] Success after ${attempts} attempts.`);
      let result = statusData.outputs;
      if (!result && statusData.response_url) {
        const responseRes = await fetch(statusData.response_url, {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        });
        result = await responseRes.json();
      }
      if (result) {
        const transparentImageUrl = result.image?.url || result.images?.[0]?.url;
        if (transparentImageUrl) return transparentImageUrl;
      }
      throw new Error('Fal.ai arka plan temizleme çıktısı alınamadı.');
    } else if (statusData.status === 'FAILED') {
      throw new Error(`Fal.ai arka plan temizleme işlemi başarısız oldu: ${statusData.error || 'Bilinmeyen hata'}`);
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Fal.ai arka plan temizleme işlemi zaman aşımına uğradı.');
}

/**
 * Fal.ai Flux Schnell API Client
 * 
 * 1080x1920 (9:16) boyutunda boş, yüksek kaliteli ve derin 3D arka plan üretir.
 * @param {object} params
 * @param {string} params.prompt - Arka planın betimlemesi
 * @returns {Promise<string>} Generated image URL
 */
export async function generateBackground({ prompt }) {
  const FAL_API_KEY = process.env.FAL_API_KEY;
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY ortam değişkeni tanımlı değil. Lütfen .env.local dosyasını güncelleyin.');
  }

  // Kaliteli ortam üretimi için ek direktifler enjekte ediyoruz (insan, manken veya yazı olmamalıdır)
  const cleanPrompt = (prompt || 'empty minimalist high-end studio showroom, cinematic volumetric lighting, soft depth of field, photorealistic, 8k').trim();
  const enhancedPrompt = `${cleanPrompt}, empty scene, no people, no models, no mannequin, no text, clean floor, highly detailed architecture, cinematic volumetric lighting, realistic shadows, photorealistic, 8k quality, 3d space with depth.`;

  console.log(`[Fal Background Generate] Submitting job to flux/schnell. Prompt: ${enhancedPrompt}`);

  const response = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      image_size: { width: 1080, height: 1920 },
      sync_mode: false,
      num_inference_steps: 4,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Fal.ai arka plan üretimi başlatma hatası.');
  }

  const statusUrl = data.status_url;
  console.log(`[Fal Background Generate] Task queued. Status URL: ${statusUrl}`);

  // Polling queue status
  let attempts = 0;
  const maxAttempts = 30; // 30 * 1.5s = 45s max
  while (attempts < maxAttempts) {
    attempts++;
    const statusRes = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      console.log(`[Fal Background Generate] Success after ${attempts} attempts.`);
      let result = statusData.outputs;
      if (!result && statusData.response_url) {
        const responseRes = await fetch(statusData.response_url, {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        });
        result = await responseRes.json();
      }
      if (result) {
        const bgUrl = result.image?.url || result.images?.[0]?.url;
        if (bgUrl) return bgUrl;
      }
      throw new Error('Fal.ai arka plan üretimi çıktısı alınamadı.');
    } else if (statusData.status === 'FAILED') {
      throw new Error(`Fal.ai arka plan üretimi başarısız oldu: ${statusData.error || 'Bilinmeyen hata'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error('Fal.ai arka plan üretimi zaman aşımına uğradı.');
}

