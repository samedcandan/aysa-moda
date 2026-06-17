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
  if (category === 'pantolon') {
    falCategory = 'bottoms';
  } else if (category === 'tisort' || category === 'ceket') {
    falCategory = 'tops';
  } else if (category === 'gelinlik' || category === 'abiye') {
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
      return statusData.outputs?.image?.url;
    } else if (statusData.status === 'FAILED') {
      throw new Error(`Fal.ai try-on işlemi başarısız oldu: ${statusData.error || 'Bilinmeyen hata'}`);
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Fal.ai try-on işlemi zaman aşımına uğradı.');
}
