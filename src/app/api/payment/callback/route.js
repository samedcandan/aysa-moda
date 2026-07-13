import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { iyzicoRequest } from '@/lib/iyzico';

export async function POST(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aysamoda.karneyn.com';

  try {
    const formData = await request.formData();
    const token = formData.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/?payment=error&msg=token_missing', baseUrl), { status: 303 });
    }

    const result = await iyzicoRequest('/payment/iyzipos/checkoutform/auth/ecom/detail', {
      locale: 'tr',
      token
    });

    if (result.paymentStatus === 'SUCCESS') {
      const basketId = result.basketId || '';

      // basketId formatı: BASKET_{userId}_{planCode}
      if (!basketId.startsWith('BASKET_')) {
        console.error('Iyzico basketId gecersiz:', basketId);
        return NextResponse.redirect(new URL('/?payment=error&msg=gecersiz_sepet', baseUrl), { status: 303 });
      }

      const parts = basketId.replace('BASKET_', '').split('_');
      const userId = parseInt(parts[0], 10);
      const planCode = parts[1] || 'SILVER';

      if (!userId || isNaN(userId)) {
        console.error('Iyzico basketId icindeki userId gecersiz:', basketId);
        return NextResponse.redirect(new URL('/?payment=error&msg=gecersiz_kullanici', baseUrl), { status: 303 });
      }

      // Kredi miktarlarını belirle
      const planCredits = {
        BRONZE: 10,
        SILVER: 30,
        GOLD: 50,
        PLATINUM: 100
      };

      const addedCredits = planCredits[planCode] || 0;

      // Veritabanını güncelle
      await prisma.modaUser.update({
        where: { id: userId },
        data: {
          plan: planCode,
          credits: { increment: addedCredits }
        }
      });

      return NextResponse.redirect(new URL(`/?payment=success&plan=${planCode}&added=${addedCredits}`, baseUrl), { status: 303 });
    } else {
      console.error('Ödeme başarısız:', result.errorMessage);
      return NextResponse.redirect(new URL(`/?payment=error&msg=${encodeURIComponent(result.errorMessage || 'Ödeme reddedildi.')}`, baseUrl), { status: 303 });
    }

  } catch (error) {
    console.error('Payment callback API error:', error);
    return NextResponse.redirect(new URL('/?payment=error', baseUrl), { status: 303 });
  }
}
