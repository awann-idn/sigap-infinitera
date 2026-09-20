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
    const isAuthorized = await validateStaffSession(request);
    if (!isAuthorized) {
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
