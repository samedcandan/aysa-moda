import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadToImgBB } from '@/lib/imgbb';
import { runVirtualTryOn } from '@/lib/fal';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

// Vercel Pro: 5 dakikaya kadar çalışabilir
export const maxDuration = 300;

// Helper to scan transparency of Jimp image at the bottom
function getBottomPadding(jimpImage) {
  const width = jimpImage.bitmap.width;
  const height = jimpImage.bitmap.height;
  let transparentRows = 0;
  for (let y = height - 1; y >= 0; y--) {
    let isRowTransparent = true;
    for (let x = 0; x < width; x++) {
      const pixelColor = jimpImage.getPixelColor(x, y);
      const alpha = pixelColor & 0xff;
      if (alpha > 10) {
        isRowTransparent = false;
        break;
      }
    }
    if (isRowTransparent) {
      transparentRows++;
    } else {
      break;
    }
  }
  return transparentRows;
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

    // Since originalImg and dressedImg were both pre-composited with offsetY,
    // their head positions are shifted down by offsetY.
    // templateImg is the raw model template, which is NOT shifted.
    const offsetY = Math.max(0, getBottomPadding(templateImg) - 5);

    const startX = Math.round(targetW * 0.25);
    const width = Math.round(targetW * 0.50);
    const startY = Math.round(targetH * 0.12);
    const height = Math.round(targetH * 0.35);

    for (let y = startY; y < startY + height && y < targetH; y++) {
      for (let x = startX; x < startX + width && x < targetW; x++) {
        const color = templateImg.getPixelColor(x, y);
        const alpha = color & 0xff;
        if (alpha > 50) {
          const targetY = y + offsetY;
          if (targetY < targetH) {
            dressedImg.setPixelColor(originalImg.getPixelColor(x, targetY), x, targetY);
          }
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
    } = await request.json();

    if (!humanFront || !garmentFront || !category) {
      return NextResponse.json({ error: 'Eksik parametre: humanFront, garmentFront, category zorunlu.' }, { status: 400 });
    }

    const isRotation = motionType === 'rotation';

    console.log(`[VTON] Starting for user ${session.userId}. isRotation=${isRotation}`);

    // 1. Görselleri ImgBB'ye yükle
    console.log('[VTON] Uploading images to ImgBB...');
    const uploadTasks = [
      uploadToImgBB(humanFront),
      uploadToImgBB(garmentFront),
    ];
    if (isRotation && humanBack) uploadTasks.push(uploadToImgBB(humanBack));
    if (garmentBack) uploadTasks.push(uploadToImgBB(garmentBack));

    const uploadResults = await Promise.all(uploadTasks);
    const humanFrontUrl = uploadResults[0];
    const garmentFrontUrl = uploadResults[1];
    const humanBackUrl = isRotation && humanBack ? uploadResults[2] : null;
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
    // Artık VTON Derin'in minimal template'ini kullanıyor, bu yüzden maskeleme için
    // Hüma'nın kendi başörtülü template'ini dosyadan okuyoruz
    if (modelId === 'huma') {
      console.log('[VTON] Applying hijab masking with Hüma original template...');
      const sizeSuffix = bodySize?.toLowerCase() === 'plus_size' ? 'plus' : 'standard';
      
      // Hüma'nın orijinal başörtülü template'ini oku
      const humaFrontPath = path.join(process.cwd(), 'public', 'models', `huma_${sizeSuffix}_front.png`);
      const humaFrontBuffer = fs.readFileSync(humaFrontPath);
      const humaFrontBase64 = `data:image/png;base64,${humaFrontBuffer.toString('base64')}`;

      frontDressedUrl = await maskHijab({
        originalBase64: humaFrontBase64,
        dressedImageUrl: frontDressedUrl,
        modelId,
        bodySize,
        view: 'front',
      });
      if (isRotation && backDressedUrl) {
        const humaBackPath = path.join(process.cwd(), 'public', 'models', `huma_${sizeSuffix}_back.png`);
        const humaBackBuffer = fs.readFileSync(humaBackPath);
        const humaBackBase64 = `data:image/png;base64,${humaBackBuffer.toString('base64')}`;
        
        backDressedUrl = await maskHijab({
          originalBase64: humaBackBase64,
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
