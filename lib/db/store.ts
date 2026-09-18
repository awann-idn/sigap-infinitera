import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeWilayahCity } from '@/lib/wilayah';
import type { TingkatKeyakinan } from '@/lib/geo';

export interface LaporanItem {
  id: string;
  kode: string;
  foto_url: string;
  lat_gps: number;
  lng_gps: number;
  lat_exif?: number;
  lng_exif?: number;
  jarak_exif_gps_m?: number;
  flag_manual: boolean;
  sumber_koordinat: 'gps' | 'manual';
  wilayah: string;
  deskripsi: string;
  skala: 'KECIL' | 'SEDANG' | 'BESAR';
  tingkat_keyakinan: TingkatKeyakinan;
  date_time_original?: string;
  status_verifikasi: 'belum-diverifikasi' | 'terverifikasi' | 'spam';
  status_penanganan: 'menunggu' | 'diproses' | 'selesai';
  petugas_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StatisticsData {
  totalTerverifikasi: number;
  penangananSelesai: number;
  wilayahTerbanyak: string;
}

const INITIAL_SEED: LaporanItem[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    kode: 'SIGAP-20260916-001',
    foto_url: '/images/karhutla_smoke_forest.png',
    lat_gps: -3.0037,
    lng_gps: 104.706,
    lat_exif: -3.0039,
    lng_exif: 104.7062,
    jarak_exif_gps_m: 30,
    flag_manual: false,
    sumber_koordinat: 'gps',
    wilayah: 'Kec. Gandus, Kota Palembang, Sumatera Selatan',
    deskripsi: 'Asap tebal membumbung tinggi dari lahan gambut kering di tepi Sungai Musi.',
    skala: 'BESAR',
    tingkat_keyakinan: 'TINGGI',
    date_time_original: new Date(Date.now() - 2 * 3600 * 1000 - 5 * 60 * 1000).toISOString(),
    status_verifikasi: 'terverifikasi',
    status_penanganan: 'diproses',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    kode: 'SIGAP-20260916-002',
    foto_url: '/images/firefighter_action.png',
    lat_gps: -2.9176,
    lng_gps: 104.7063,
    lat_exif: -2.948,
    lng_exif: 104.701,
    jarak_exif_gps_m: 3430,
    flag_manual: true,
    sumber_koordinat: 'gps',
    wilayah: 'Kec. Sukarami, Kota Palembang, Sumatera Selatan',
    deskripsi: 'Api membakar semak dan rerumputan kering dekat permukiman warga.',
    skala: 'SEDANG',
    tingkat_keyakinan: 'TINJAUAN',
    date_time_original: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    status_verifikasi: 'belum-diverifikasi',
    status_penanganan: 'menunggu',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    kode: 'SIGAP-20260916-003',
    foto_url: '/images/drone_monitoring.png',
    lat_gps: -3.2456,
    lng_gps: 104.657,
    sumber_koordinat: 'gps',
    wilayah: 'Kec. Indralaya, Kab. Ogan Ilir, Sumatera Selatan',
    deskripsi: 'Titik api kecil bekas pembakaran lahan semak yang mulai meluas.',
    skala: 'KECIL',
    tingkat_keyakinan: 'TINJAUAN',
    status_verifikasi: 'terverifikasi',
    status_penanganan: 'selesai',
    flag_manual: false,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryStore: LaporanItem[] = [...INITIAL_SEED];

function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
    return createClient(supabaseUrl, supabaseKey);
  }

  return null;
}

export interface LaporanQueryOptions {
  onlyVerified?: boolean;
  onlyPublished?: boolean;
}

