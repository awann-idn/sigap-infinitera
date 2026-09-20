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

export interface WilayahItem {
  id: string;
  name: string;
  type: 'Kota' | 'Kabupaten';
  center: [number, number];
}

export const WILAYAH_SUMSEL_LIST: WilayahItem[] = [
  { id: 'palembang', name: 'Palembang', type: 'Kota', center: [-2.9761, 104.7754] },
  { id: 'prabumulih', name: 'Prabumulih', type: 'Kota', center: [-3.4312, 104.2342] },
  { id: 'pagar_alam', name: 'Pagar Alam', type: 'Kota', center: [-4.0305, 103.2625] },
  { id: 'lubuklinggau', name: 'Lubuklinggau', type: 'Kota', center: [-3.2964, 102.8617] },
  { id: 'banyuasin', name: 'Banyuasin', type: 'Kabupaten', center: [-2.8833, 104.3833] },
  { id: 'ogan_ilir', name: 'Ogan Ilir', type: 'Kabupaten', center: [-3.4333, 104.6000] },
  { id: 'ogan_komering_ilir', name: 'Ogan Komering Ilir', type: 'Kabupaten', center: [-3.4000, 105.1500] },
  { id: 'ogan_komering_ulu', name: 'Ogan Komering Ulu', type: 'Kabupaten', center: [-4.1333, 104.1667] },
  { id: 'oku_timur', name: 'OKU Timur', type: 'Kabupaten', center: [-3.8583, 104.7528] },
  { id: 'oku_selatan', name: 'OKU Selatan', type: 'Kabupaten', center: [-4.6583, 104.0083] },
  { id: 'muara_enim', name: 'Muara Enim', type: 'Kabupaten', center: [-3.6500, 103.7833] },
  { id: 'musi_banyuasin', name: 'Musi Banyuasin', type: 'Kabupaten', center: [-2.8889, 103.8167] },
  { id: 'musi_rawas', name: 'Musi Rawas', type: 'Kabupaten', center: [-3.0833, 103.2000] },
  { id: 'musi_rawas_utara', name: 'Musi Rawas Utara', type: 'Kabupaten', center: [-2.7500, 102.9167] },
  { id: 'lahat', name: 'Lahat', type: 'Kabupaten', center: [-3.7833, 103.5333] },
  { id: 'empat_lawang', name: 'Empat Lawang', type: 'Kabupaten', center: [-3.7500, 103.0833] },
  { id: 'pali', name: 'Penukal Abab Lematang Ilir', type: 'Kabupaten', center: [-3.2167, 103.8500] },
];

export function matchWilayahSumsel(wilayahText: string): string | null {
  if (!wilayahText) return null;
  const lower = wilayahText.toLowerCase();

  // Multi-word matches first to avoid prefix collisions
  if (lower.includes('musi rawas utara') || /\bmuratara\b/i.test(lower)) return 'musi_rawas_utara';
  if (lower.includes('musi rawas') || /\bmura\b/i.test(lower)) return 'musi_rawas';
  if (lower.includes('musi banyuasin') || /\bmuba\b/i.test(lower) || lower.includes('sekayu')) return 'musi_banyuasin';
  if (lower.includes('banyuasin')) return 'banyuasin';
  if (lower.includes('oku timur') || lower.includes('komering ulu timur')) return 'oku_timur';
  if (lower.includes('oku selatan') || lower.includes('komering ulu selatan')) return 'oku_selatan';
  if (lower.includes('ogan komering ilir') || /\boki\b/i.test(lower)) return 'ogan_komering_ilir';
  if (lower.includes('ogan komering ulu') || /\boku\b/i.test(lower) || lower.includes('baturaja')) return 'ogan_komering_ulu';
  if (lower.includes('ogan ilir') || /\boi\b/i.test(lower) || lower.includes('indralaya') || lower.includes('timbangan')) return 'ogan_ilir';
  if (lower.includes('penukal abab') || /\bpali\b/i.test(lower) || lower.includes('lematang ilir') || lower.includes('talang ubi')) return 'pali';
  if (lower.includes('muara enim')) return 'muara_enim';
  if (lower.includes('lahat')) return 'lahat';
  if (lower.includes('empat lawang') || lower.includes('tebing tinggi')) return 'empat_lawang';
  if (lower.includes('prabumulih')) return 'prabumulih';
  if (lower.includes('pagar alam') || lower.includes('pagaralam')) return 'pagar_alam';
  if (lower.includes('lubuklinggau') || lower.includes('lubuk linggau')) return 'lubuklinggau';
  if (lower.includes('palembang') || lower.includes('gandus') || lower.includes('sukarami') || lower.includes('seberang ulu')) return 'palembang';

  return null;
}
