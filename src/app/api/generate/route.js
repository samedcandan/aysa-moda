import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { uploadToImgBB } from '@/lib/imgbb';
import { runVirtualTryOn } from '@/lib/fal';
import { createVideo } from '@/lib/kling';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

export const maxDuration = 60; // Set Vercel execution limit to 60 seconds

// Helper to overlay/mask original hijab on VTON dressed output to prevent bare neck/hair/skin hallucinations
async function maskHijab({ originalComposedBase64, dressedImageUrl, modelId, bodySize, view }) {
  try {
    const sizeSuffix = bodySize.toLowerCase() === 'plus_size' ? 'plus' : 'standard';
    const templatePath = path.join(process.cwd(), 'public', 'models', `${modelId}_${sizeSuffix}_${view}.png`);
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`[Hijab Masking] Template not found: ${templatePath}. Skipping masking.`);
      return dressedImageUrl;
    }

    console.log(`[Hijab Masking] Processing ${view} view for model ${modelId}...`);

    // Clean original base64 prefix
    const cleanBase64 = originalComposedBase64.replace(/^data:image\/\w+;base64,/, '');
    const origBuffer = Buffer.from(cleanBase64, 'base64');

    const [templateImg, originalImg, dressedImg] = await Promise.all([
      Jimp.read(templatePath),
      Jimp.read(origBuffer),
      Jimp.read(dressedImageUrl)
    ]);

    // Align dimensions (resize template and original to match dressed output)
    const targetW = dressedImg.bitmap.width;
    const targetH = dressedImg.bitmap.height;

    templateImg.resize({ w: targetW, h: targetH });
    originalImg.resize({ w: targetW, h: targetH });

    // Define percentage bounding box for head/neck/chest area
    const startX = Math.round(targetW * 0.25);
    const width = Math.round(targetW * 0.50);
    const startY = Math.round(targetH * 0.12);
    const height = Math.round(targetH * 0.35); // covers from Y=12% to Y=47% of image height

    console.log(`[Hijab Masking] Bounding Box: X[${startX}-${startX+width}], Y[${startY}-${startY+height}]`);

    let maskedPixelsCount = 0;
    for (let y = startY; y < startY + height; y++) {
      if (y >= targetH) break;
      for (let x = startX; x < startX + width; x++) {
        if (x >= targetW) break;

        const color = templateImg.getPixelColor(x, y);
        const alpha = color & 0xff; // Extract alpha from 0xRRGGBBAA

        // If template pixel is part of the model (opaque head/hijab/neck area)
        if (alpha > 50) {
          const origColor = originalImg.getPixelColor(x, y);
          dressedImg.setPixelColor(origColor, x, y);
          maskedPixelsCount++;
        }
      }
    }

    console.log(`[Hijab Masking] Overlay complete. Masked ${maskedPixelsCount} pixels.`);

    // Get buffer and upload to ImgBB
    const outBuffer = await dressedImg.getBuffer('image/jpeg');
    const outBase64 = outBuffer.toString('base64');
    const newUrl = await uploadToImgBB(outBase64);
    
    console.log(`[Hijab Masking] Successfully masked & uploaded: ${newUrl}`);
    return newUrl;

  } catch (error) {
    console.error(`[Hijab Masking] Error during ${view} view masking:`, error);
    return dressedImageUrl;
  }
}

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
            content: 'You are a professional fashion translator. Translate the given Turkish fashion video prompt into a high-quality, descriptive English prompt for an AI video generator. Keep all technical terms, lighting, camera movement, and detail references accurate. Pay special attention to modesty and hijab requirements: if the prompt describes a hijab (tesettür, başörtüsü), ensure the English translation clearly specifies that all hair, neck, shoulders, and arms must remain fully covered at all times and from all camera angles, without any exposure of skin or undergarments. Output ONLY the English translation, no other text or explanation.'
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
      humanFront,   // Base64 or URL of front human (mannequin template OR user's own photo)
      humanBack,    // Base64 or URL of back human
      garmentFront, // Base64 of garment front (only in VTON mode)
      garmentBack,  // Base64 of garment back (only in VTON mode)
      category,
      modelId,
      bodySize,
      backgroundId,
      customPrompt,
      motionType,   // rotation | walk | pose | breeze
      directMode,   // boolean — true: skip VTON, animate user's own photo directly
    } = await request.json();

    const isRotation = motionType === 'rotation';
    const isDirectMode = !!directMode;

    if (!humanFront || !category) {
      return NextResponse.json({ error: 'Gerekli görsel parametreleri eksik.' }, { status: 400 });
    }
    if (!isDirectMode && !garmentFront) {
      return NextResponse.json({ error: 'VTON modu için kıyafet görseli gereklidir.' }, { status: 400 });
    }
    if (isRotation && !humanBack) {
      return NextResponse.json({ error: '360° dönüş için arka görünüm görseli gereklidir.' }, { status: 400 });
    }

    console.log(`[Generate Route] Starting generation for user: ${user.email}, motion: ${motionType}`);

    // 3. Upload images to ImgBB
    console.log('[Generate Route] Uploading source images to ImgBB...');

    let humanFrontUrl, humanBackUrl, garmentFrontUrl, garmentBackUrl;

    if (isDirectMode) {
      // Direct mode: upload only user's own photos, no garment images needed
      console.log('[Generate Route] [Direct Mode] Uploading user photos only (VTON skipped)...');
      const uploadPromises = [
        uploadToImgBB(humanFront),
        humanBack ? uploadToImgBB(humanBack) : Promise.resolve(null),
      ];
      [humanFrontUrl, humanBackUrl] = await Promise.all(uploadPromises);
      garmentFrontUrl = null;
      garmentBackUrl = null;
    } else {
      // VTON mode: upload mannequin template + garment images
      console.log('[Generate Route] [VTON Mode] Uploading mannequin and garment images...');
      const uploadPromises = [
        uploadToImgBB(humanFront),
        isRotation ? uploadToImgBB(humanBack) : Promise.resolve(null),
        uploadToImgBB(garmentFront),
        garmentBack ? uploadToImgBB(garmentBack) : Promise.resolve(null),
      ];
      [humanFrontUrl, humanBackUrl, garmentFrontUrl, garmentBackUrl] = await Promise.all(uploadPromises);
    }

    // 4. Run Fal.ai VTON try-on (only in VTON mode)
    let frontDressedUrl;
    let backDressedUrl = null;

    if (isDirectMode) {
      // Skip VTON — use user's own photos directly
      console.log('[Generate Route] [Direct Mode] Bypassing VTON. Using user photos directly for Kling.');
      frontDressedUrl = humanFrontUrl;
      backDressedUrl = humanBackUrl || humanFrontUrl;
    } else if (isRotation) {
      console.log('[Generate Route] [VTON Mode] Triggering Fal.ai try-on for Front & Back (rotation)...');
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
      console.log('[Generate Route] [VTON Mode] Triggering Fal.ai try-on for Front only...');
      frontDressedUrl = await runVirtualTryOn({
        humanUrl: humanFrontUrl,
        garmentUrl: garmentFrontUrl,
        category,
      });
    }

    console.log('[Generate Route] Dressed URLs ready:', { frontDressedUrl, backDressedUrl, isDirectMode });

    // Apply Hijab Masking if model is Huma (tesettürlü)
    if (modelId === 'huma') {
      console.log('[Generate Route] Applying Hijab Masking for Huma model...');
      const maskingPromises = [
        maskHijab({
          originalComposedBase64: humanFront,
          dressedImageUrl: frontDressedUrl,
          modelId,
          bodySize,
          view: 'front',
        })
      ];
      if (isRotation && backDressedUrl) {
        maskingPromises.push(
          maskHijab({
            originalComposedBase64: humanBack,
            dressedImageUrl: backDressedUrl,
            modelId,
            bodySize,
            view: 'back',
          })
        );
      }

      const maskedUrls = await Promise.all(maskingPromises);
      frontDressedUrl = maskedUrls[0];
      if (isRotation && backDressedUrl) {
        backDressedUrl = maskedUrls[1];
      }
      console.log('[Generate Route] Hijab Masking complete. Masked URLs:', { frontDressedUrl, backDressedUrl });
    }

    // 5. Translate Turkish prompt to English for Kling AI
    console.log('[Generate Route] Translating custom prompt to English if needed...');
    const translatedPrompt = await translateToEnglish(customPrompt);

    // Cinematic suffix — eliminates green screen / flat background effect
    // By instructing Kling to treat the environment as real 3D space with natural depth
    const cinematicSuffix = isDirectMode
      ? 'Photorealistic video, natural environment lighting, cinematic depth of field, genuine atmospheric perspective, natural camera motion, realistic shadows cast on ground, 8K quality, no artificial studio look.'
      : 'Photorealistic, cinematic depth of field, natural environmental lighting, background has realistic depth and parallax motion, no flat or studio green screen look, natural shadows and ground contact, 8K quality.';

    const finalPrompt = `${translatedPrompt} ${cinematicSuffix}`;
    console.log('[Generate Route] Final prompt with cinematic suffix ready.');

    // 6. Trigger Kling video generation with start (and optional end) frames
    console.log('[Generate Route] Triggering Kling AI video generation...');
    // For rotation: pass both front and back. For direct mode: pass whatever views user uploaded.
    const imagesToPass = isRotation ? [frontDressedUrl, backDressedUrl] : [frontDressedUrl];
    const { taskId } = await createVideo(imagesToPass, category, finalPrompt, modelId);

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
          frontGarmUrl: garmentFrontUrl || humanFrontUrl,  // In direct mode, store user's own photo
          backGarmUrl: garmentBackUrl || garmentFrontUrl || humanFrontUrl, // DB constraint
          modelId: isDirectMode ? 'own_model' : (modelId || 'melisa'),
          bodySize: bodySize || 'STANDARD',
          backgroundId: backgroundId || 'own',
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