export async function getLaporanList(options: LaporanQueryOptions = {}): Promise<LaporanItem[]> {
  const { onlyVerified = false, onlyPublished = false } = options;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const baseQuery = supabase
        .from('laporan')
        .select('*')
        .order('created_at', { ascending: false });

      let query = baseQuery;
      if (onlyPublished) {
        query = query
          .eq('status_verifikasi', 'terverifikasi')
          .in('status_penanganan', ['diproses', 'selesai']);
      } else if (onlyVerified) {
        query = query.eq('status_verifikasi', 'terverifikasi');
      }

      const { data, error } = await query;

      if (!error && data) {
        return data as LaporanItem[];
      }

      if (error) console.warn('Supabase fetch error:', error.message);
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local store:', e);
    }
  }

  if (onlyPublished) {
    return memoryStore.filter(
      (item) =>
        item.status_verifikasi === 'terverifikasi' &&
        item.status_penanganan !== 'menunggu'
    );
  }

  return onlyVerified
    ? memoryStore.filter((item) => item.status_verifikasi === 'terverifikasi')
    : memoryStore;
}

export async function addLaporan(
  laporan: Omit<LaporanItem, 'id' | 'kode' | 'created_at' | 'updated_at'>
): Promise<LaporanItem> {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const existing = await getLaporanList();
  const countToday = existing.length + 1;
  const kode = `SIGAP-${todayStr}-${String(countToday).padStart(3, '0')}`;

  const base = { ...laporan, kode };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('laporan').insert([base]).select();
      if (!error && data && data.length > 0) {
        memoryStore.unshift(data[0] as LaporanItem);
        return data[0] as LaporanItem;
      }
      if (error) console.warn('Supabase insert error:', error.message);
    } catch (e) {
      console.warn('Supabase insert failed, using fallback store:', e);
    }
  }

  const newItem: LaporanItem = {
    ...base,
    id: `id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryStore.unshift(newItem);
  return newItem;
}

export type LaporanUpdate = Partial<
  Pick<LaporanItem, 'status_verifikasi' | 'status_penanganan' | 'deskripsi' | 'wilayah'>
>;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function updateLaporan(
  id: string,
  fields: LaporanUpdate
): Promise<LaporanItem | null> {
  const updates = { ...fields, updated_at: new Date().toISOString() };

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('laporan').update(updates).select();
      query = isUuid(id) ? query.eq('id', id) : query.eq('kode', id);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const index = memoryStore.findIndex((item) => item.id === id || item.kode === id);
        if (index !== -1) memoryStore[index] = data[0] as LaporanItem;
        return data[0] as LaporanItem;
      }
      if (error) console.warn('Supabase update error:', error.message);
    } catch (e) {
      console.warn('Supabase update failed, using fallback store:', e);
    }
  }

  const index = memoryStore.findIndex((item) => item.id === id || item.kode === id);
  if (index === -1) return null;

  memoryStore[index] = { ...memoryStore[index], ...updates } as LaporanItem;
  return memoryStore[index];
}

export async function deleteLaporan(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const index = memoryStore.findIndex((item) => item.id === id || item.kode === id);

  if (supabase) {
    try {
      let query = supabase.from('laporan').delete();
      query = isUuid(id) ? query.eq('id', id) : query.eq('kode', id);
      const { error } = await query;

      if (error) {
        console.warn('Supabase delete error:', error.message);
        return false;
      }

      if (index !== -1) memoryStore.splice(index, 1);
      return true;
    } catch (e) {
      console.warn('Supabase delete failed:', e);
      return false;
    }
  }

  if (index !== -1) {
    memoryStore.splice(index, 1);
    return true;
  }

  return false;
}

export async function getStatistics(): Promise<StatisticsData> {
  const list = await getLaporanList({ onlyVerified: true });
  const penangananSelesai = list.filter((item) => item.status_penanganan === 'selesai').length;

  const regionCounts: Record<string, number> = {};
  list.forEach((item) => {
    const reg = normalizeWilayahCity(item.wilayah || '');
    regionCounts[reg] = (regionCounts[reg] || 0) + 1;
  });

  let topRegion = 'Kota Palembang, Sumatera Selatan';
  let maxCount = 0;
  Object.entries(regionCounts).forEach(([reg, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topRegion = reg;
    }
  });

  return {
    totalTerverifikasi: list.length,
    penangananSelesai,
    wilayahTerbanyak: topRegion,
  };
}
