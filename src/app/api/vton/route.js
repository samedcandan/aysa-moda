import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadToImgBB } from '@/lib/imgbb';
import { runVirtualTryOn } from '@/lib/fal';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

// Vercel Pro: 5 dakikaya kadar çalışabilir
export const maxDuration = 300;

// Helper to composite transparent mannequin onto a selected stock background image using Jimp
async function composeMannequinOnBackground({ mannequinBase64, backgroundId }) {
  const backgrounds = {
    boutique: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=768&auto=format&fit=crop',
    runway: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=768&auto=format&fit=crop',
    street: 'https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?q=80&w=768&auto=format&fit=crop',
    garden: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?q=80&w=768&auto=format&fit=crop',
  };

  const bgUrl = backgrounds[backgroundId];
  if (!bgUrl) {
    return mannequinBase64;
  }

  try {
    console.log(`[VTON Compositing] Composing mannequin on background: ${backgroundId}`);
    const cleanBase64 = mannequinBase64.replace(/^data:image\/\w+;base64,/, '');
    const mannequinBuffer = Buffer.from(cleanBase64, 'base64');

    const [bgImg, mannequinImg] = await Promise.all([
      Jimp.read(bgUrl),
      Jimp.read(mannequinBuffer)
    ]);

    const targetW = mannequinImg.bitmap.width;
    const targetH = mannequinImg.bitmap.height;

    bgImg.resize({ w: targetW, h: targetH });
    bgImg.composite(mannequinImg, 0, 0);

    const outBuffer = await bgImg.getBuffer('image/jpeg');
    return `data:image/jpeg;base64,${outBuffer.toString('base64')}`;

  } catch (error) {
    console.error(`[VTON Compositing] Error composing background:`, error);
    return mannequinBase64;
  }
}

// Hijab masking helper (aynı route.js'teki gibi)
async function maskHijab({ originalBase64, dressedImageUrl, modelId, bodySize, view }) {
  try {
    const sizeSuffix = bodySize?.toLowerCase() === 'plus_size' ? 'plus' : 'standard';
    const templatePath = path.join(process.cwd(), 'public', 'models', `${modelId}_${sizeSuffix}_${view}.png`);

    if (!fs.existsSync(templatePath)) {
      console.warn(`[Hijab] Template not found: ${templatePath}`);
      return dressedImageUrl;
    }

    const cleanBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const origBuffer = Buffer.from(cleanBase64, 'base64');

    const [templateImg, originalImg, dressedImg] = await Promise.all([
      Jimp.read(templatePath),
      Jimp.read(origBuffer),
      Jimp.read(dressedImageUrl),
    ]);

    const targetW = dressedImg.bitmap.width;
    const targetH = dressedImg.bitmap.height;
    templateImg.resize({ w: targetW, h: targetH });
    originalImg.resize({ w: targetW, h: targetH });

    const startX = Math.round(targetW * 0.25);
    const width = Math.round(targetW * 0.50);
    const startY = Math.round(targetH * 0.12);
    const height = Math.round(targetH * 0.35);

    for (let y = startY; y < startY + height && y < targetH; y++) {
      for (let x = startX; x < startX + width && x < targetW; x++) {
        const color = templateImg.getPixelColor(x, y);
        const alpha = color & 0xff;
        if (alpha > 50) {
          dressedImg.setPixelColor(originalImg.getPixelColor(x, y), x, y);
        }
      }
    }

    const outBuffer = await dressedImg.getBuffer('image/jpeg');
    const newUrl = await uploadToImgBB(outBuffer.toString('base64'));
    return newUrl;
  } catch (err) {
    console.error(`[Hijab] Masking error:`, err);
    return dressedImageUrl;
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const {
      humanFront,   // base64 — manken şablonu (ön)
      humanBack,    // base64 — manken şablonu (arka), opsiyonel
      garmentFront, // base64 — kıyafet (ön)
      garmentBack,  // base64 — kıyafet (arka), opsiyonel
      category,
      modelId,
      bodySize,
      motionType,
      backgroundId,
    } = await request.json();

    if (!humanFront || !garmentFront || !category) {
      return NextResponse.json({ error: 'Eksik parametre: humanFront, garmentFront, category zorunlu.' }, { status: 400 });
    }

    const isRotation = motionType === 'rotation';

    console.log(`[VTON] Starting for user ${session.userId}. isRotation=${isRotation}, backgroundId=${backgroundId}`);

    // Pre-compose transparent mannequin onto selected background if applicable
    let finalHumanFront = humanFront;
    let finalHumanBack = humanBack;

    if (backgroundId && backgroundId !== 'original') {
      finalHumanFront = await composeMannequinOnBackground({ mannequinBase64: humanFront, backgroundId });
      if (humanBack) {
        finalHumanBack = await composeMannequinOnBackground({ mannequinBase64: humanBack, backgroundId });
      }
    }

    // 1. Görselleri ImgBB'ye yükle
    console.log('[VTON] Uploading images to ImgBB...');
    const uploadTasks = [
      uploadToImgBB(finalHumanFront),
      uploadToImgBB(garmentFront),
    ];
    if (isRotation && finalHumanBack) uploadTasks.push(uploadToImgBB(finalHumanBack));
    if (garmentBack) uploadTasks.push(uploadToImgBB(garmentBack));

    const uploadResults = await Promise.all(uploadTasks);
    const humanFrontUrl = uploadResults[0];
    const garmentFrontUrl = uploadResults[1];
    const humanBackUrl = isRotation && finalHumanBack ? uploadResults[2] : null;
    const garmentBackUrl = garmentBack ? uploadResults[uploadTasks.length - 1] : null;

    console.log('[VTON] Images uploaded. Starting try-on...');

    // 2. VTON çalıştır
    let frontDressedUrl;
    let backDressedUrl = null;

    if (isRotation && humanBackUrl) {
      const [frontRes, backRes] = await Promise.all([
        runVirtualTryOn({ humanUrl: humanFrontUrl, garmentUrl: garmentFrontUrl, category }),
        runVirtualTryOn({ humanUrl: humanBackUrl, garmentUrl: garmentBackUrl || garmentFrontUrl, category }),
      ]);
      frontDressedUrl = frontRes;
      backDressedUrl = backRes;
    } else {
      frontDressedUrl = await runVirtualTryOn({ humanUrl: humanFrontUrl, garmentUrl: garmentFrontUrl, category });
    }

    console.log('[VTON] Try-on complete:', { frontDressedUrl, backDressedUrl });

    // 3. Hijab masking (sadece Huma modeli için)
    if (modelId === 'huma') {
      console.log('[VTON] Applying hijab masking...');
      frontDressedUrl = await maskHijab({
        originalBase64: finalHumanFront,
        dressedImageUrl: frontDressedUrl,
        modelId,
        bodySize,
        view: 'front',
      });
      if (isRotation && backDressedUrl && finalHumanBack) {
        backDressedUrl = await maskHijab({
          originalBase64: finalHumanBack,
          dressedImageUrl: backDressedUrl,
          modelId,
          bodySize,
          view: 'back',
        });
      }
    }

    return NextResponse.json({
      success: true,
      frontDressedUrl,
      backDressedUrl,
    });

  } catch (error) {
    console.error('[VTON] Error:', error);
    return NextResponse.json(
      { error: error.message || 'VTON işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
