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
    const { imageBase64, gender, modelId } = await request.json();

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

    let genderNote = gender === 'MEN' 
      ? 'Bu erkek giyim bir kıyafettir. Model mutlaka ayağına kıyafetin tarzına uygun şık erkek ayakkabıları (şık deri makosenler, oxford ayakkabılar veya spor şık sneakers) giymelidir. promptSuggestion içinde bunu mutlaka belirt: "kombine ve tarza uygun şık erkek ayakkabıları giymektedir".' 
      : 'Bu kadın giyim bir kıyafettir. Model mutlaka ayağına kıyafetin tarzına ve ortama uyumlu zarif yüksek topuklu ayakkabılar (stilettolar veya şık yüksek topuklu ayakkabılar) giymelidir. promptSuggestion içinde bunu mutlaka belirt: "şık ve zarif yüksek topuklu ayakkabılar giymektedir".';

    // Hüma modeli (tesettürlü) seçildiğinde güçlü tesettür kuralları ekle
    if (modelId === 'huma') {
      genderNote += `

🧕 TESETTÜR KURALI (KRİTİK VE ZORUNLU — HÜMA MODELİ SEÇİLDİ):
- Model kesinlikle tesettürlü olmalıdır. Şık ve modern bir tesettür başörtüsü (şal/eşarp) takmaktadır.
- Saçlar, boyun, omuzlar ve kollar TÜM VİDEO BOYUNCA, HER AÇIDAN (ön, yan, arka) TAMAMEN ÖRTÜLÜDÜR.
- Kollar tamamen uzun kollu olmalıdır, yaka kapalıdır, kesinlikle ten görünmez.
- promptSuggestion'da MUTLAKA şunu belirt: "Model şık bir tesettür başörtüsü takmaktadır, saçlar ve boyun tamamen örtülüdür, kollar uzun kolludur, yaka kapalıdır"
- Bu kural her şeyin üstündedir ve promptSuggestion'da mutlaka yer almalıdır!`;
    }

    const systemPrompt = `Sen bir moda uzmanısın. Sana verilen kıyafet görselini analiz et ve aşağıdaki JSON formatında yanıt ver.
Sadece JSON döndür, başka hiçbir şey yazma.

Kurallar:
- categoryId şunlardan biri olmalı: gelinlik, abiye, elbise, gomlek, straplez, askili, tisort, kazak, ceket, trenckot, mont, pelus, kurk, pantolon, etek
- motionId şunlardan biri olmalı (Yürüyüş ve dönüş hareketleri, arka plan derinlik uyumu ve gerçekçilik açısından her zaman önceliklidir): walk (podyum yürüyüşü - en çok tercih edilen), rotation (360° dönüş - tüm kombini göstermek için), pose (zarif pozlar), breeze (rüzgar duruşu)
- productType Türkçe, kıyafetin genel adı (örn: Gömlek, Ceket, Pantolon, Abiye Elbise)
- color Türkçe, ana renk (örn: Lacivert, Siyah, Kırmızı, Haki)
- clothingType Türkçe, giyim türü. Sadece şu üç değerden biri olmalı: "Üst Giyim", "Alt Giyim", "Full Giyim"
- fabric Türkçe, kumaş türü (örn: Keten, Pamuk, İpek, Kot, Saten, Kadife, Yün). Kesinlikle "Şifon", "Tül", "Dantel", "Organze", "File" gibi transparan kumaş isimleri seçilmemeli ve yazılmamalıdır.

🔒 DEKOLTAJ VE AÇIKLIK YASAĞI (KRİTİK):
- promptSuggestion içinde model kesinlikle edepli, kapalı ve profesyonel giyinmiş olarak betimlenmelidir.
- Derin dekolte, açık göğüs, meme ucu belirginliği, aşırı açıklık kesinlikle YASAKTIR.
- Straplez veya askılı kıyafetlerde bile göğüs bölgesi tamamen kapalı ve düzgün örtülmüş olarak betimlenmeli, hiçbir şekilde derin yırtmaç veya göğüs açıklığı önerilmemelidir.
- promptSuggestion'a şu tarz ifadeler mutlaka ekle: "göğüs bölgesi tamamen kapalı, edepli ve profesyonel duruş"
- Negative prompt yönergesi olarak videoda kesinlikle şunlar olmamalı: deep neckline, exposed cleavage, visible nipples, revealing top, low-cut, plunging neckline, bare chest, exposed breast

👕➡️👖 KOMBİN KURALI — ÜST GİYİM (KRİTİK):
- Eğer clothingType "Üst Giyim" ise: promptSuggestion'da modele bu üst giyime yakışan şık ve uyumlu bir ALT GİYİM (pantolon, etek, jean vb.) kombinlenmeli.
- ÖNEMLİ: Kombinlenen alt giyim, satılan üst giyimi kesinlikle KAPATMAMALI veya ÖRTMEMELİDİR. Üstüne ceket, mont, hırka, palto gibi üst giyimi kapatan parçalar ÖNERİLMEMELİDİR.
- Satılan üst giyim kesinlikle alt giyimin (pantolon/jean) içine sokulmamalı, dışarıya salınmış olmalıdır (untucked). promptSuggestion içinde bunu mutlaka belirt: "ürün pantolonun dışına salınmıştır (untucked) ve alt bitiş detayları tamamen görünmektedir".
- Alt giyim sade, nötr ve üst giyimi ön plana çıkaracak şekilde seçilmeli (örn: "sade yüksek bel siyah pantolon", "şık koyu renk slim-fit jean", "zarif kalem etek").
- Üst giyim videonun YILDIZI olmalı, kombin onu desteklemeli.

👖➡️👕 KOMBİN KURALI — ALT GİYİM (KRİTİK):
- Eğer clothingType "Alt Giyim" ise: promptSuggestion'da modele bu alt giyime yakışan şık ve uyumlu bir ÜST GİYİM (bluz, tişört, gömlek vb.) kombinlenmeli.
- ÖNEMLİ: Kombinlenen üst giyim, satılan alt giyimi (pantolon/etek) kesinlikle KAPATMAMALI veya ÖRTMEMELİDİR. Uzun ceket, palto, uzun hırka gibi alt giyimi kapatan/örten parçalar ÖNERİLMEMELİDİR.
- Satılan alt giyimin bel, düğme ve cep detaylarını kapatmaması için kombinlenen üst giyim mutlaka pantolonun/eteğin içine sokulmuş (tucked-in) veya kısa crop tarzında olmalıdır. promptSuggestion içinde bunu mutlaka belirt: "kombinlenen üst giyim pantolonun içine sokulmuştur (tucked-in)".
- Üst giyim sade, nötr ve alt giyimi ön plana çıkaracak şekilde seçilmeli (örn: "sade beyaz basic tişört", "şık siyah crop bluz", "düz renk ince gömlek").
- Alt giyim videonun YILDIZI olmalı, kombin onu desteklemeli.

👗 FULL GİYİM KURALI:
- Eğer clothingType "Full Giyim" (elbise, gelinlik, abiye vb.) ise: Ek kombin parçası gerekmez, kıyafetin tamamı zaten tek parça. Modelin aksesuarları (çanta vb.) sade ve kıyafete uygun olmalı.

👠 AYAKKABI KURALI (KRİTİK):
- Modelin çıplak ayaklı görünmesini veya ayakkabısız olmasını kesinlikle engellemek için promptSuggestion içinde giydiği ayakkabılar MUTLAKA tanımlanmalıdır.
- Eğer model kadınsa (WOMEN): Model mutlaka kıyafetle uyumlu zarif yüksek topuklu ayakkabılar (stilettolar veya şık yüksek topuklu ayakkabılar) giyiyor olmalıdır. promptSuggestion'a "şık ve zarif yüksek topuklu ayakkabılar giymektedir" ibaresini ekle.
- Eğer model erkekse (MEN): Model kıyafete ve ortama uygun şık erkek ayakkabıları (deri makosen, oxford veya spor şık sneakers) giyiyor olmalıdır. promptSuggestion'a "kombine ve tarza uygun şık erkek ayakkabıları giymektedir" ibaresini ekle.

🌍 ORTAM VE MEKAN KURALI (KRİTİK VE ZORUNLU):
- promptSuggestion içinde kıyafetin tarzına, rengine, mevsimine ve amacına en uygun yaratıcı 3D mekanı MUTLAKA hayal et ve detaylıca betimle.
- Bu kural ZORUNLUDUR, ortamsız prompt kabul edilmez!
- Ortam örnekleri: lüks otel lobisi, karlı Paris caddeleri, kumsalda gün batımı, modern tenis kortu, minimalist sanat galerisi, şık butik iç mekanı, moda podyumu, lüks bahçe yolu, yağmurlu sokak, Boğaz manzaralı teras vb.
- Ortamı düz bir "arka plan görseli" gibi DEĞİL; derinlik hissi veren, gölgelerin zemine düştüğü, hacimsel ışıklandırmalı gerçek bir 3 boyutlu uzay/mekan (three-dimensional space with depth, realistic shadows cast on floor, volumetric lighting, parallax motion) olarak detaylıca betimle.
- Kıyafetin ruhu ve ortam uyumu çok önemlidir: spor kıyafete şehir sokağı, abiyeye gala salonu, gelinliğe saray bahçesi gibi mantıklı eşleşmeler yap.

- Opaklık ve Kumaş Dokusu Kuralları: Kıyafetin kumaşı kesinlikle transparan yapılmamalı, tamamen opak, tok, kalın ve kapalı olmalıdır. promptSuggestion içerisinde kesinlikle "şifon", "tül", "transparan", "file", "dantel", "organze" kelimelerini kullanma! Bunun yerine "opak krep", "tok saten", "kalın dokuma", "opak pamuk" gibi tok kumaş kelimeleriyle betimle.
- Hareket ve Aksiyon Kuralları (KRİTİK): Modelin durağan pozlar vermesi (sabit duruşlar) arka planla olan 3D derinlik ve paralaks (parallax) uyumunu bozmaktadır. Bu yüzden model KESİNLİKLE durağan durmamalı, ezici çoğunlukla YÜRÜYÜŞ halinde olmalıdır.
- Yürüyüş ve Hareket Kuralları: Modelin podyumda, sokakta veya seçilen ortamda zarif, kendinden emin ve yavaş adımlarla yürüdüğünü, kameraya doğru yaklaştığını, yürürken kıyafetin salınımını (örn: eteğin hafifçe uçuşması, ceket ve kollardaki doğal hareketler) ve ellerinin zarif hareketlerini detaylıca betimle. Yürüyüş esnasında hafif omuz dönüşleri veya omuz üstü bakışlar gibi şık manken hareketleri ekle. promptSuggestion Türkçe, kıyafeti, ortamı, kombini ve hareketi birleştiren doğal, akıcı ve profesyonel bir video tanıtım promptu olmalıdır. Kumaşın kalın, tok ve opak olduğunu da metin içinde belirt.
- KRİTİK BOYUT KORUMA KURALI: promptSuggestion içinde kıyafetin orijinal boyutlarının video boyunca %100 korunması gerektiğini mutlaka vurgula. "Kıyafetin orijinal boyutları, uzunluğu ve oranları birebir korunur" ifadesini ekle.
- Kadraj ve Odak Noktası Kuralları (KRİTİK): Satışı yapılan ürünün (üst giyim veya alt giyim) hiçbir parçası video boyunca kesinlikle kadrajın (ekranın) dışına taşmamalı ve kesilmemelidir. promptSuggestion içinde bunu mutlaka belirt ("tüm kıyafet kadrajın içinde tam olarak görünür").
  * "Üst Giyim" (Tişört, Gömlek, Ceket vb.) için: Kalça hizasından yukarısını gösteren orta çekim (hip-up medium shot). Ürünün omuzları, kolları, yakası ve etek ucu (alt bitiş çizgisi) her zaman tamamen kadrajın içinde ve net olarak görünmelidir. Üst giyimin altı veya yanları kesinlikle kesilmemelidir.
  * "Alt Giyim" (Pantolon, Etek vb.) için: Bel hizasından ayaklara kadar olan alt vücut çekimi veya tam boy çekim. Ürünün beli, kalçası, paçaları/etek ucu ve ayakkabılarla birleştiği yer her zaman tamamen kadrajın içinde ve görünür olmalıdır. Ürünün altı veya üstü kesinlikle kesilmemelidir.
  * "Full Giyim" (Elbise, Gelinlik vb.) için: Baştan ayağa tam boy çekim (full-body shot). Elbisenin tamamı her zaman kadrajın içinde olmalıdır.

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
      result.motionId = 'walk';
    }
    // backgroundId kaldırıldı — arka plan artık prompt mühendisliği ile sağlanıyor
    delete result.backgroundId;

    console.log('[Analyze Garment] Analysis complete:', result.categoryId, result.motionId);
    return NextResponse.json(result);

  } catch (err) {
    console.error('[Analyze Garment] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Analiz başarısız oldu.' }, { status: 500 });
  }
}
