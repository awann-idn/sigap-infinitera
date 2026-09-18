/**
 * Calculates Haversine distance in meters between two lat/lng points.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// --- Tingkat Keyakinan System ---

export type TingkatKeyakinan = 'TINGGI' | 'TINJAUAN' | 'CURIGA';

export interface TingkatKeyakinanParams {
  /** GPS latitude from browser */
  gpsLat: number;
  /** GPS longitude from browser */
  gpsLng: number;
  /** EXIF latitude from photo (null if not available) */
  exifLat?: number | null;
  /** EXIF longitude from photo (null if not available) */
  exifLng?: number | null;
  /** DateTimeOriginal from EXIF as ISO string (null if not available) */
  dateTimeOriginal?: string | null;
  /** Server timestamp when the report is received (ISO string) */
  serverTimestamp?: string;
  /** Source of coordinates: 'gps' (auto) or 'manual' (pin drag) */
  sumberKoordinat?: 'gps' | 'manual';
}

export interface TingkatKeyakinanResult {
  tingkat: TingkatKeyakinan;
  jarakMeter: number | null;
  reason: string;
}

/**
 * Calculates the confidence level (tingkat keyakinan) for a report.
 *
 * - TINGGI   : EXIF GPS exists AND distance < 100m
 * - TINJAUAN : EXIF GPS exists but distance 100m–5km, OR EXIF without GPS
 * - CURIGA   : distance > 5km, OR DateTimeOriginal differs > 2h from server time
 */
export function calculateTingkatKeyakinan(
  params: TingkatKeyakinanParams
): TingkatKeyakinanResult {
  const {
    gpsLat,
    gpsLng,
    exifLat,
    exifLng,
    dateTimeOriginal,
    serverTimestamp,
    sumberKoordinat = 'gps',
  } = params;

  // Manual pin coordinates are capped at TINJAUAN (never TINGGI)
  const isManual = sumberKoordinat === 'manual';

  const serverTime = serverTimestamp ? new Date(serverTimestamp) : new Date();

  // Check DateTimeOriginal age
  let dateTimeTooOld = false;
  if (dateTimeOriginal) {
    const exifTime = new Date(dateTimeOriginal);
    const diffMs = Math.abs(serverTime.getTime() - exifTime.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 2) {
      dateTimeTooOld = true;
    }
  }

  // No EXIF GPS available
  if (exifLat == null || exifLng == null) {
    // EXIF without GPS → TINJAUAN (unless dateTime is too old → CURIGA)
    if (dateTimeTooOld) {
      return {
        tingkat: 'CURIGA',
        jarakMeter: null,
        reason: 'EXIF tanpa GPS dan waktu jepret berbeda > 2 jam dari waktu server',
      };
    }
    return {
      tingkat: 'TINJAUAN',
      jarakMeter: null,
      reason: 'Foto tidak mengandung koordinat GPS EXIF, perlu tinjauan manual',
    };
  }

  // EXIF GPS available — calculate distance
  const distance = calculateHaversineDistance(gpsLat, gpsLng, exifLat, exifLng);

  // DateTimeOriginal too old → CURIGA regardless of distance
  if (dateTimeTooOld) {
    return {
      tingkat: 'CURIGA',
      jarakMeter: distance,
      reason: `Waktu jepret EXIF berbeda > 2 jam dari waktu server (selisih GPS: ${distance}m)`,
    };
  }

  // Distance > 5km → CURIGA
  if (distance > 5000) {
    return {
      tingkat: 'CURIGA',
      jarakMeter: distance,
      reason: `Selisih lokasi GPS & EXIF (${distance}m) melebihi 5 km`,
    };
  }

  // Distance 100m–5km → TINJAUAN
  if (distance >= 100) {
    return {
      tingkat: 'TINJAUAN',
      jarakMeter: distance,
      reason: `Selisih lokasi GPS & EXIF (${distance}m) antara 100m–5km, perlu tinjauan`,
    };
  }

  // Distance < 100m → TINGGI (but cap to TINJAUAN if manual pin)
  if (isManual) {
    return {
      tingkat: 'TINJAUAN',
      jarakMeter: distance,
      reason: `Lokasi GPS & EXIF cocok (${distance}m) tetapi koordinat ditentukan manual`,
    };
  }

  return {
    tingkat: 'TINGGI',
    jarakMeter: distance,
    reason: `Lokasi GPS & EXIF cocok (selisih ${distance}m < 100m)`,
  };
}
