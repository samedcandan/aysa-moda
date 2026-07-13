import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const user = await prisma.modaUser.findUnique({
      where: { id: session.userId },
      include: {
        generations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        plan: user.plan,
        watermarkUrl: user.watermarkUrl,
      },
      generations: user.generations,
    });

  } catch (error) {
    console.error('Me GET API error:', error?.message);
    return NextResponse.json({ error: 'Kullanıcı bilgileri alınamadı.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const { action, watermarkUrl, plan, credits } = await request.json();

    if (action === 'logout') {
      await clearSessionCookie();
      return NextResponse.json({ success: true, message: 'Oturum kapatıldı.' });
    }

    if (action === 'update_watermark') {
      const updatedUser = await prisma.modaUser.update({
        where: { id: session.userId },
        data: { watermarkUrl: watermarkUrl || null },
      });
      return NextResponse.json({ success: true, watermarkUrl: updatedUser.watermarkUrl });
    }

    if (action === 'upgrade_plan') {
      // Mock upgrade for testing credits (in production, called after successful iyzico checkout)
      let addedCredits = 0;
      if (plan === 'BRONZE') addedCredits = 10;
      else if (plan === 'SILVER') addedCredits = 30;
      else if (plan === 'GOLD') addedCredits = 50;
      else if (plan === 'PLATINUM') addedCredits = 100;

      const updatedUser = await prisma.modaUser.update({
        where: { id: session.userId },
        data: {
          plan,
          credits: { increment: addedCredits },
        },
      });

      return NextResponse.json({
        success: true,
        user: { id: updatedUser.id, email: updatedUser.email, credits: updatedUser.credits, plan: updatedUser.plan },
      });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });

  } catch (error) {
    console.error('Me POST API error:', error);
    return NextResponse.json({ error: 'İşlem gerçekleştirilemedi.' }, { status: 500 });
  }
}
