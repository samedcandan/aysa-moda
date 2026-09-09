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

    /* ⛔ `upgrade_plan` KALDIRILDI — 9 Eylül 2026
     * Bu dal ödeme, rol ya da ortam kontrolü olmadan `credits`'i artırıyordu:
     * oturum açmış HERHANGİ bir kullanıcı {action:'upgrade_plan', plan:'PLATINUM'}
     * gönderip kendine 100 kredi yazabiliyor, bunu sınırsız tekrarlayabiliyordu.
     * Kendi yorumu da "Mock upgrade for testing" diyordu — test kapısı canlıda
     * unutulmuştu ve kod tabanında onu çağıran TEK bir satır bile yoktu.
     * Kredinin tek meşru kaynağı ödeme onayıdır:
     *   src/app/api/payment/callback/route.js (iyzico doğrulamasından sonra). */

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });

  } catch (error) {
    console.error('Me POST API error:', error);
    return NextResponse.json({ error: 'İşlem gerçekleştirilemedi.' }, { status: 500 });
  }
}
