import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gereklidir.' }, { status: 400 });
    }

    // Find user
    const user = await prisma.modaUser.findUnique({
      where: { email },
    });

    if (!user || user.password !== hashPassword(password)) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
    }

    // Set auth cookie
    await setSessionCookie(user.id, user.email);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan },
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Giriş sırasında bir hata oluştu.' }, { status: 500 });
  }
}
