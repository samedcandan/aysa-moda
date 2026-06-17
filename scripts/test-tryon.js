const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  });
}

async function test() {
  console.log('════════════════════════════════════════════');
  console.log(' FASHN VIRTUAL TRY-ON v1.6 TEST SCRIPT');
  console.log('════════════════════════════════════════════');
  
  const FAL_API_KEY = process.env.FAL_API_KEY;
  console.log('FAL_API_KEY status:', FAL_API_KEY ? '✅ DEFINED (loaded from .env.local)' : '❌ UNDEFINED');
  
  if (!FAL_API_KEY) {
    console.error('Hata: Lütfen .env.local dosyasına FAL_API_KEY değerini ekleyin.');
    return;
  }

  // Mock inputs: standard model and garment image URLs
  const humanUrl = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800';
  const garmentUrl = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800';
  const category = 'tops';

  console.log('Sending VTON request to Fal.ai queue...');
  console.log('- Model Image:', humanUrl);
  console.log('- Garment Image:', garmentUrl);
  console.log('- Category:', category);

  try {
    const response = await fetch('https://queue.fal.run/fal-ai/fashn/tryon/v1.6', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_image: humanUrl,
        garment_image: garmentUrl,
        category: category,
        garment_photo_type: 'auto',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Fal.ai queue request failed.');
    }

    const statusUrl = data.status_url;
    console.log(`Task queued successfully. Status URL: ${statusUrl}`);
    console.log('Polling queue status...');

    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      attempts++;
      const statusRes = await fetch(statusUrl, {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
        },
      });

      const statusData = await statusRes.json();
      console.log(`- Attempt ${attempts}: Status is "${statusData.status}"`);

      if (statusData.status === 'COMPLETED') {
        console.log('\n✅ Success!');
        let result = statusData.outputs;
        if (!result && statusData.response_url) {
          const responseRes = await fetch(statusData.response_url, {
            headers: {
              'Authorization': `Key ${FAL_API_KEY}`,
            },
          });
          result = await responseRes.json();
        }
        const imageUrl = result?.image?.url || result?.images?.[0]?.url;
        console.log('Result Image URL:', imageUrl);
        return;
      } else if (statusData.status === 'FAILED') {
        throw new Error(`Fal.ai processing failed: ${statusData.error || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Operation timed out.');
  } catch (err) {
    console.error('\n❌ Test Failed:', err.message);
  }
}

test();
