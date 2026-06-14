/**
 * Fal.ai IDM-VTON (Virtual Try-On) API Client
 * 
 * Kıyafet fotoğraflarını mankenler üzerine giydirir.
 */

export async function runVirtualTryOn({ humanUrl, garmentUrl, category, garmentDes }) {
  const FAL_API_KEY = process.env.FAL_API_KEY;
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY ortam değişkeni tanımlı değil. Lütfen .env.local dosyasını güncelleyin.');
  }

  // Map our UI categories to Fal VTON categories
  let falCategory = 'dresses'; // default
  if (category === 'pantolon') {
    falCategory = 'lower_body';
  } else if (category === 'tisort' || category === 'ceket') {
    falCategory = 'upper_body';
  }

  console.log(`[Fal VTON] Starting try-on. Category: ${falCategory}, Model: ${humanUrl}`);

  const response = await fetch('https://queue.fal.run/fal-ai/idm-vton', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      human_image: humanUrl,
      garm_image: garmentUrl,
      garment_des: garmentDes || 'fashion apparel',
      category: falCategory,
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
