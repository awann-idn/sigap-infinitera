import { NextResponse } from 'next/server';
import { updateLaporan, deleteLaporan, type LaporanUpdate } from '@/lib/db/store';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

async function requireStaff(): Promise<boolean> {
  // In demo mode (Supabase not configured) there is no auth session to check.
  if (!isSupabaseConfigured()) return true;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses untuk mengubah laporan' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fields: LaporanUpdate = {};

    if (body.status_verifikasi) fields.status_verifikasi = body.status_verifikasi;
    if (body.status_penanganan) fields.status_penanganan = body.status_penanganan;
    if (typeof body.deskripsi === 'string') fields.deskripsi = body.deskripsi;
    if (typeof body.wilayah === 'string') fields.wilayah = body.wilayah;

    const updated = await updateLaporan(params.id, fields);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui laporan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses untuk menghapus laporan' },
        { status: 401 }
      );
    }

    const deleted = await deleteLaporan(params.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus laporan' },
      { status: 500 }
    );
  }
}
