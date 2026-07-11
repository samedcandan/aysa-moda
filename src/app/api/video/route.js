import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVideo } from '@/lib/kling';
import { uploadToImgBB } from '@/lib/imgbb';
import { Jimp } from 'jimp';
import { generateBackground, removeBackground } from '@/lib/fal';
import { extractBackgroundPrompt } from '@/lib/prompt-helper';

// Kling tetikleme + 9:16 dönüşüm
export const maxDuration = 120;

/**
 * Görseli 9:16 (1080x1920) Reels formatına dönüştürür.
 * Kling image-to-video modunda görselin boyutlarını referans aldığı için
 * görseli önceden dikey formata çevirmek video çıktısının Reels olmasını garanti eder.
 */
async function convertToReelsFormat(imageUrl) {
  try {
    const REELS_W = 1080;
    const REELS_H = 1920;

    const srcImg = await Jimp.read(imageUrl);
    const srcW = srcImg.bitmap.width;
    const srcH = srcImg.bitmap.height;
    const srcRatio = srcW / srcH;
    const targetRatio = REELS_W / REELS_H; // 0.5625

    // Zaten 9:16'ya yakınsa dönüştürmeye gerek yok
    if (Math.abs(srcRatio - targetRatio) < 0.05) {
      console.log('[Video] Image already ~9:16, skipping conversion');
      return imageUrl;
    }

    // Görseli 9:16 kanvasa sığdır (contain — kırpmadan)
    let fitW, fitH;
    if (srcRatio > targetRatio) {
      // Görsel daha geniş — genişliğe sığdır
      fitW = REELS_W;
      fitH = Math.round(REELS_W / srcRatio);
    } else {
      // Görsel daha uzun — yüksekliğe sığdır
      fitH = REELS_H;
      fitW = Math.round(REELS_H * srcRatio);
    }

    srcImg.resize({ w: fitW, h: fitH });

    // Siyah kanvas oluştur ve görseli alt-ortala (ayaklar tabanda)
    const canvas = new Jimp({ width: REELS_W, height: REELS_H, color: 0x000000ff });
    const offsetX = Math.round((REELS_W - fitW) / 2);
    const offsetY = REELS_H - fitH; // alt hizalama
    canvas.composite(srcImg, offsetX, offsetY);

    // Buffer'a çevir ve ImgBB'ye yükle
    const buffer = await canvas.getBuffer('image/jpeg');
    const base64 = buffer.toString('base64');
    const reelsUrl = await uploadToImgBB(base64);
    console.log('[Video] Converted to 9:16 Reels format');
    return reelsUrl;
  } catch (err) {
    console.error('[Video] Reels conversion failed, using original:', err.message);
    return imageUrl; // Hata durumunda orijinal görseli kullan
  }
}

/**
 * Şeffaf manken görselini üretilen dinamik arka plana yerleştirir.
 */
async function compositeModelOnBackground({ transparentImageUrl, backgroundImageUrl }) {
  try {
    const REELS_W = 1080;
    const REELS_H = 1920;

    const [bgImg, srcImg] = await Promise.all([
      Jimp.read(backgroundImageUrl),
      Jimp.read(transparentImageUrl)
    ]);

    const srcW = srcImg.bitmap.width;
    const srcH = srcImg.bitmap.height;
    const srcRatio = srcW / srcH;
    const targetRatio = REELS_W / REELS_H;

    let fitW, fitH;
    if (srcRatio > targetRatio) {
      fitW = REELS_W;
      fitH = Math.round(REELS_W / srcRatio);
    } else {
      fitH = REELS_H;
      fitW = Math.round(REELS_H * srcRatio);
    }

    srcImg.resize({ w: fitW, h: fitH });

    const offsetX = Math.round((REELS_W - fitW) / 2);
    const offsetY = REELS_H - fitH; // alt hizalama (ayaklar yerde)

    bgImg.composite(srcImg, offsetX, offsetY);

    const buffer = await bgImg.getBuffer('image/jpeg');
    const base64 = buffer.toString('base64');
    return await uploadToImgBB(base64);
  } catch (err) {
    console.error('[Video] Compositing error, falling back to original:', err.message);
    throw err; // retry logic handles it by falling back to black canvas
  }
}

