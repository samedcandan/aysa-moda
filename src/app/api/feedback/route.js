import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_CATEGORIES = ['giydirme_hatasi', 'hareket', 'kalite', 'prompt', 'diger'];

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const { generationId, category, description } = await request.json();

    if (!generationId || !category) {
      return NextResponse.json({ error: 'generationId ve category gereklidir.' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Geçersiz kategori.' }, { status: 400 });
    }

    // Generation'ın bu kullanıcıya ait olduğunu doğrula
    const generation = await prisma.modaGeneration.findFirst({
      where: { id: generationId, userId: session.userId },
    });

    if (!generation) {
      return NextResponse.json({ error: 'Üretim kaydı bulunamadı.' }, { status: 404 });
    }

    // Feedback oluştur
    const feedback = await prisma.modaFeedback.create({
      data: {
        userId: session.userId,
        generationId,
        category,
        description: description?.trim() || null,
        status: 'bekliyor',
      },
    });

    // Generation status'unu güncelle
    await prisma.modaGeneration.update({
      where: { id: generationId },
      data: { status: 'FEEDBACK_SENT', updatedAt: new Date() },
    });

    console.log('[Feedback] Created feedback:', feedback.id, 'for generation:', generationId);
    return NextResponse.json({ success: true, feedbackId: feedback.id });

  } catch (err) {
    console.error('[Feedback] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Geri bildirim kaydedilemedi.' }, { status: 500 });
  }
}

// GET: Admin için feedback listesi (ileride karneyn.com admin panelinden kullanılacak)
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    // Sadece kendi feedbacklerini görebilir (admin kontrolü ileride eklenecek)
    const feedbacks = await prisma.modaFeedback.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { generation: { select: { category: true, videoUrl: true, createdAt: true } } },
    });

    return NextResponse.json({ feedbacks });

  } catch (err) {
    console.error('[Feedback GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
