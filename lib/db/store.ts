import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeWilayahCity } from '@/lib/wilayah';
import type { TingkatKeyakinan } from '@/lib/geo';

export type StatusVerifikasi =
  | 'menunggu-tinjauan'
  | 'terverifikasi'
  | 'tidak-valid'
  | 'belum-diverifikasi'
  | 'spam';

export interface LaporanItem {
  id: string;
  kode: string;
  foto_url: string;
  lat_gps: number;
  lng_gps: number;
  akurasi_gps?: number;
  lat_exif?: number | null;
  lng_exif?: number | null;
  exif_lat?: number | null;
  exif_lng?: number | null;
  jarak_exif_gps_m?: number | null;
  selisih_jarak?: number | null;
  flag_manual: boolean;
  sumber_koordinat: 'gps' | 'manual';
  wilayah: string;
  deskripsi: string;
  skala: 'KECIL' | 'SEDANG' | 'BESAR';
  tingkat_keyakinan: TingkatKeyakinan;
  date_time_original?: string | null;
  waktu_jepret_exif?: string | null;
  status_verifikasi: StatusVerifikasi;
  status_penanganan: 'menunggu' | 'diproses' | 'selesai';
  alasan_tidak_valid?: string | null;
  petugas_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StatisticsData {
  totalTerverifikasi: number;
  penangananSelesai: number;
  wilayahTerbanyak: string;
}

const INITIAL_SEED: LaporanItem[] = [];

const DATA_FILE = path.join(process.cwd(), 'data', 'laporan.json');

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function readData(): LaporanItem[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        let verif = item.status_verifikasi;
        if (verif === 'belum-diverifikasi') verif = 'menunggu-tinjauan';
        if (verif === 'spam') verif = 'tidak-valid';
        return {
          ...item,
          status_verifikasi: verif || 'menunggu-tinjauan',
        };
      });
    }
  } catch (err) {
    console.error('[DATABASE ERROR] Gagal membaca data/laporan.json:', err);
  }
  return [];
}

function writeData(data: LaporanItem[]): void {
  try {
    ensureDataFile();
    const serialized = JSON.stringify(data, null, 2);
    // Write directly to file
    fs.writeFileSync(DATA_FILE, serialized, 'utf-8');
  } catch (err) {
    console.error('[DATABASE ERROR] Gagal menyimpan data/laporan.json:', err);
    throw new Error('Gagal menyimpan laporan ke penyimpanan persisten');
  }
}

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
  const allReports = readData();

  if (onlyPublished) {
    // Publik hanya menampilkan laporan yang sudah terverifikasi
    // Koordinat dibulatkan ke presisi ±100 meter (3 desimal) untuk melindungi privasi properti
    return allReports
      .filter((item) => item.status_verifikasi === 'terverifikasi')
      .map((item) => ({
        ...item,
        lat_gps: Math.round(item.lat_gps * 1000) / 1000,
        lng_gps: Math.round(item.lng_gps * 1000) / 1000,
        lat_exif: undefined,
        lng_exif: undefined,
        exif_lat: undefined,
        exif_lng: undefined,
      }));
  }

  return onlyVerified
    ? allReports.filter((item) => item.status_verifikasi === 'terverifikasi')
    : allReports;
}