async function translateToEnglish(text) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY || !text?.trim()) return text || '';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion video prompt translator. Translate Turkish to English for an AI video generator. RULES: 1) The garment in the video must be IDENTICAL to the input image - same design, buttons, seams, pleats, length, proportions. Never describe the garment differently from what is shown. 2) Fabric must be 100% opaque, solid, non-transparent. NEVER use: chiffon, sheer, tulle, lace, organza, transparent, see-through. Replace with: solid crepe, thick satin, opaque cotton. 3) If hijab/tesettür mentioned, ensure hair/neck/arms remain fully covered. 4) CRITICAL: Put the environment/scene description at the VERY BEGINNING of the translated prompt, before the model/garment description. The scene must be established from frame 1. 5) Keep the translation concise and direct. Output ONLY the English translation.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (translated) return translated;
  } catch (err) {
    console.error('[Video] Translation failed:', err);
  }
  return text;
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const {
      frontDressedUrl,   // Giydirilmiş manken (ön) — VTON veya kullanıcı fotoğrafı
      backDressedUrl,    // Giydirilmiş manken (arka) — opsiyonel
      category,
      customPrompt,
      motionType,
      modelId,
      bodySize,
      isDirectMode,
      isRetry,           // true ise: 2. run, kredi düşülmez
      fabric,            // Kumaş türü (örn: Keten)
      // DB için orijinal görsel URL'leri
      garmentFrontUrl,
      humanFrontUrl,
      garmentBackUrl,
      isAlreadyComposited,
    } = await request.json();

    const user = await prisma.modaUser.findUnique({ where: { id: session.userId } });
    if (!user || !user.id) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    // Kredi kontrolü sadece 1. run için
    if (!isRetry && user.credits < 1) return NextResponse.json({ error: 'Yetersiz bakiye.' }, { status: 403 });

    if (!frontDressedUrl || !category) {
      return NextResponse.json({ error: 'Eksik parametre.' }, { status: 400 });
    }

    const isRotation = motionType === 'rotation';

    // Prompt hazırlama
    const translatedPrompt = await translateToEnglish(customPrompt);
    const cinematicSuffix = isDirectMode
      ? 'From the very first frame, the model is already inside the described environment with NO white or plain background visible at any point. Photorealistic video, natural environment lighting, cinematic depth of field, realistic shadows on ground, 8K quality.'
      : 'From the very first frame, the model is already inside the described environment with NO white or plain background visible at any point. Photorealistic, cinematic depth of field, natural environmental lighting, realistic depth and parallax, natural shadows and ground contact, 8K quality.';

    const finalPrompt = `${translatedPrompt} ${cinematicSuffix}`.trim();
    console.log('[Video] Final prompt:', finalPrompt);

    // Görselleri 9:16 (Reels) formatına dönüştür
    // Kling image-to-video modunda görselin boyutlarını referans alır,
    // bu yüzden görseli önceden 9:16'ya dönüştürmeliyiz
    const rawImages = (isRotation && backDressedUrl)
      ? [frontDressedUrl, backDressedUrl]
      : [frontDressedUrl];

    let imagesToPass;
    if (isAlreadyComposited) {
      console.log('[Video] Images are already composited on dynamic background.');
      imagesToPass = rawImages;
    } else {
      try {
        console.log('[Video] Starting dynamic background generation and compositing...');
        // 1. Ortam tanımını ayıkla
        const bgPrompt = await extractBackgroundPrompt(customPrompt);
        // 2. Flux ile 9:16 arka plan üret
        const bgUrl = await generateBackground({ prompt: bgPrompt });
        // 3. Manken arka planlarını Bria ile sil ve üretilen arka plana bindir
        imagesToPass = await Promise.all(rawImages.map(async (imgUrl) => {
          console.log('[Video] Removing background for VTON output:', imgUrl);
          const transparentUrl = await removeBackground({ imageUrl: imgUrl });
          console.log('[Video] Compositing model onto dynamic background...');
          return await compositeModelOnBackground({
            transparentImageUrl: transparentUrl,
            backgroundImageUrl: bgUrl
          });
        }));
        console.log('[Video] Dynamic background compositing completed successfully!');
      } catch (err) {
        console.error('[Video] Dynamic background compositing failed. Falling back to black canvas:', err.message);
        imagesToPass = await Promise.all(rawImages.map(url => convertToReelsFormat(url)));
      }
    }

    console.log('[Video] Triggering Kling with', imagesToPass.length, '9:16 image(s)...');
    const { taskId } = await createVideo(imagesToPass, category, finalPrompt, modelId, fabric);
    console.log('[Video] Kling task created:', taskId);

    // DB kayıt
    let generationId;
    if (isRetry) {
      // 2. run — kredi düşme, mevcut kaydı güncelle
      const existing = await prisma.modaGeneration.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await prisma.modaGeneration.update({
          where: { id: existing.id },
          data: { runCount: 2, retryTaskId: taskId, status: 'PROCESSING', updatedAt: new Date() },
        });
        generationId = existing.id;
      }
    } else {
      // 1. run — kredi düş + yeni kayıt
      await prisma.$transaction(async (tx) => {
        await tx.modaUser.update({
          where: { id: user.id },
          data: { credits: { decrement: 1 } },
        });
        const gen = await tx.modaGeneration.create({
          data: {
            id: taskId,
            userId: user.id,
            category,
            frontGarmUrl: garmentFrontUrl || humanFrontUrl || frontDressedUrl,
            backGarmUrl: garmentBackUrl || garmentFrontUrl || humanFrontUrl || frontDressedUrl,
            modelId: isDirectMode ? 'own_model' : (modelId || 'melisa'),
            bodySize: bodySize || 'STANDARD',
            backgroundId: 'dynamic',
            status: 'PROCESSING',
            runCount: 1,
          },
        });
        generationId = gen.id;
      });
    }

    return NextResponse.json({
      success: true,
      taskId,
      generationId,
      creditsLeft: isRetry ? user.credits : user.credits - 1,
    });


  } catch (error) {
    console.error('[Video] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Video oluşturma sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
