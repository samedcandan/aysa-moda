import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'Google kimlik bilgisi eksik.' }, { status: 400 });
    }

    let googleId, email, name;

    // 1. id_token ile doğrulama dene
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (verifyRes.ok) {
      const payload = await verifyRes.json();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
    } else {
      // 2. access_token ile userinfo dene
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${credential}` }
      });
      if (userinfoRes.ok) {
        const payload = await userinfoRes.json();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
      } else {
        return NextResponse.json({ error: 'Google kimlik doğrulaması başarısız oldu.' }, { status: 401 });
      }
    }

    if (!googleId || !email) {
      return NextResponse.json({ error: 'Google hesabından geçerli e-posta veya kimlik alınamadı.' }, { status: 400 });
    }

    // 1. Kullanıcıyı googleId veya email ile ara
    let user = await prisma.modaUser.findFirst({
      where: {
        OR: [
          { googleId: googleId },
          { email: email }
        ]
      }
    });

    if (user) {
      // Kullanıcı var: Eğer googleId eşleşmesi güncellenmemişse bağla
      if (!user.googleId) {
        user = await prisma.modaUser.update({
          where: { id: user.id },
          data: { googleId: googleId }
        });
      }
      
      // name alanı boşsa ve Google'dan geldiyse doldur
      if (!user.name && name) {
        user = await prisma.modaUser.update({
          where: { id: user.id },
          data: { name: name }
        });
      }
    } else {
      // 2. Yeni Kullanıcı Kaydı (Google ile Register)
      user = await prisma.modaUser.create({
        data: {
          email,
          googleId,
          name: name || 'Google Kullanıcısı',
          credits: 10, // 10 test credits
          plan: 'BRONZE'
        }
      });
    }

    // Oturumu başlat (Cookie yazar ve mobil için token döner)
    const token = await setSessionCookie(user.id, user.email);

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan }
    }, { status: 200 });

  } catch (error) {
    console.error('Google Auth Route Error:', error);
    return NextResponse.json({ error: 'Google ile giriş yapılırken sunucu hatası oluştu.' }, { status: 500 });
  }
}