export async function addLaporan(
  laporan: Omit<LaporanItem, 'id' | 'kode' | 'created_at' | 'updated_at'>
): Promise<LaporanItem> {
  const allReports = readData();

  // 1. Generate unique ID using UUID
  const id = crypto.randomUUID();

  // 2. Calculate unique sequential kode: SIGAP-YYYYMMDD-NNN based on actual reports today
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePrefix = `SIGAP-${y}${m}${d}-`;

  // Find max sequence number strictly for reports on this exact date
  let maxSeq = 0;
  for (const item of allReports) {
    if (item.kode && item.kode.startsWith(datePrefix)) {
      const suffix = item.kode.slice(datePrefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const kode = `${datePrefix}${String(nextSeq).padStart(3, '0')}`;
  const nowIso = now.toISOString();

  // 3. Populate standard fields and aliases
  const latExif = laporan.lat_exif ?? laporan.exif_lat ?? null;
  const lngExif = laporan.lng_exif ?? laporan.exif_lng ?? null;
  const jarakM = laporan.jarak_exif_gps_m ?? laporan.selisih_jarak ?? null;
  const dateTime = laporan.date_time_original ?? laporan.waktu_jepret_exif ?? null;

  const newItem: LaporanItem = {
    ...laporan,
    id,
    kode,
    lat_exif: latExif,
    lng_exif: lngExif,
    exif_lat: latExif,
    exif_lng: lngExif,
    jarak_exif_gps_m: jarakM,
    selisih_jarak: jarakM,
    date_time_original: dateTime,
    waktu_jepret_exif: dateTime,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 4. TRUE INSERT (unshift new report into persistent array)
  allReports.unshift(newItem);
  writeData(allReports);

  // 5. Best-effort background sync to Supabase if configured (omit columns not in remote schema)
  const supabase = getSupabase();
  if (supabase) {
    try {
      const supabasePayload: Record<string, any> = {
        id: newItem.id,
        kode: newItem.kode,
        foto_url: newItem.foto_url,
        lat_gps: newItem.lat_gps,
        lng_gps: newItem.lng_gps,
        lat_exif: newItem.lat_exif,
        lng_exif: newItem.lng_exif,
        jarak_exif_gps_m: newItem.jarak_exif_gps_m,
        flag_manual: newItem.flag_manual,
        wilayah: newItem.wilayah,
        deskripsi: newItem.deskripsi,
        skala: newItem.skala,
        status_verifikasi: newItem.status_verifikasi,
        status_penanganan: newItem.status_penanganan,
        created_at: newItem.created_at,
        updated_at: newItem.updated_at,
      };
      supabase.from('laporan').insert([supabasePayload]).then(({ error }) => {
        if (error) {
          console.warn('[SUPABASE SYNC WARNING] Gagal sync ke remote Supabase:', error.message);
        }
      });
    } catch (e) {
      console.warn('[SUPABASE SYNC WARNING] Supabase sync exception:', e);
    }
  }

  return newItem;
}

export type LaporanUpdate = Partial<
  Pick<
    LaporanItem,
    | 'status_verifikasi'
    | 'status_penanganan'
    | 'deskripsi'
    | 'wilayah'
    | 'alasan_tidak_valid'
  >
>;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function updateLaporan(
  id: string,
  fields: LaporanUpdate
): Promise<LaporanItem | null> {
  const allReports = readData();
  const index = allReports.findIndex((item) => item.id === id || item.kode === id);
  if (index === -1) return null;

  const updatedItem: LaporanItem = {
    ...allReports[index],
    ...fields,
    updated_at: new Date().toISOString(),
  };

  allReports[index] = updatedItem;
  writeData(allReports);

  // Best effort sync to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const updates = { ...fields, updated_at: updatedItem.updated_at };
      let query = supabase.from('laporan').update(updates);
      query = isUuid(id) ? query.eq('id', id) : query.eq('kode', id);
      query.then(({ error }) => {
        if (error) console.warn('[SUPABASE SYNC WARNING] Gagal update remote:', error.message);
      });
    } catch (e) {
      console.warn('[SUPABASE SYNC WARNING] Supabase update exception:', e);
    }
  }

  return updatedItem;
}

export async function deleteLaporan(id: string): Promise<boolean> {
  const allReports = readData();
  const index = allReports.findIndex((item) => item.id === id || item.kode === id);
  if (index === -1) return false;

  allReports.splice(index, 1);
  writeData(allReports);

  // Best effort sync to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('laporan').delete();
      query = isUuid(id) ? query.eq('id', id) : query.eq('kode', id);
      query.then(({ error }) => {
        if (error) console.warn('[SUPABASE SYNC WARNING] Gagal delete remote:', error.message);
      });
    } catch (e) {
      console.warn('[SUPABASE SYNC WARNING] Supabase delete exception:', e);
    }
  }

  return true;
}

export async function getStatistics(): Promise<StatisticsData> {
  const list = await getLaporanList({ onlyVerified: true });
  const penangananSelesai = list.filter((item) => item.status_penanganan === 'selesai').length;

  const regionCounts: Record<string, number> = {};
  list.forEach((item) => {
    const reg = normalizeWilayahCity(item.wilayah || '');
    regionCounts[reg] = (regionCounts[reg] || 0) + 1;
  });

  let topRegion = '-';
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
    wilayahTerbanyak: list.length === 0 ? '-' : topRegion,
  };
}
