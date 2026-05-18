import { NextResponse } from 'next/server';
import { checkVideoStatus } from '@/lib/kling';

export async function POST(request) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID gerekli.' }, { status: 400 });
    }

    const result = await checkVideoStatus(taskId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: error.message || 'Durum sorgulanamadı.' },
      { status: 500 }
    );
  }
}
