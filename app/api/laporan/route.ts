import { NextResponse } from 'next/server';
import { getLaporanList, addLaporan } from '@/lib/db/store';
import { validateStaffSession } from '@/lib/auth';
import { getClientIp, checkRateLimit } from '@/lib/rateLimit';
import {
  calculateHaversineDistance,
  calculateTingkatKeyakinan,
} from '@/lib/geo';

// Selalu fetch fresh dari database — jangan pernah cache oleh Next.js atau CDN
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wantsAll = searchParams.get('scope') === 'all';

    let includeUnpublished = false;
    if (wantsAll) {
      const isAuthorized = await validateStaffSession(request);
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: 'Sesi petugas tidak valid atau telah berakhir. Silakan login kembali.' },
          { status: 401 }
        );
      }
      includeUnpublished = true;
    }

    const list = includeUnpublished
      ? await getLaporanList()
      : await getLaporanList({ onlyPublished: true });
    return NextResponse.json(
      { success: true, data: list },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let requestCoordinates = { lat: 0, lng: 0 };
  try {
    // 1. Rate Limiting: Max 3 reports per IP per 10 minutes
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak laporan dari perangkat ini. Coba lagi dalam beberapa menit.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const foto = body.foto || body.foto_url;
    const latRaw = body.lat ?? body.lat_gps;
    const lngRaw = body.lng ?? body.lng_gps;

    if (!foto || latRaw === undefined || lngRaw === undefined) {
      return NextResponse.json(
        { success: false, error: 'Foto dan koordinat GPS wajib diisi' },
        { status: 400 }
      );
    }

    // Server-side photo validation:
    // - Maksimal 5 MB
    // - Hanya image/jpeg, image/png, image/webp
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    let photoType = body.foto_tipe ? String(body.foto_tipe).toLowerCase() : undefined;
    let photoSize = body.foto_size != null ? Number(body.foto_size) : undefined;

    if (typeof foto === 'string' && foto.startsWith('data:')) {
      const match = foto.match(/^data:([^;]+);base64,/i);
      if (match) {
        photoType = match[1].toLowerCase();
      }
      const base64Data = foto.replace(/^data:[^;]+;base64,/i, '');
      photoSize = Buffer.from(base64Data, 'base64').length;
    }

    if (photoType && !ALLOWED_IMAGE_TYPES.includes(photoType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Format foto tidak didukung. Hanya file image/jpeg, image/png, dan image/webp yang diizinkan.',
        },
        { status: 400 }
      );
    }

    if (photoSize != null && photoSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ukuran foto melebihi batas maksimal 5 MB.',
        },
        { status: 400 }
      );
    }

    const latGps = Number(latRaw);
    const lngGps = Number(lngRaw);
    requestCoordinates = { lat: latGps, lng: lngGps };

    const akurasiGps = body.akurasi_gps != null ? Number(body.akurasi_gps) : undefined;
    const latExif = body.lat_exif != null ? Number(body.lat_exif) : (body.exif_lat != null ? Number(body.exif_lat) : undefined);
    const lngExif = body.lng_exif != null ? Number(body.lng_exif) : (body.exif_lng != null ? Number(body.exif_lng) : undefined);
    const dateTimeOriginal = body.date_time_original || body.waktu_jepret_exif || undefined;
    const sumberKoordinat: 'gps' | 'manual' = body.sumber_koordinat === 'manual' ? 'manual' : 'gps';

    // ── LOG LAPORAN MASUK ────────────────────────────────────────────────────
    console.log('[LAPORAN MASUK]', {
      waktu       : new Date().toISOString(),
      koordinat_gps: { lat: latGps, lng: lngGps },
      akurasi_gps : akurasiGps != null ? `±${akurasiGps}m` : null,
      koordinat_exif: latExif != null && lngExif != null
        ? { lat: latExif, lng: lngExif }
        : null,
      waktu_jepret_exif: dateTimeOriginal ?? null,
      sumber_koordinat: sumberKoordinat,
    });

    // Calculate distance on server
    let jarakExifGpsM: number | undefined;
    if (latExif != null && lngExif != null) {
      jarakExifGpsM = calculateHaversineDistance(latGps, lngGps, latExif, lngExif);
      console.log(`[LAPORAN] Selisih jarak GPS vs EXIF: ${jarakExifGpsM}m`);
    } else {
      console.warn('[LAPORAN] Koordinat EXIF tidak ada \u2014 tingkat keyakinan akan TINJAUAN/CURIGA');
    }

    // Calculate tingkat keyakinan on server
    const serverTimestamp = new Date().toISOString();
    const { tingkat, reason } = calculateTingkatKeyakinan({
      gpsLat: latGps,
      gpsLng: lngGps,
      exifLat: latExif,
      exifLng: lngExif,
      dateTimeOriginal,
      serverTimestamp,
      sumberKoordinat,
    });
    console.log(`[LAPORAN] Tingkat keyakinan: ${tingkat} \u2014 ${reason}`);

    const newReport = await addLaporan({
      foto: foto,
      foto_url: foto,
      lat: latGps,
      lng: lngGps,
      lat_gps: latGps,
      lng_gps: lngGps,
      akurasi_gps: akurasiGps,
      lat_exif: latExif,
      lng_exif: lngExif,
      exif_lat: latExif,
      exif_lng: lngExif,
      jarak_exif_gps_m: jarakExifGpsM,
      selisih_jarak: jarakExifGpsM,
      flag_manual: tingkat !== 'TINGGI' || sumberKoordinat === 'manual',
      sumber_koordinat: sumberKoordinat,
      wilayah: body.wilayah || 'Wilayah Tidak Teridentifikasi',
      deskripsi: body.deskripsi || '',
      skala: body.skala || 'SEDANG',
      tingkat_keyakinan: tingkat,
      date_time_original: dateTimeOriginal,
      waktu_jepret_exif: dateTimeOriginal,
      status_verifikasi: 'menunggu-tinjauan',
      status_penanganan: 'menunggu',
      alasan_tidak_valid: null,
    });

    if (!newReport || !newReport.id) {
      throw new Error('Database tidak mengembalikan ID laporan baru');
    }

    // ── LOG SIMPAN BERHASIL ──────────────────────────────────────────────────
    console.log('[LAPORAN TERSIMPAN]', {
      id            : newReport.id,
      kode          : newReport.kode_laporan || newReport.kode,
      waktu_terima  : newReport.created_at,
      koordinat_gps : { lat: newReport.lat_gps, lng: newReport.lng_gps },
      koordinat_exif: latExif != null ? { lat: latExif, lng: lngExif } : null,
      selisih_jarak : jarakExifGpsM != null ? `${jarakExifGpsM}m` : null,
      tingkat_keyakinan: newReport.tingkat_keyakinan,
      status        : 'BERHASIL',
    });

    return NextResponse.json({ success: true, data: newReport }, { status: 201 });
  } catch (error: any) {
    console.error(
      `[LAPORAN GAGAL DISIMPAN] Waktu: ${new Date().toISOString()} | Koordinat: (${requestCoordinates.lat}, ${
        requestCoordinates.lng
      }) | Detail Error:`,
      error?.stack || error?.message || error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message ? `Gagal menyimpan laporan: ${error.message}` : 'Gagal menyimpan laporan ke database',
      },
      { status: 500 }
    );
  }
}
