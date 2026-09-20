import { NextResponse } from 'next/server';
import { updateLaporan, deleteLaporan, type LaporanUpdate } from '@/lib/db/store';
import { validateStaffSession } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const isAuthorized = await validateStaffSession(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Sesi petugas tidak valid atau tidak memiliki izin akses' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fields: LaporanUpdate = {};

    if (body.status_verifikasi) fields.status_verifikasi = body.status_verifikasi;
    if (body.status_penanganan) fields.status_penanganan = body.status_penanganan;
    if (typeof body.deskripsi === 'string') fields.deskripsi = body.deskripsi;
    if (typeof body.wilayah === 'string') fields.wilayah = body.wilayah;
    if (body.alasan_tidak_valid !== undefined) fields.alasan_tidak_valid = body.alasan_tidak_valid;

    console.log(`[API PATCH] Menerima request update untuk ID: "${params.id}"`, JSON.stringify(fields));
    const updated = await updateLaporan(params.id, fields);
    console.log(`[API PATCH] Hasil update untuk ID: "${params.id}":`, updated ? `Record DITEMUKAN (ID: ${updated.id})` : 'Record TIDAK DITEMUKAN');

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error(`[API PATCH ERROR] ID: "${params.id}":`, error?.stack || error?.message || error);
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
    const isAuthorized = await validateStaffSession(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses untuk menghapus laporan' },
        { status: 401 }
      );
    }

    console.log(`[API DELETE] Menerima request delete untuk ID: "${params.id}"`);
    const deleted = await deleteLaporan(params.id);
    console.log(`[API DELETE] Hasil delete untuk ID: "${params.id}":`, deleted ? 'Record BERHASIL DIHAPUS' : 'Record TIDAK DITEMUKAN');

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API DELETE ERROR] ID: "${params.id}":`, error?.stack || error?.message || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus laporan' },
      { status: 500 }
    );
  }
}
