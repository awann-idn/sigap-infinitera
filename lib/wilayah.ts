/**
 * Menyederhanakan nama wilayah menjadi tingkat kota/kabupaten + provinsi.
 * Contoh: "Kec. Gandus, Kota Palembang, Sumatera Selatan"
 *      -> "Kota Palembang, Sumatera Selatan"
 */
export function normalizeWilayahCity(wilayah: string): string {
  if (!wilayah) return 'Sumatera Selatan';

  const parts = wilayah
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'Sumatera Selatan';

  const province =
    parts.find((part) => /sumatera selatan|sumsel/i.test(part)) || 'Sumatera Selatan';

  const cityPart =
    parts.find((part) => /^(kota|kab\.?|kabupaten)\b/i.test(part)) ||
    parts.find((part) => /kota|kabupaten/i.test(part)) ||
    (parts.length >= 2 ? parts[parts.length - 2] : parts[0]);

  const cleaned = cityPart
    .replace(/^kec\.?\s*/i, '')
    .replace(/^kecamatan\s*/i, '')
    .trim();

  return `${cleaned}, ${province}`;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SIGAP-Infinitera-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    const address = data.address;

    if (!address) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const district = address.subdistrict || address.village || address.town || address.suburb;
    const regency = address.city || address.regency || address.county;
    const state = address.state;

    const parts = [district, regency, state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return `Kawasan Lahan (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
  }
}
