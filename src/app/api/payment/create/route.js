import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { iyzicoRequest } from '@/lib/iyzico';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const user = await prisma.modaUser.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const data = await request.json().catch(() => ({}));
    const plan = data.plan || 'SILVER'; // SILVER | GOLD | PLATINUM

    // Fiyatlandırma tanımları
    const planDetails = {
      BRONZE: { name: 'Bronz (Bronze)', price: 416.67, credits: 10 },
      SILVER: { name: 'Gümüş (Silver)', price: 1000.00, credits: 30 },
      GOLD: { name: 'Altın (Gold)', price: 1500.00, credits: 50 },
      PLATINUM: { name: 'Platin (Platinum)', price: 2708.33, credits: 100 },
    };

    const selectedPlan = planDetails[plan];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Geçersiz paket seçimi.' }, { status: 400 });
    }

    // Fiyat + KDV hesaplama (%20 KDV)
    const kdvRate = 0.20;
    const priceInclKdv = (selectedPlan.price * (1 + kdvRate)).toFixed(2);

    const conversationId = `MODA_${user.id}_${plan}_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aysamoda.karneyn.com';

    // Mock/placeholder buyer details for iyzico requirements
    const phone = '+905000000000';
    const emailPrefix = user.email.split('@')[0] || 'kullanici';

    const body = {
      locale: 'tr',
      conversationId,
      price: priceInclKdv,
      paidPrice: priceInclKdv,
      currency: 'TRY',
      basketId: `BASKET_${user.id}_${plan}`,
      paymentGroup: 'PRODUCT',
      callbackUrl: `${baseUrl}/api/payment/callback`,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: `USR_${user.id}`,
        name: emailPrefix,
        surname: 'Moda',
        gsmNumber: phone,
        email: user.email,
        identityNumber: '11111111111',
        registrationAddress: 'Türkiye',
        ip: '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey'
      },
      shippingAddress: {
        contactName: emailPrefix + ' Moda',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Türkiye'
      },
      billingAddress: {
        contactName: emailPrefix + ' Moda',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Türkiye'
      },
      basketItems: [
        {
          id: `${plan}_${user.id}`,
          name: `AI Moda ${selectedPlan.name} Paketi (${selectedPlan.credits} Video Kredisi)`,
          category1: 'Yazılım',
          category2: 'AI Moda',
          itemType: 'VIRTUAL',
          price: priceInclKdv
        }
      ]
    };

    const result = await iyzicoRequest('/payment/iyzipos/checkoutform/initialize/auth/ecom', body);

    if (result.status === 'success') {
      return NextResponse.json({
        checkoutFormContent: result.checkoutFormContent,
        token: result.token
      });
    } else {
      console.error('Iyzico error:', result);
      return NextResponse.json({ error: result.errorMessage || 'Ödeme formu oluşturulamadı.' }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment create API error:', error);
    return NextResponse.json({ error: 'Ödeme işlemi başlatılamadı.' }, { status: 500 });
  }
}
