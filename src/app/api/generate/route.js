import { NextResponse } from 'next/server';
import { uploadToImgBB } from '@/lib/imgbb';
import { createVideo } from '@/lib/kling';

export async function POST(request) {
  try {
    const { image, category } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Fotoğraf gerekli.' }, { status: 400 });
    }

    if (!category || !['gelinlik', 'tesettur', 'gunluk'].includes(category)) {
      return NextResponse.json({ error: 'Geçerli bir kategori seçin.' }, { status: 400 });
    }

    // 1. Upload to ImgBB for public URL
    const imageUrl = await uploadToImgBB(image);

    // 2. Start Kling video generation
    const { taskId } = await createVideo(imageUrl, category);

    return NextResponse.json({ taskId, status: 'processing' });

  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error.message || 'Video oluşturma başlatılamadı.' },
      { status: 500 }
    );
  }
}
