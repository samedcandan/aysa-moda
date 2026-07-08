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
- backgroundId şunlardan biri olmalı:
  * "original" (Sade Stüdyo): Her zaman bu değer seçilmeli ve sade, minimalist stüdyo ortamı planlanmalı.
- productType Türkçe, kıyafetin genel adı (örn: Gömlek, Ceket, Pantolon, Abiye Elbise)
- color Türkçe, ana renk (örn: Lacivert, Siyah, Kırmızı, Haki)
- clothingType Türkçe, giyim türü. Sadece şu üç değerden biri olmalı: "Üst Giyim", "Alt Giyim", "Full Giyim"
- fabric Türkçe, kumaş türü (örn: Keten, Pamuk, İpek, Kot, Şifon, Saten, Dantel, Kadife, Yün)
- Opaklık ve Kumaş Dokusu Kuralları: Kıyafetin kumaşı kesinlikle transparan (iç gösteren, tül, transparan, file, tülbent gibi) yapılmamalı, tamamen opak, tok, kalın ve kapalı olmalıdır. Bu kuralı promptSuggestion içinde de vurgula (örn: "kumaş tamamen opaktır, iç göstermez, orijinal kalın dokusunu korur").
- Ortam (Mekan) Önerisi Kuralı: promptSuggestion içinde mankenin/modelin bulunduğu ortam MUTLAKA betimlenmelidir. Kıyafetin tarzına, türüne ve mevsimine en uygun 3 boyutlu (3D) gerçekçi bir ortam belirle (örneğin kışlık mont için kar yağışlı şık bir kış caddesi, şık bir abiye veya gelinlik için lüks bir balo salonu veya saray koridoru, günlük bir gömlek veya tişört için modern bir açık hava kafesi veya şık şehir caddeleri). Bu ortamı promptSuggestion içerisinde düz bir "arka plan görseli" gibi değil; modelin ve kıyafetin doğrudan içinde bulunduğu, derinlik hissi veren, gölgelerin zemine düştüğü, hacimsel ışıklandırmalı gerçek bir 3 boyutlu uzay/mekan (three-dimensional space with depth, realistic shadows cast on floor, volumetric lighting, parallax motion) olarak detaylıca betimle.
- Hareket ve Aksiyon Kuralları: promptSuggestion içinde model kesinlikle durağan veya sadece ayakta sabit duruyor şekilde betimlenmemelidir. Modelin hareketleri doğal, dinamik ve zarif olmalıdır. Modelin podyumda yürümesi (walking on a runway), kameraya doğru zarif adımlarla yaklaşması (walking gracefully towards the camera), kendi etrafında yavaşça dönerek kıyafetin detaylarını sergilemesi (slowly turning around to showcase outfit details), omuz ve el hareketleriyle kıyafeti sunması gibi zarif model hareketleri (elegant modeling gestures, smooth walking, natural poses) mutlaka hareket/eylem olarak eklenmelidir.
- promptSuggestion Türkçe olmalı. Kıyafeti (türünü, rengini, giyim tipini, kumaşını, detaylarını), yukarıdaki kurallara uygun olarak belirlenen 3D mekanı ve önerilen dinamik hareketi birleştiren doğal, akıcı ve profesyonel bir video tanıtım promptu olmalıdır. Kıyafetin hareket/akış durumunu, arka plan ortamını (yukarıdaki kurala göre önerilen 3D mekanı) ve rüzgar esintisi gibi detayları doğrudan bu promptSuggestion içerisinde eylem ve sahne olarak betimle. Kumaşın kalın, tok ve tamamen opak/iç göstermez olduğunu da metin içinde belirt.
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
  "backgroundId": "string",
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
    const VALID_BACKGROUND_IDS = ['boutique', 'runway', 'street', 'garden', 'original'];
    if (!VALID_BACKGROUND_IDS.includes(result.backgroundId)) {
      result.backgroundId = 'original';
    }

    console.log('[Analyze Garment] Analysis complete:', result.categoryId, result.motionId, result.backgroundId);
    return NextResponse.json(result);

  } catch (err) {
    console.error('[Analyze Garment] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Analiz başarısız oldu.' }, { status: 500 });
  }
}
