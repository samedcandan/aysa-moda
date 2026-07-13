import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gereklidir.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.modaUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda.' }, { status: 400 });
    }

    // Create user
    const newUser = await prisma.modaUser.create({
      data: {
        email,
        password: hashPassword(password),
        credits: 10, // 10 test credits
        plan: 'BRONZE',
      },
    });

    // Set auth cookie AND return token for mobile clients
    const token = await setSessionCookie(newUser.id, newUser.email);

    return NextResponse.json({
      success: true,
      token, // Mobil istemciler bu token'ı saklayıp Authorization header ile gönderir
      user: { id: newUser.id, email: newUser.email, credits: newUser.credits, plan: newUser.plan },
    });

  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ error: 'Kayıt sırasında bir hata oluştu.' }, { status: 500 });
  }
}
