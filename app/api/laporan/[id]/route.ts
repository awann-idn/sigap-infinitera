import { NextResponse } from 'next/server';
import { updateLaporanStatus } from '@/lib/db/store';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Tidak memiliki akses untuk mengubah status laporan' },
          { status: 401 }
        );
      }
    }

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
