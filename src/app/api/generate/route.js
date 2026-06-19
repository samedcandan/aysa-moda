import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { uploadToImgBB } from '@/lib/imgbb';
import { runVirtualTryOn } from '@/lib/fal';
import { createVideo } from '@/lib/kling';

export const maxDuration = 60; // Set Vercel execution limit to 60 seconds

// Helper to translate Turkish fashion prompts to English using OpenAI
async function translateToEnglish(text) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.warn('[Translate] OPENAI_API_KEY missing, using original prompt');
    return text;
  }

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
            content: 'You are a professional fashion translator. Translate the given Turkish fashion video prompt into a high-quality, descriptive English prompt for an AI video generator. Keep all technical terms, lighting, camera movement, and detail references accurate. Output ONLY the English translation, no other text or explanation.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await res.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (translated) {
      console.log('[Translate] Translated prompt:', { original: text, translated });
      return translated;
    }
  } catch (err) {
    console.error('[Translate] Translation failed:', err);
  }
  return text;
}

export async function POST(request) {
  try {
    // 1. Session verification
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen giriş yapın.' }, { status: 401 });
    }

    // Fetch user credit balance
    const user = await prisma.modaUser.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    if (user.credits < 1) {
      return NextResponse.json({ error: 'Yetersiz bakiye. Lütfen paket yükleyin.' }, { status: 403 });
    }

    // 2. Parse request parameters
    const {
      humanFront,   // Base64 or URL of front human (composed with bg)
      humanBack,    // Base64 or URL of back human (composed with bg)
      garmentFront, // Base64 of garment front
      garmentBack,  // Base64 of garment back
      category,
      modelId,
      bodySize,
      backgroundId,
      customPrompt,
      motionType,   // rotation | walk | pose | breeze
    } = await request.json();

    const isRotation = motionType === 'rotation';

    if (!humanFront || !garmentFront || !category) {
      return NextResponse.json({ error: 'Gerekli görsel parametreleri eksik.' }, { status: 400 });
    }
    if (isRotation && (!humanBack || !garmentBack)) {
      return NextResponse.json({ error: '360° dönüş için arka görünüm görselleri gereklidir.' }, { status: 400 });
    }

    console.log(`[Generate Route] Starting generation for user: ${user.email}, motion: ${motionType}`);

    // 3. Upload images to ImgBB
    console.log('[Generate Route] Uploading source images to ImgBB...');
    const uploadPromises = [
      uploadToImgBB(humanFront),
      isRotation ? uploadToImgBB(humanBack) : Promise.resolve(null),
      uploadToImgBB(garmentFront),
      garmentBack ? uploadToImgBB(garmentBack) : Promise.resolve(null),
    ];

    const [humanFrontUrl, humanBackUrl, garmentFrontUrl, garmentBackUrl] = await Promise.all(uploadPromises);

    // 4. Run Fal.ai VTON try-on (conditionally for front & back, or just front)
    let frontDressedUrl;
    let backDressedUrl = null;

    if (isRotation) {
      console.log('[Generate Route] Triggering Fal.ai try-on for Front & Back (rotation)...');
      const [frontRes, backRes] = await Promise.all([
        runVirtualTryOn({
          humanUrl: humanFrontUrl,
          garmentUrl: garmentFrontUrl,
          category,
        }),
        runVirtualTryOn({
          humanUrl: humanBackUrl,
          garmentUrl: garmentBackUrl || garmentFrontUrl,
          category,
        }),
      ]);
      frontDressedUrl = frontRes;
      backDressedUrl = backRes;
    } else {
      console.log('[Generate Route] Triggering Fal.ai try-on for Front only (non-rotation)...');
      frontDressedUrl = await runVirtualTryOn({
        humanUrl: humanFrontUrl,
        garmentUrl: garmentFrontUrl,
        category,
      });
    }

    console.log('[Generate Route] VTON complete. Dressed URLs:', { frontDressedUrl, backDressedUrl });

    // 5. Translate Turkish prompt to English for Kling AI
    console.log('[Generate Route] Translating custom prompt to English if needed...');
    const translatedPrompt = await translateToEnglish(customPrompt);

    // 6. Trigger Kling video generation with start (and optional end) frames
    console.log('[Generate Route] Triggering Kling AI video generation...');
    const imagesToPass = isRotation ? [frontDressedUrl, backDressedUrl] : [frontDressedUrl];
    const { taskId } = await createVideo(imagesToPass, category, translatedPrompt);

    console.log('[Generate Route] Video generation task created. TaskID:', taskId);

    // 7. Deduct 1 credit & Save generation record in database
    await prisma.$transaction(async (tx) => {
      // Deduct credit
      await tx.modaUser.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      });

      // Save generation record
      await tx.modaGeneration.create({
        data: {
          id: taskId, // Use Kling taskId as unique generation ID
          userId: user.id,
          category,
          frontGarmUrl: garmentFrontUrl,
          backGarmUrl: garmentBackUrl || garmentFrontUrl, // DB constraint check
          modelId,
          bodySize,
          backgroundId,
          status: 'PROCESSING',
        },
      });
    });

    return NextResponse.json({
      success: true,
      taskId,
      creditsLeft: user.credits - 1,
    });

  } catch (error) {
    console.error('[Generate Route] Error:', error);
    return NextResponse.json(
      { error: error.message || 'İşlem sırasında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
