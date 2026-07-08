import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadToImgBB } from '@/lib/imgbb';
import { runVirtualTryOn, removeBackground } from '@/lib/fal';
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

// Helper to add a contact shadow under the model's feet
function addContactShadow(bgImg, targetW, targetH, offsetY, mannequinImg) {
  try {
    const bottomPadding = getBottomPadding(mannequinImg);
    // Scan the bottom 100 pixels of the model body to find the horizontal boundaries of the feet
    const scanStartY = Math.max(0, targetH - bottomPadding - 100);
    const scanEndY = targetH - bottomPadding;
    
    let minX = targetW;
    let maxX = 0;
    
    for (let y = scanStartY; y < scanEndY; y++) {
      for (let x = 0; x < targetW; x++) {
        const color = mannequinImg.getPixelColor(x, y);
        const alpha = color & 0xff;
        if (alpha > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    
    if (maxX > minX) {
      const centerX = Math.round((minX + maxX) / 2);
      const shadowWidth = Math.round((maxX - minX) * 0.85);
      const shadowHeight = 16;
      
      const shadowImg = new Jimp({ width: targetW, height: 60, color: 0x00000000 });
      
      const cx = centerX;
      const cy = 30;
      const rx = shadowWidth / 2;
      const ry = shadowHeight / 2;
      
      for (let y = 0; y < 60; y++) {
        for (let x = 0; x < targetW; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const ellipseVal = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
          if (ellipseVal <= 1) {
            const dist = Math.sqrt(ellipseVal);
            const opacity = Math.round(110 * (1 - dist)); // Soft falloff (max 110 opacity)
            shadowImg.setPixelColor(opacity, x, y);
          }
        }
      }
      
      shadowImg.blur(6);
      
      // Composite the shadow just below the feet (offset by height/2 of the shadow canvas)
      const feetY = scanEndY + offsetY;
      bgImg.composite(shadowImg, 0, feetY - 33);
    }
  } catch (err) {
    console.error('[Shadow] Failed to generate contact shadow:', err);
  }
}

// Helper to composite transparent mannequin onto a selected stock background image using Jimp
async function composeMannequinOnBackground({ mannequinBase64, backgroundId, customBg }) {
  const backgrounds = {
    boutique: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=768&auto=format&fit=crop',
    runway: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=768&auto=format&fit=crop',
    street: 'https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?q=80&w=768&auto=format&fit=crop',
    garden: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=768&auto=format&fit=crop',
  };

  let bgUrl = backgrounds[backgroundId];
  if (backgroundId === 'custom' && customBg) {
    bgUrl = customBg;
  }

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
    
    // Shift model down to align feet at the bottom (leave 5px padding)
    const offsetY = Math.max(0, getBottomPadding(mannequinImg) - 5);

    bgImg.resize({ w: targetW, h: targetH });
    addContactShadow(bgImg, targetW, targetH, offsetY, mannequinImg);
    bgImg.composite(mannequinImg, 0, offsetY);

    const outBuffer = await bgImg.getBuffer('image/jpeg');
    return `data:image/jpeg;base64,${outBuffer.toString('base64')}`;

  } catch (error) {
    console.error(`[VTON Compositing] Error composing background:`, error);
    return mannequinBase64;
  }
}

// Helper to composite dressed mannequin (transparent) onto selected background using Jimp
async function composeDressedOnBackground({ transparentDressedUrl, backgroundId, customBg }) {
  const backgrounds = {
    boutique: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=768&auto=format&fit=crop',
    runway: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=768&auto=format&fit=crop',
    street: 'https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?q=80&w=768&auto=format&fit=crop',
    garden: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=768&auto=format&fit=crop',
  };

  let bgUrl = backgrounds[backgroundId];
  if (backgroundId === 'custom' && customBg) {
    bgUrl = customBg;
  }

  if (!bgUrl) {
    return transparentDressedUrl;
  }

  try {
    console.log(`[VTON Post-Compositing] Composing dressed mannequin on background: ${backgroundId}`);
    const [bgImg, dressedImg] = await Promise.all([
      Jimp.read(bgUrl),
      Jimp.read(transparentDressedUrl)
    ]);

    const targetW = dressedImg.bitmap.width;
    const targetH = dressedImg.bitmap.height;
    
    // Shift model down to align feet at the bottom (leave 5px padding)
    const offsetY = Math.max(0, getBottomPadding(dressedImg) - 5);

    bgImg.resize({ w: targetW, h: targetH });
    addContactShadow(bgImg, targetW, targetH, offsetY, dressedImg);
    bgImg.composite(dressedImg, 0, offsetY);

    const outBuffer = await bgImg.getBuffer('image/jpeg');
    const uploadUrl = await uploadToImgBB(outBuffer.toString('base64'));
    return uploadUrl;
  } catch (error) {
    console.error(`[VTON Post-Compositing] Error composing background:`, error);
    return transparentDressedUrl;
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
      backgroundId,
      customBg,
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
      finalHumanFront = await composeMannequinOnBackground({ mannequinBase64: humanFront, backgroundId, customBg });
      if (humanBack) {
        finalHumanBack = await composeMannequinOnBackground({ mannequinBase64: humanBack, backgroundId, customBg });
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

    // 4. Post-compose background (remove white background of VTON output and composite on chosen background)
    if (backgroundId && backgroundId !== 'original') {
      try {
        console.log(`[VTON Post-Compose] Removing background and post-compositing onto ${backgroundId}...`);
        const [transparentFront, transparentBack] = await Promise.all([
          removeBackground({ imageUrl: frontDressedUrl }),
          backDressedUrl ? removeBackground({ imageUrl: backDressedUrl }) : Promise.resolve(null),
        ]);

        frontDressedUrl = await composeDressedOnBackground({ transparentDressedUrl: transparentFront, backgroundId, customBg });
        if (backDressedUrl && transparentBack) {
          backDressedUrl = await composeDressedOnBackground({ transparentDressedUrl: transparentBack, backgroundId, customBg });
        }
      } catch (bgError) {
        console.error('[VTON Post-Compose] Failed post-compositing background:', bgError);
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
