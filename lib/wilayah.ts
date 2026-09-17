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
