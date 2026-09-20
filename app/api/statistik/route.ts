import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/db/store';

export const revalidate = 60;

export async function GET() {
  try {
    const stats = await getStatistics();
    return NextResponse.json(
      { success: true, data: stats },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil statistik' },
      { status: 500 }
    );
  }
}
