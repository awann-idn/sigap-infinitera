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

export const EXIF_FLAG_THRESHOLD_METERS = 500;

export interface GeoComparisonResult {
  distanceMeters: number | null;
  flagManualVerification: boolean;
  reason: string;
}

export function evaluateLocationIntegrity(
  gpsLat: number,
  gpsLng: number,
  exifLat?: number,
  exifLng?: number
): GeoComparisonResult {
  if (exifLat === undefined || exifLng === undefined) {
    return {
      distanceMeters: null,
      flagManualVerification: false,
      reason: 'Foto tidak mengandung metadata GPS EXIF',
    };
  }

  const distance = calculateHaversineDistance(gpsLat, gpsLng, exifLat, exifLng);
  const isFlagged = distance > EXIF_FLAG_THRESHOLD_METERS;

  return {
    distanceMeters: distance,
    flagManualVerification: isFlagged,
    reason: isFlagged
      ? `Selisih lokasi GPS & EXIF (${distance}m) melebihi ambang batas ${EXIF_FLAG_THRESHOLD_METERS}m`
      : `Lokasi GPS & EXIF cocok (selisih ${distance}m)`,
  };
}
