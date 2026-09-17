import { NextResponse } from 'next/server';
import { updateLaporanStatus } from '@/lib/db/store';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    const updated = await updateLaporanStatus(
      id,
      body.status_verifikasi,
      body.status_penanganan
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui status' },
      { status: 500 }
    );
  }
}
