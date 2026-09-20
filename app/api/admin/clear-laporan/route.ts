import { NextResponse } from 'next/server';
import { clearAllLaporan } from '@/lib/db/store';
import { validateStaffSession } from '@/lib/auth';

/**
 * DELETE /api/admin/clear-laporan
 * Menghapus SELURUH data laporan dari semua storage.
 * Endpoint ini WAJIB terautentikasi sebagai petugas.
 */
export async function DELETE(request: Request) {
  try {
    const isAuthorized = await validateStaffSession(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses. Login sebagai petugas terlebih dahulu.' },
        { status: 401 }
      );
    }

    console.log('[ADMIN] Memulai penghapusan seluruh data laporan...');
    await clearAllLaporan();
    console.log('[ADMIN] Seluruh data laporan berhasil dihapus.');

    return NextResponse.json({
      success: true,
      message: 'Seluruh data laporan berhasil dihapus dari semua storage.',
    });
  } catch (error: any) {
    console.error('[ADMIN CLEAR ERROR]:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus data laporan' },
      { status: 500 }
    );
  }
}
