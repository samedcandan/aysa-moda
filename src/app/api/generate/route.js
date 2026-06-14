import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { uploadToImgBB } from '@/lib/imgbb';
import { runVirtualTryOn } from '@/lib/fal';
import { createVideo } from '@/lib/kling';

export const maxDuration = 60; // Set Vercel execution limit to 60 seconds

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
    } = await request.json();

    if (!humanFront || !humanBack || !garmentFront || !garmentBack || !category) {
      return NextResponse.json({ error: 'Gerekli görsel parametreleri eksik.' }, { status: 400 });
    }

    console.log(`[Generate Route] Starting generation for user: ${user.email}`);

    // 3. Upload images to ImgBB
    console.log('[Generate Route] Uploading source images to ImgBB...');
    const [humanFrontUrl, humanBackUrl, garmentFrontUrl, garmentBackUrl] = await Promise.all([
      uploadToImgBB(humanFront),
      uploadToImgBB(humanBack),
      uploadToImgBB(garmentFront),
      uploadToImgBB(garmentBack),
    ]);

    // 4. Run Fal.ai VTON try-on in parallel
    console.log('[Generate Route] Triggering Fal.ai try-on for Front & Back...');
    const [frontDressedUrl, backDressedUrl] = await Promise.all([
      runVirtualTryOn({
        humanUrl: humanFrontUrl,
        garmentUrl: garmentFrontUrl,
        category,
        garmentDes: `${category} front view`,
      }),
      runVirtualTryOn({
        humanUrl: humanBackUrl,
        garmentUrl: garmentBackUrl,
        category,
        garmentDes: `${category} back view`,
      }),
    ]);

    console.log('[Generate Route] VTON complete. Dressed URLs:', { frontDressedUrl, backDressedUrl });

    // 5. Trigger Kling video generation with start & end frames
    console.log('[Generate Route] Triggering Kling AI video generation...');
    const { taskId } = await createVideo([frontDressedUrl, backDressedUrl], category, customPrompt);

    console.log('[Generate Route] Video generation task created. TaskID:', taskId);

    // 6. Deduct 1 credit & Save generation record in database
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
          backGarmUrl: garmentBackUrl,
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
