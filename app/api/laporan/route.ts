import { NextResponse } from 'next/server';
import { getLaporanList, addLaporan } from '@/lib/db/store';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

async function hasStaffSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wantsAll = searchParams.get('scope') === 'all';

    // Public endpoint only exposes reports that are already verified AND
    // being handled (diproses/selesai). Reports still "menunggu" penanganan
    // are not shown publicly. The full list requires a staff session.
    let includeUnpublished = false;
    if (wantsAll) {
      includeUnpublished = isSupabaseConfigured() ? await hasStaffSession() : true;
    }

    const list = includeUnpublished
      ? await getLaporanList()
      : await getLaporanList({ onlyPublished: true });
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.foto_url || body.lat_gps === undefined || body.lng_gps === undefined) {
      return NextResponse.json(
        { success: false, error: 'Foto dan koordinat GPS wajib diisi' },
        { status: 400 }
      );
    }

    const newReport = await addLaporan({
      foto_url: body.foto_url,
      lat_gps: Number(body.lat_gps),
      lng_gps: Number(body.lng_gps),
      lat_exif: body.lat_exif ? Number(body.lat_exif) : undefined,
      lng_exif: body.lng_exif ? Number(body.lng_exif) : undefined,
      jarak_exif_gps_m: body.jarak_exif_gps_m ? Number(body.jarak_exif_gps_m) : undefined,
      flag_manual: Boolean(body.flag_manual),
      wilayah: body.wilayah || 'Wilayah Tidak Teridentifikasi',
      deskripsi: body.deskripsi || '',
      skala: body.skala || 'SEDANG',
      status_verifikasi: 'belum-diverifikasi',
      status_penanganan: 'menunggu',
    });

    return NextResponse.json({ success: true, data: newReport }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan laporan' },
      { status: 500 }
    );
  }
}
