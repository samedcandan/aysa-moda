import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVideo } from '@/lib/kling';

// Sadece Kling tetikleme — hızlı, 30s yeterli
export const maxDuration = 60;

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
            content: 'You are a professional fashion translator. Translate the given Turkish fashion video prompt into a high-quality, descriptive English prompt for an AI video generator. Keep all technical terms, lighting, camera movement, and detail references accurate. Output ONLY the English translation, no other text.',
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

    const user = await prisma.modaUser.findUnique({ where: { id: session.userId } });
    if (!user || !user.id) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    // Kredi kontrolü sadece 1. run için
    if (!isRetry && user.credits < 1) return NextResponse.json({ error: 'Yetersiz bakiye.' }, { status: 403 });

    const {
      frontDressedUrl,   // Giydirilmiş manken (ön) — VTON veya kullanıcı fotoğrafı
      backDressedUrl,    // Giydirilmiş manken (arka) — opsiyonel
      category,
      customPrompt,
      motionType,
      modelId,
      bodySize,
      backgroundId,
      isDirectMode,
      isRetry,           // true ise: 2. run, kredi düşülmez
      // DB için orijinal görsel URL'leri
      garmentFrontUrl,
      humanFrontUrl,
      garmentBackUrl,
    } = await request.json();

    if (!frontDressedUrl || !category) {
      return NextResponse.json({ error: 'Eksik parametre.' }, { status: 400 });
    }

    const isRotation = motionType === 'rotation';

    // Prompt hazırlama
    const translatedPrompt = await translateToEnglish(customPrompt);
    const cinematicSuffix = isDirectMode
      ? 'Photorealistic video, natural environment lighting, cinematic depth of field, genuine atmospheric perspective, natural camera motion, realistic shadows cast on ground, 8K quality, no artificial studio look.'
      : 'Photorealistic, cinematic depth of field, natural environmental lighting, background has realistic depth and parallax motion, no flat or studio green screen look, natural shadows and ground contact, 8K quality.';

    const finalPrompt = `${translatedPrompt} ${cinematicSuffix}`.trim();
    console.log('[Video] Final prompt:', finalPrompt);

    // Kling'e gönderilecek görseller
    const imagesToPass = (isRotation && backDressedUrl)
      ? [frontDressedUrl, backDressedUrl]
      : [frontDressedUrl];

    console.log('[Video] Triggering Kling with', imagesToPass.length, 'image(s)...');
    const { taskId } = await createVideo(imagesToPass, category, finalPrompt, modelId);
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
            backgroundId: backgroundId || 'own',
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
