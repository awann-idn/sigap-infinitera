import { NextResponse } from 'next/server';
import { getLaporanList, addLaporan } from '@/lib/db/store';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  calculateHaversineDistance,
  calculateTingkatKeyakinan,
} from '@/lib/geo';

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

    const latGps = Number(body.lat_gps);
    const lngGps = Number(body.lng_gps);
    const latExif = body.lat_exif != null ? Number(body.lat_exif) : undefined;
    const lngExif = body.lng_exif != null ? Number(body.lng_exif) : undefined;
    const dateTimeOriginal = body.date_time_original || undefined;

    // Calculate distance on server
    let jarakExifGpsM: number | undefined;
    if (latExif != null && lngExif != null) {
      jarakExifGpsM = calculateHaversineDistance(latGps, lngGps, latExif, lngExif);
    }

    // Calculate tingkat keyakinan on server
    const serverTimestamp = new Date().toISOString();
    const { tingkat } = calculateTingkatKeyakinan({
      gpsLat: latGps,
      gpsLng: lngGps,
      exifLat: latExif,
      exifLng: lngExif,
      dateTimeOriginal,
      serverTimestamp,
    });

    const newReport = await addLaporan({
      foto_url: body.foto_url,
      lat_gps: latGps,
      lng_gps: lngGps,
      lat_exif: latExif,
      lng_exif: lngExif,
      jarak_exif_gps_m: jarakExifGpsM,
      flag_manual: tingkat !== 'TINGGI',
      wilayah: body.wilayah || 'Wilayah Tidak Teridentifikasi',
      deskripsi: body.deskripsi || '',
      skala: body.skala || 'SEDANG',
      tingkat_keyakinan: tingkat,
      date_time_original: dateTimeOriginal,
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
