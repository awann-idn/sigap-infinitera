import { createClient } from '@supabase/supabase-js';

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
  wilayah: string;
  deskripsi: string;
  skala: 'KECIL' | 'SEDANG' | 'BESAR';
  status_verifikasi: 'belum-diverifikasi' | 'terverifikasi' | 'spam';
  status_penanganan: 'menunggu' | 'diproses' | 'selesai';
  petugas_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StatisticsData {
  totalLaporan: number;
  terverifikasi: number;
  wilayahTerbanyak: string;
}

const INITIAL_SEED: LaporanItem[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    kode: 'SIGAP-20260916-001',
    foto_url: '/images/karhutla_smoke_forest.png',
    lat_gps: 0.5071,
    lng_gps: 101.4478,
    lat_exif: 0.5073,
    lng_exif: 101.448,
    jarak_exif_gps_m: 30,
    flag_manual: false,
    wilayah: 'Kec. Tampan, Pekanbaru, Riau',
    deskripsi: 'Asap tebal membumbung tinggi dari lahan gambut di pinggir jalan raya.',
    skala: 'BESAR',
    status_verifikasi: 'terverifikasi',
    status_penanganan: 'diproses',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    kode: 'SIGAP-20260916-002',
    foto_url: '/images/firefighter_action.png',
    lat_gps: -0.0263,
    lng_gps: 109.3425,
    lat_exif: -0.035,
    lng_exif: 109.35,
    jarak_exif_gps_m: 1200,
    flag_manual: true,
    wilayah: 'Kec. Sungai Raya, Kubu Raya, Kalbar',
    deskripsi: 'Api membakar semak belukar dekat batas pekarangan rumah.',
    skala: 'SEDANG',
    status_verifikasi: 'belum-diverifikasi',
    status_penanganan: 'menunggu',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    kode: 'SIGAP-20260916-003',
    foto_url: '/images/drone_monitoring.png',
    lat_gps: -2.21,
    lng_gps: 113.92,
    wilayah: 'Kec. Jekan Raya, Palangka Raya, Kalteng',
    deskripsi: 'Titik api kecil bekas pembakaran sampah lahan meluas.',
    skala: 'KECIL',
    status_verifikasi: 'terverifikasi',
    status_penanganan: 'selesai',
    flag_manual: false,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryStore: LaporanItem[] = [...INITIAL_SEED];

export async function getLaporanList(): Promise<LaporanItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('laporan')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as LaporanItem[];
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local store:', e);
    }
  }

  return memoryStore;
}

export async function addLaporan(
  laporan: Omit<LaporanItem, 'id' | 'kode' | 'created_at' | 'updated_at'>
): Promise<LaporanItem> {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = memoryStore.length + 1;
  const kode = `SIGAP-${todayStr}-${String(countToday).padStart(3, '0')}`;

  const newItem: LaporanItem = {
    ...laporan,
    id: `id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    kode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.from('laporan').insert([newItem]).select();
      if (!error && data && data.length > 0) {
        memoryStore.unshift(data[0] as LaporanItem);
        return data[0] as LaporanItem;
      }
    } catch (e) {
      console.warn('Supabase insert failed, using fallback store:', e);
    }
  }

  memoryStore.unshift(newItem);
  return newItem;
}

export async function updateLaporanStatus(
  id: string,
  status_verifikasi?: 'belum-diverifikasi' | 'terverifikasi' | 'spam',
  status_penanganan?: 'menunggu' | 'diproses' | 'selesai'
): Promise<LaporanItem | null> {
  const index = memoryStore.findIndex((item) => item.id === id || item.kode === id);
  if (index === -1) return null;

  if (status_verifikasi) memoryStore[index].status_verifikasi = status_verifikasi;
  if (status_penanganan) memoryStore[index].status_penanganan = status_penanganan;
  memoryStore[index].updated_at = new Date().toISOString();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const updates: Partial<LaporanItem> = { updated_at: new Date().toISOString() };
      if (status_verifikasi) updates.status_verifikasi = status_verifikasi;
      if (status_penanganan) updates.status_penanganan = status_penanganan;

      await supabase.from('laporan').update(updates).eq('id', memoryStore[index].id);
    } catch (e) {
      console.warn('Supabase update failed:', e);
    }
  }

  return memoryStore[index];
}

export async function getStatistics(): Promise<StatisticsData> {
  const list = await getLaporanList();
  const terverifikasi = list.filter((item) => item.status_verifikasi === 'terverifikasi').length;

  const regionCounts: Record<string, number> = {};
  list.forEach((item) => {
    const reg = item.wilayah || 'Lainnya';
    regionCounts[reg] = (regionCounts[reg] || 0) + 1;
  });

  let topRegion = 'Pekanbaru, Riau';
  let maxCount = 0;
  Object.entries(regionCounts).forEach(([reg, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topRegion = reg;
    }
  });

  return {
    totalLaporan: list.length,
    terverifikasi,
    wilayahTerbanyak: topRegion,
  };
}
