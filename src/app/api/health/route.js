import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Aysa Moda Stüdyo',
    timestamp: new Date().toISOString()
  });
}
