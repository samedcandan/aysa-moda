import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Geçerli kategori ID'leri (page.js ile senkronize)
const VALID_CATEGORY_IDS = [
  'gelinlik', 'abiye', 'elbise', 'gomlek', 'straplez', 'askili',
  'tisort', 'kazak', 'ceket', 'trenckot', 'mont', 'pelus', 'kurk',
  'pantolon', 'etek'
];

const VALID_MOTION_IDS = ['rotation', 'walk', 'pose', 'breeze'];

export async function POST(request) {
  try {
    const { imageBase64, gender } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Görsel gereklidir.' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API anahtarı yapılandırılmamış.' }, { status: 500 });
    }

    // Base64 data URL'den sadece base64 kısmını al
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mimeType = imageBase64.includes('data:image/') 
      ? imageBase64.split(';')[0].replace('data:', '') 
      : 'image/jpeg';

    const genderNote = gender === 'MEN' 
      ? 'Bu erkek giyim bir kıyafettir.' 
      : 'Bu kadın giyim bir kıyafettir.';

    const systemPrompt = `Sen bir moda uzmanısın. Sana verilen kıyafet görselini analiz et ve aşağıdaki JSON formatında yanıt ver.
Sadece JSON döndür, başka hiçbir şey yazma.

Kurallar:
- categoryId şunlardan biri olmalı: gelinlik, abiye, elbise, gomlek, straplez, askili, tisort, kazak, ceket, trenckot, mont, pelus, kurk, pantolon, etek
- motionId şunlardan biri olmalı: rotation (360° dönüş), walk (podyum yürüyüşü), pose (zarif pozlar), breeze (rüzgar duruşu)
- productType Türkçe, kıyafetin genel adı (örn: Gömlek, Ceket, Pantolon, Abiye Elbise)
- color Türkçe, ana renk (örn: Lacivert, Siyah, Kırmızı, Haki)
- clothingType Türkçe, giyim türü. Sadece şu üç değerden biri olmalı: "Üst Giyim", "Alt Giyim", "Full Giyim"
- fabric Türkçe, kumaş türü (örn: Keten, Pamuk, İpek, Kot, Şifon, Saten, Dantel, Kadife, Yün)
- promptSuggestion Türkçe olmalı. Kıyafeti (türünü, rengini, giyim tipini, kumaşını, detaylarını) ve önerilen hareketi (motionId'ye uygun olarak mankenin yapacağı eylemleri, örn. yavaşça 360 derece dönerek kıyafeti sergilemesi, podyumda yürümesi veya rüzgarda dalgalanması) birleştiren doğal, akıcı ve profesyonel bir video tanıtım promptu olmalıdır. Kıyafetin hareket/akış durumunu ve rüzgar esintisi gibi detayları doğrudan bu promptSuggestion içerisinde eylem olarak betimle.
- Kadraj ve Odak Noktası Kuralları: Tespit edilen clothingType değerine göre promptSuggestion içinde kameranın kadrajı ve odak noktası mutlaka belirtilmelidir:
  * "Üst Giyim" için: Video üst vücuda odaklanmış yakın/orta çekim (upper body focus, medium close-up, chest-up details) olarak betimlenmeli, yaka/omuz detayları vurgulanmalıdır.
  * "Alt Giyim" için: Video alt vücuda odaklanmış bacak/pantolon/etek yakın çekim (lower body focus, waist-down showcase) olarak betimlenmeli, kalıp/kesim detayları vurgulanmalıdır.
  * "Full Giyim" için: Video baştan ayağa tüm vücudu ve elbisenin tamamını gösteren boydan çekim (full body showcase, head-to-toe framing) olarak betimlenmeli, genel silüet vurgulanmalıdır.
  Bu kadraj yönlendirmesini promptSuggestion metninin içerisine doğal ve akıcı bir şekilde yerleştir.

${genderNote}

Yanıt formatı:
{
  "productType": "string",
  "categoryId": "string",
  "color": "string",
  "clothingType": "string",
  "fabric": "string",
  "motionId": "string",
  "promptSuggestion": "string"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                  detail: 'low', // Maliyet tasarrufu için low detail
                },
              },
              {
                type: 'text',
                text: 'Bu kıyafeti analiz et ve JSON formatında döndür.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[Analyze Garment] OpenAI API error:', errData);
      throw new Error('GPT-4o analiz hatası: ' + (errData.error?.message || response.status));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('GPT-4o boş yanıt döndürdü.');
    }

    // JSON parse
    let result;
    try {
      // Bazen ```json ... ``` ile sarılı gelebilir
      const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error('[Analyze Garment] JSON parse error:', content);
      throw new Error('GPT-4o yanıtı ayrıştırılamadı.');
    }

    // Güvenlik: geçersiz ID'leri fallback'e çek
    if (!VALID_CATEGORY_IDS.includes(result.categoryId)) {
      result.categoryId = gender === 'MEN' ? 'tisort' : 'elbise';
    }
    if (!VALID_MOTION_IDS.includes(result.motionId)) {
      result.motionId = 'rotation';
    }

    console.log('[Analyze Garment] Analysis complete:', result.categoryId, result.motionId);
    return NextResponse.json(result);

  } catch (err) {
    console.error('[Analyze Garment] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Analiz başarısız oldu.' }, { status: 500 });
  }
}
