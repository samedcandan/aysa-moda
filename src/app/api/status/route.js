import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkVideoStatus } from '@/lib/kling';
import { notifyVideoReady } from '@/lib/fcm';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID gereklidir.' }, { status: 400 });
    }

    // Find generation record in database
    const generation = await prisma.modaGeneration.findFirst({
      where: {
        id: taskId,
        userId: session.userId,
      },
    });

    if (!generation) {
      return NextResponse.json({ error: 'Video kaydı bulunamadı veya yetkiniz yok.' }, { status: 404 });
    }

    // If already completed in DB, return immediately without calling external API
    if (generation.status === 'SUCCESS' && generation.videoUrl) {
      return NextResponse.json({ status: 'done', videoUrl: generation.videoUrl });
    }

    if (generation.status === 'FAILED') {
      return NextResponse.json({ status: 'error', error: generation.error || 'Video üretimi başarısız.' });
    }

    // Query Kling status
    console.log(`[Status Route] Polling Kling status for task: ${taskId}`);
    const result = await checkVideoStatus(taskId);

    // Update database based on Kling result
    if (result.status === 'done' && result.videoUrl) {
      console.log(`[Status Route] Video SUCCESS for task: ${taskId}`);
      await prisma.modaGeneration.update({
        where: { id: taskId },
        data: {
          status: 'SUCCESS',
          videoUrl: result.videoUrl,
        },
      });
      // Push bildirim gönder (fire-and-forget)
      notifyVideoReady(session.userId, taskId).catch(() => {});
    } else if (result.status === 'error') {
      console.error(`[Status Route] Video FAILED for task: ${taskId}, error: ${result.error}`);
      await prisma.modaGeneration.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          error: result.error || 'Bilinmeyen hata.',
        },
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Status Route] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Durum sorgulanamadı.' },
      { status: 500 }
    );
  }
}
