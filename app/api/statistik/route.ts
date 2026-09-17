import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/db/store';

export async function GET() {
  try {
    const stats = await getStatistics();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil statistik' },
      { status: 500 }
    );
  }
}
