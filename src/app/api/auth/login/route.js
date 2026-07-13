import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, hashPassword, setSessionCookie } from '@/lib/auth';

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

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
    }

    // Auto-upgrade legacy SHA-256 passwords to Bcrypt on successful login
    if (!user.password.startsWith('$2')) {
      try {
        const newHash = hashPassword(password);
        await prisma.modaUser.update({
          where: { id: user.id },
          data: { password: newHash },
        });
        console.log(`[Auth Login] Automatically upgraded password hash to Bcrypt for user: ${email}`);
      } catch (err) {
        console.error('[Auth Login] Failed to auto-upgrade password hash:', err);
      }
    }

    // Set auth cookie AND return token for mobile clients
    const token = await setSessionCookie(user.id, user.email);

    return NextResponse.json({
      success: true,
      token, // Mobil istemciler bu token'ı saklayıp Authorization header ile gönderir
      user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan },
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Giriş sırasında bir hata oluştu.' }, { status: 500 });
  }
}
