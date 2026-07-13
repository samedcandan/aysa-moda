import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// POST — Token kaydet / güncelle
export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
    }

    await prisma.modaPushToken.upsert({
      where: { token },
      update: { userId: session.userId, updatedAt: new Date() },
      create: { token, userId: session.userId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Push token kayıt hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE — Token sil (logout veya eski token temizliği)
export async function DELETE(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
    }

    await prisma.modaPushToken.deleteMany({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Push token silme hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
