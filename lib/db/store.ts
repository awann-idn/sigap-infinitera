import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { Redis } from '@upstash/redis';
import { canonicalCityLabel, matchWilayahSumsel } from '@/lib/wilayah';
import { type TingkatKeyakinan, isLuarWilayahSumsel, calculateTingkatKeyakinan } from '@/lib/geo';

export type StatusVerifikasi =
  | 'menunggu-tinjauan'
  | 'terverifikasi'
  | 'tidak-valid'
  | 'belum-diverifikasi'
  | 'spam';

export interface LaporanItem {
  id: string;
  kode_laporan?: string;
  kode: string;
  foto?: string;
  foto_url: string;
  lat?: number;
  lng?: number;
  lat_gps: number;
  lng_gps: number;
  akurasi_gps?: number | null;
  lat_exif?: number | null;
  lng_exif?: number | null;
  exif_lat?: number | null;
  exif_lng?: number | null;
  jarak_exif_gps_m?: number | null;
  selisih_jarak?: number | null;
  flag_manual?: boolean;
  sumber_koordinat: 'gps' | 'manual';
  luar_wilayah?: boolean;
  wilayah: string;
  deskripsi: string;
  skala?: 'KECIL' | 'SEDANG' | 'BESAR';
  tingkat_keyakinan: TingkatKeyakinan;
  date_time_original?: string | null;
  waktu_jepret_exif?: string | null;
  waktu_terima?: string;
  status_verifikasi: StatusVerifikasi;
  status_penanganan: 'menunggu' | 'diproses' | 'selesai';
  alasan_tidak_valid?: string | null;
  petugas_id?: string | null;
  is_seed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatisticsData {
  totalTerverifikasi: number;
  sedangDitangani: number;
  wilayahTerdampak: number;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'laporan.json');

/**
 * Menghapus kolom foto dari objek log agar tidak membanjiri terminal.
 * Mengganti base64 yang panjang dengan ringkasan ukuran.
 */
function sanitizeForLog(record: Record<string, any>): Record<string, any> {
  const result = { ...record };
  for (const key of ['foto', 'foto_url', 'foto_tipe']) {
    if (key in result) {
      const val = result[key];
      if (typeof val === 'string' && val.length > 100) {
        const kb = Math.round(val.length / 1024);
        result[key] = `<base64, ${kb} KB>`;
      } else if (val) {
        result[key] = '[ada]';
      } else {
        result[key] = '[kosong]';
      }
    }
  }
  return result;
}

// In-memory cache for fast read/write and fallback on serverless environments
let memoryCache: LaporanItem[] | null = null;
let dbInitialized = false;

// Short-lived cache so repeated reads (map, dashboard, stats) don't hit the DB
// on every request. Invalidated on every write.
let listCache: { key: string; data: LaporanItem[]; expiresAt: number } | null = null;
const LIST_CACHE_TTL_MS = 10_000;

function invalidateListCache(): void {
  listCache = null;
}

function maxSequenceFromCodes(codes: string[], datePrefix: string): number {
  let maxSeq = 0;
  for (const k of codes) {
    if (k && k.startsWith(datePrefix)) {
      const num = parseInt(k.slice(datePrefix.length), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }
  return maxSeq;
}

/**
 * Membaca seed data awal dari data/laporan.json secara read-only.
 * Memfilter keluar entri yang memiliki sumber_koordinat: 'manual'.
 */
function loadLocalSeedReports(): LaporanItem[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item.sumber_koordinat !== 'manual')
          .map((item) => mapRawToLaporanItem(item));
      }
    }
  } catch (err) {
    console.warn('[STORAGE WARNING] Gagal membaca seed file lokal:', err);
  }
  return [];
}

/**
 * Mapping baris data dari database / raw objek ke interface LaporanItem standar.
 */
function mapRawToLaporanItem(row: any): LaporanItem {
  const id = row.id || crypto.randomUUID();
  const kode = row.kode_laporan || row.kode || `SIGAP-${id.slice(0, 8)}`;
  const lat = Number(row.lat ?? row.lat_gps ?? 0);
  const lng = Number(row.lng ?? row.lng_gps ?? 0);
  const foto = row.foto || row.foto_url || '';
  const waktuTerima = row.waktu_terima
    ? new Date(row.waktu_terima).toISOString()
    : row.created_at
    ? new Date(row.created_at).toISOString()
    : new Date().toISOString();
  const waktuJepret = row.waktu_jepret_exif
    ? new Date(row.waktu_jepret_exif).toISOString()
    : row.date_time_original
    ? new Date(row.date_time_original).toISOString()
    : null;

  let statusVerif = row.status_verifikasi;
  if (statusVerif === 'belum-diverifikasi') statusVerif = 'menunggu-tinjauan';
  if (statusVerif === 'spam') statusVerif = 'tidak-valid';

  return {
    id,
    kode,
    kode_laporan: kode,
    foto,
    foto_url: foto,
    lat,
    lng,
    lat_gps: lat,
    lng_gps: lng,
    akurasi_gps: row.akurasi_gps != null ? Number(row.akurasi_gps) : null,
    // Accept both naming variants: exif_lat (Neon/canonical) and lat_exif (legacy)
    exif_lat: row.exif_lat != null ? Number(row.exif_lat) : row.lat_exif != null ? Number(row.lat_exif) : null,
    exif_lng: row.exif_lng != null ? Number(row.exif_lng) : row.lng_exif != null ? Number(row.lng_exif) : null,
    lat_exif: row.exif_lat != null ? Number(row.exif_lat) : row.lat_exif != null ? Number(row.lat_exif) : null,
    lng_exif: row.exif_lng != null ? Number(row.exif_lng) : row.lng_exif != null ? Number(row.lng_exif) : null,
    waktu_jepret_exif: waktuJepret,
    date_time_original: waktuJepret,
    selisih_jarak: row.selisih_jarak != null ? Number(row.selisih_jarak) : row.jarak_exif_gps_m != null ? Number(row.jarak_exif_gps_m) : null,
    jarak_exif_gps_m: row.selisih_jarak != null ? Number(row.selisih_jarak) : row.jarak_exif_gps_m != null ? Number(row.jarak_exif_gps_m) : null,
    sumber_koordinat: row.sumber_koordinat === 'manual' ? 'manual' : 'gps',
    flag_manual: row.flag_manual ?? false,
    wilayah: row.wilayah || '',
    deskripsi: row.deskripsi || '',
    skala: row.skala || 'SEDANG',
    tingkat_keyakinan:
      row.tingkat_keyakinan ||
      (row.lat_exif != null || row.exif_lat != null
        ? calculateTingkatKeyakinan({
            gpsLat: lat,
            gpsLng: lng,
            exifLat: row.exif_lat != null ? Number(row.exif_lat) : row.lat_exif != null ? Number(row.lat_exif) : null,
            exifLng: row.exif_lng != null ? Number(row.exif_lng) : row.lng_exif != null ? Number(row.lng_exif) : null,
            dateTimeOriginal: waktuJepret,
            serverTimestamp: waktuTerima,
            sumberKoordinat: row.sumber_koordinat,
          }).tingkat
        : 'TINJAUAN'),
    status_verifikasi: statusVerif || 'menunggu-tinjauan',
    status_penanganan: row.status_penanganan || 'menunggu',
    alasan_tidak_valid: row.alasan_tidak_valid || null,
    petugas_id: row.petugas_id || null,
    is_seed: row.is_seed != null ? Boolean(row.is_seed) : false,
    luar_wilayah: row.luar_wilayah != null ? Boolean(row.luar_wilayah) : isLuarWilayahSumsel(lat, lng),
    waktu_terima: waktuTerima,
    created_at: waktuTerima,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : waktuTerima,
  };
}

// 1. Inisialisasi Klien Vercel Postgres / Neon
function getNeonSql(): NeonQueryFunction<false, false> | null {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (connectionString && !connectionString.includes('dummy')) {
    try {
      return neon(connectionString);
    } catch (e) {
      console.warn('[NEON POSTGRES INIT ERROR]:', e);
    }
  }
  return null;
}

// 2. Inisialisasi Klien Upstash Redis / Vercel KV
function getUpstashRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return new Redis({ url, token });
    } catch (e) {
      console.warn('[UPSTASH REDIS INIT ERROR]:', e);
    }
  }
  return null;
}

// 3. Inisialisasi Klien Supabase
function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      return createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.warn('[SUPABASE INIT ERROR]:', e);
    }
  }
  return null;
}

/**
 * Memastikan tabel dan migrasi seed data berjalan pada koneksi database aktif.
 */
async function ensureDatabaseReady(): Promise<void> {
  if (dbInitialized) return;

  const sql = getNeonSql();
  if (sql) {
    try {
      // Buat tabel laporan jika belum ada
      await sql`
        CREATE TABLE IF NOT EXISTS public.laporan (
          id UUID PRIMARY KEY,
          kode_laporan VARCHAR(50) UNIQUE NOT NULL,
          waktu_terima TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          lat FLOAT NOT NULL,
          lng FLOAT NOT NULL,
          wilayah VARCHAR(255) NOT NULL,
          exif_lat FLOAT,
          exif_lng FLOAT,
          waktu_jepret_exif TIMESTAMPTZ,
          selisih_jarak INT,
          akurasi_gps FLOAT,
          sumber_koordinat VARCHAR(20) NOT NULL DEFAULT 'gps',
          tingkat_keyakinan VARCHAR(20) NOT NULL DEFAULT 'TINJAUAN',
          status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'menunggu-tinjauan',
          status_penanganan VARCHAR(30) NOT NULL DEFAULT 'menunggu',
          alasan_tidak_valid TEXT,
          deskripsi TEXT,
          foto TEXT NOT NULL,
          kode VARCHAR(50),
          lat_gps FLOAT,
          lng_gps FLOAT,
          foto_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Pastikan kolom luar_wilayah & is_seed ada di Postgres
      await sql`ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS luar_wilayah BOOLEAN DEFAULT false;`;
      await sql`ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;`;

      // Cek apakah tabel masih kosong, jika ya lakukan migrasi seed data (tanpa entri manual)
      const countResult = await sql`SELECT COUNT(*)::int as total FROM public.laporan`;
      const count = countResult[0]?.total || 0;

      if (count === 0) {
        console.log('[DATABASE SEED] Tabel laporan kosong. Memulai migrasi seed data ke Postgres...');
        const seeds = loadLocalSeedReports();
        for (const s of seeds) {
          await sql`
            INSERT INTO public.laporan (
              id, kode_laporan, waktu_terima, lat, lng, wilayah,
              exif_lat, exif_lng, waktu_jepret_exif, selisih_jarak,
              akurasi_gps, sumber_koordinat, tingkat_keyakinan,
              status_verifikasi, status_penanganan, alasan_tidak_valid,
              deskripsi, foto, kode, lat_gps, lng_gps, foto_url, created_at, updated_at
            ) VALUES (
              ${s.id}, ${s.kode}, ${s.created_at}, ${s.lat_gps}, ${s.lng_gps}, ${s.wilayah},
              ${s.exif_lat ?? null}, ${s.exif_lng ?? null}, ${s.waktu_jepret_exif ?? null}, ${s.selisih_jarak ?? null},
              ${s.akurasi_gps ?? null}, ${s.sumber_koordinat}, ${s.tingkat_keyakinan},
              ${s.status_verifikasi}, ${s.status_penanganan}, ${s.alasan_tidak_valid ?? null},
              ${s.deskripsi || ''}, ${s.foto_url}, ${s.kode}, ${s.lat_gps}, ${s.lng_gps}, ${s.foto_url}, ${s.created_at}, ${s.updated_at}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
        console.log(`[DATABASE SEED] Sukses memigrasikan ${seeds.length} laporan seed ke Postgres.`);
      }
      dbInitialized = true;
      return;
    } catch (err) {
      console.error('[DATABASE SETUP ERROR] Gagal inisialisasi tabel Postgres:', err);
    }
  }

  const redis = getUpstashRedis();
  if (redis) {
    try {
      const exists = await redis.exists('sigap:laporan:list');
      if (!exists) {
        const seeds = loadLocalSeedReports();
        if (seeds.length > 0) {
          await redis.set('sigap:laporan:list', JSON.stringify(seeds));
          console.log(`[UPSTASH REDIS] Sukses memigrasikan ${seeds.length} seed data ke Redis.`);
        }
      }
      dbInitialized = true;
      return;
    } catch (err) {
      console.error('[UPSTASH REDIS ERROR] Gagal inisialisasi Redis:', err);
    }
  }

  dbInitialized = true;
}

export interface LaporanQueryOptions {
  onlyVerified?: boolean;
  onlyPublished?: boolean;
}

/**
 * Mengambil daftar seluruh laporan dari database aktif (Postgres / Upstash / Supabase / Cache).
 */
export async function getLaporanList(options: LaporanQueryOptions = {}): Promise<LaporanItem[]> {
  const { onlyVerified = false, onlyPublished = false } = options;
  const cacheKey = `${onlyVerified ? 'v' : '0'}${onlyPublished ? 'p' : '0'}`;

  if (listCache && listCache.key === cacheKey && listCache.expiresAt > Date.now()) {
    return listCache.data;
  }

  await ensureDatabaseReady();

  let reports: LaporanItem[] = [];

  // 1. Prioritas Vercel Postgres / Neon
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.laporan
        ORDER BY waktu_terima DESC
      `;
      reports = rows.map((r) => mapRawToLaporanItem(r));
    } catch (err) {
      console.error('[NEON GET ERROR] Gagal query Postgres, fallback ke memori:', err);
    }
  }

  // 2. Prioritas Upstash Redis jika Postgres tidak ada
  if (reports.length === 0) {
    const redis = getUpstashRedis();
    if (redis) {
      try {
        const raw = await redis.get<string | LaporanItem[]>('sigap:laporan:list');
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            reports = parsed.map((item) => mapRawToLaporanItem(item));
          }
        }
      } catch (err) {
        console.error('[UPSTASH GET ERROR] Gagal query Redis:', err);
      }
    }
  }

  // 3. Prioritas Supabase jika dikonfigurasi
  if (reports.length === 0) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        let { data, error } = await supabase
          .from('laporan')
          .select('*')
          .order('waktu_terima', { ascending: false });

        // Fallback jika kolom waktu_terima belum ada di skema Supabase
        if (error && (error.code === '42703' || error.message?.includes('waktu_terima'))) {
          const fallback = await supabase
            .from('laporan')
            .select('*')
            .order('created_at', { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data && data.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            const kodeList = data.map((r: any) => r.kode_laporan || r.kode || r.id).join(', ');
            console.log(`[SUPABASE SELECT] ${data.length} records: ${kodeList}`);
          }
          reports = data.map((item) => mapRawToLaporanItem(item));
        } else if (error) {
          console.warn('[SUPABASE GET ERROR]:', error.message);
        }
      } catch (err) {
        console.warn('[SUPABASE GET ERROR]:', err);
      }
    }
  }

  // 4. Fallback ke Memory Cache / Local Seed (read-only safe)
  if (reports.length === 0) {
    if (!memoryCache) {
      memoryCache = loadLocalSeedReports();
    }
    reports = [...memoryCache];
  } else {
    // Sinkronkan ke cache memori lokal
    memoryCache = [...reports];
  }

  let result: LaporanItem[];

  if (onlyPublished) {
    // Publik hanya menampilkan laporan yang sudah terverifikasi dan bukan luar wilayah Sumsel
    // Koordinat dibulatkan ke presisi ±100 meter (3 desimal) untuk melindungi privasi properti
    result = reports
      .filter((item) => item.status_verifikasi === 'terverifikasi' && !item.luar_wilayah)
      .map((item) => ({
        ...item,
        lat_gps: Math.round(item.lat_gps * 1000) / 1000,
        lng_gps: Math.round(item.lng_gps * 1000) / 1000,
        lat: Math.round((item.lat ?? item.lat_gps) * 1000) / 1000,
        lng: Math.round((item.lng ?? item.lng_gps) * 1000) / 1000,
        lat_exif: undefined,
        lng_exif: undefined,
        exif_lat: undefined,
        exif_lng: undefined,
      }));
  } else if (onlyVerified) {
    result = reports.filter((item) => item.status_verifikasi === 'terverifikasi');
  } else {
    result = reports;
  }

  listCache = { key: cacheKey, data: result, expiresAt: Date.now() + LIST_CACHE_TTL_MS };
  return result;
}

/**
 * Mengambil kode laporan pada tanggal tertentu saja (tanpa kolom foto),
 * untuk menghitung nomor urut tanpa menarik seluruh data.
 */
async function getKodePrefixCodes(datePrefix: string): Promise<string[]> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT kode_laporan FROM public.laporan
        WHERE kode_laporan LIKE ${datePrefix + '%'}
      `;
      return (rows as any[]).map((r) => String(r.kode_laporan || ''));
    } catch (err) {
      console.warn('[KODE][NEON] fallback:', err);
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('laporan')
        .select('kode')
        .like('kode', `${datePrefix}%`);
      if (!error && data) {
        return (data as any[]).map((r) => String(r.kode || ''));
      }
    } catch (err) {
      console.warn('[KODE][SUPABASE] fallback:', err);
    }
  }

  const list = await getLaporanList();
  return list.map((i) => i.kode_laporan || i.kode).filter(Boolean) as string[];
}

/**
 * Menambahkan laporan baru ke database Vercel.
 */
export async function addLaporan(
  laporan: Omit<LaporanItem, 'id' | 'kode' | 'created_at' | 'updated_at'>
): Promise<LaporanItem> {
  await ensureDatabaseReady();

  // 1. Generate unique UUID
  const id = crypto.randomUUID();

  // 2. Generate kode laporan berurutan: SIGAP-YYYYMMDD-NNN
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePrefix = `SIGAP-${y}${m}${d}-`;

  const existingCodes = await getKodePrefixCodes(datePrefix);
  const maxSeq = maxSequenceFromCodes(existingCodes, datePrefix);
  const nextSeq = maxSeq + 1;
  const kode = `${datePrefix}${String(nextSeq).padStart(3, '0')}`;
  const nowIso = now.toISOString();

  const latGps = Number(laporan.lat_gps ?? (laporan as any).lat ?? 0);
  const lngGps = Number(laporan.lng_gps ?? (laporan as any).lng ?? 0);
  const latExif = laporan.lat_exif ?? laporan.exif_lat ?? null;
  const lngExif = laporan.lng_exif ?? laporan.exif_lng ?? null;
  const jarakM = laporan.jarak_exif_gps_m ?? laporan.selisih_jarak ?? null;
  const dateTime = laporan.date_time_original ?? laporan.waktu_jepret_exif ?? null;
  const fotoPayload = (laporan as any).foto || laporan.foto_url;
  const luarWilayah =
    laporan.luar_wilayah != null
      ? Boolean(laporan.luar_wilayah)
      : isLuarWilayahSumsel(latGps, lngGps);

  const newItem: LaporanItem = {
    ...laporan,
    id,
    kode,
    kode_laporan: kode,
    foto: fotoPayload,
    foto_url: fotoPayload,
    lat: latGps,
    lng: lngGps,
    lat_gps: latGps,
    lng_gps: lngGps,
    lat_exif: latExif,
    lng_exif: lngExif,
    exif_lat: latExif,
    exif_lng: lngExif,
    jarak_exif_gps_m: jarakM,
    selisih_jarak: jarakM,
    date_time_original: dateTime,
    waktu_jepret_exif: dateTime,
    waktu_terima: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    status_verifikasi: laporan.status_verifikasi || 'menunggu-tinjauan',
    status_penanganan: laporan.status_penanganan || 'menunggu',
    sumber_koordinat: laporan.sumber_koordinat || 'gps',
    tingkat_keyakinan: laporan.tingkat_keyakinan || 'TINJAUAN',
    luar_wilayah: luarWilayah,
    is_seed: false,
  };

  let savedSuccessfully = false;

  // 1. Simpan ke Vercel Postgres / Neon
  const sql = getNeonSql();
  if (sql) {
    try {
      const inserted = await sql`
        INSERT INTO public.laporan (
          id, kode_laporan, waktu_terima, lat, lng, wilayah,
          exif_lat, exif_lng, waktu_jepret_exif, selisih_jarak,
          akurasi_gps, sumber_koordinat, tingkat_keyakinan,
          status_verifikasi, status_penanganan, alasan_tidak_valid,
          deskripsi, foto, kode, lat_gps, lng_gps, foto_url, created_at, updated_at, luar_wilayah
        ) VALUES (
          ${newItem.id}, ${newItem.kode}, ${newItem.created_at}, ${newItem.lat_gps}, ${newItem.lng_gps}, ${newItem.wilayah},
          ${newItem.exif_lat}, ${newItem.exif_lng}, ${newItem.waktu_jepret_exif}, ${newItem.selisih_jarak},
          ${newItem.akurasi_gps ?? null}, ${newItem.sumber_koordinat}, ${newItem.tingkat_keyakinan},
          ${newItem.status_verifikasi}, ${newItem.status_penanganan}, ${newItem.alasan_tidak_valid ?? null},
          ${newItem.deskripsi || ''}, ${newItem.foto_url}, ${newItem.kode}, ${newItem.lat_gps}, ${newItem.lng_gps}, ${newItem.foto_url}, ${newItem.created_at}, ${newItem.updated_at}, ${newItem.luar_wilayah ?? false}
        )
        RETURNING *
      `;
      if (inserted && inserted.length > 0) {
        savedSuccessfully = true;
        console.log(`[NEON POSTGRES SUCCESS] Laporan tersimpan ID: ${newItem.id}, Kode: ${newItem.kode}`);
      }
    } catch (pgError: any) {
      console.error('[NEON POSTGRES INSERT ERROR]:', pgError?.message || pgError);
    }
  }

  // 2. Simpan ke Upstash Redis jika tersedia
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const current = await getLaporanList();
      const updatedList = [newItem, ...current.filter((item) => item.id !== newItem.id)];
      await redis.set('sigap:laporan:list', JSON.stringify(updatedList));
      savedSuccessfully = true;
      console.log(`[UPSTASH REDIS SUCCESS] Laporan tersimpan ID: ${newItem.id}`);
    } catch (redisError: any) {
      console.error('[UPSTASH REDIS INSERT ERROR]:', redisError?.message || redisError);
    }
  }

  // 3. Simpan ke Supabase jika tersedia
  const supabase = getSupabase();
  if (supabase) {
    try {
      const sbStatusVerif =
        newItem.status_verifikasi === 'menunggu-tinjauan'
          ? 'belum-diverifikasi'
          : newItem.status_verifikasi;

      const sbPayload: any = {
        id: newItem.id,
        kode: newItem.kode,
        foto_url: newItem.foto_url,
        lat_gps: newItem.lat_gps,
        lng_gps: newItem.lng_gps,
        lat_exif: newItem.lat_exif ?? newItem.exif_lat ?? null,
        lng_exif: newItem.lng_exif ?? newItem.exif_lng ?? null,
        jarak_exif_gps_m: newItem.jarak_exif_gps_m ?? newItem.selisih_jarak ?? null,
        flag_manual: newItem.flag_manual ?? false,
        wilayah: newItem.wilayah,
        deskripsi: newItem.deskripsi,
        skala: newItem.skala ?? 'SEDANG',
        status_verifikasi: sbStatusVerif,
        status_penanganan: newItem.status_penanganan,
        is_seed: false,
        created_at: newItem.created_at,
        updated_at: newItem.updated_at,
      };

      let { error } = await supabase.from('laporan').insert([sbPayload]);
      if (error && (error.code === 'PGRST204' || error.message?.includes('is_seed'))) {
        // Fallback jika kolom is_seed belum dibuat di tabel Supabase
        const { is_seed, ...payloadWithoutSeed } = sbPayload;
        const fallbackRes = await supabase.from('laporan').insert([payloadWithoutSeed]);
        error = fallbackRes.error;
      }

      if (!error) {
        savedSuccessfully = true;
        console.log(`[SUPABASE INSERT SUCCESS] Laporan ID ${newItem.id} tersimpan.`);
      } else {
        console.warn('[SUPABASE INSERT WARNING]:', error.message);
      }
    } catch (sbError: any) {
      console.warn('[SUPABASE INSERT WARNING]:', sbError?.message || sbError);
    }
  }

  // 4. Update memory cache (read-only safe fallback)
  memoryCache = [newItem, ...(memoryCache || []).filter((item) => item.id !== newItem.id)];
  invalidateListCache();

  // Coba tulis ke disk hanya jika filesystem writable (lingkungan dev lokal)
  saveLocalDataFile();

  return newItem;
}

function saveLocalDataFile(): void {
  invalidateListCache();
  try {
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (!isVercel && memoryCache) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(memoryCache, null, 2), 'utf-8');
    }
  } catch (fsErr) {
    console.warn('[STORAGE NOTICE] Filesystem bersifat read-only (Vercel). Data disimpan di database/memori.');
  }
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

/**
 * Memperbarui status / deskripsi laporan di database aktif.
 */
export async function updateLaporan(
  id: string,
  fields: LaporanUpdate
): Promise<LaporanItem | null> {
  await ensureDatabaseReady();

  console.log(`[UPDATE] Mencari laporan dengan ID: "${id}"`, JSON.stringify(fields));

  // Pastikan memoryCache sudah terisi sebelum mencari
  if (!memoryCache) {
    await getLaporanList();
  }

  // 1. Update di Postgres / Neon
  const sql = getNeonSql();
  if (sql) {
    try {
      const existing = await sql`SELECT * FROM public.laporan WHERE id::text = ${id} OR kode = ${id} OR kode_laporan = ${id}`;
      console.log(`[UPDATE][NEON] Baris ditemukan: ${existing?.length ?? 0} untuk ID: "${id}"`);
      if (existing && existing.length > 0) {
        const row = existing[0];
        const statusVerif = fields.status_verifikasi ?? row.status_verifikasi;
        const statusPenanganan = fields.status_penanganan ?? row.status_penanganan;
        const deskripsi = fields.deskripsi ?? row.deskripsi;
        const wilayah = fields.wilayah ?? row.wilayah;
        const alasan = fields.alasan_tidak_valid !== undefined ? fields.alasan_tidak_valid : row.alasan_tidak_valid;
        const updated_at = new Date().toISOString();

        const updatedRows = await sql`
          UPDATE public.laporan
          SET status_verifikasi = ${statusVerif},
              status_penanganan = ${statusPenanganan},
              deskripsi = ${deskripsi},
              wilayah = ${wilayah},
              alasan_tidak_valid = ${alasan},
              updated_at = ${updated_at}
          WHERE id = ${row.id}
          RETURNING *
        `;
        if (updatedRows && updatedRows.length > 0) {
          const updatedItem = mapRawToLaporanItem(updatedRows[0]);
          if (memoryCache) {
            memoryCache = memoryCache.map((item) => (item.id === updatedItem.id ? updatedItem : item));
          }
          saveLocalDataFile();
          return updatedItem;
        }
      }
    } catch (err) {
      console.error('[NEON UPDATE ERROR]:', err);
    }
  }

  // 2. Update di Redis jika Postgres tidak aktif
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const list = await getLaporanList();
      const idx = list.findIndex((item) => item.id === id || item.kode === id || item.kode_laporan === id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...fields,
          updated_at: new Date().toISOString(),
        };
        await redis.set('sigap:laporan:list', JSON.stringify(list));
        memoryCache = list;
        saveLocalDataFile();
        return list[idx];
      }
    } catch (err) {
      console.error('[UPSTASH UPDATE ERROR]:', err);
    }
  }

  // 3. Update di Supabase jika tersedia
  const supabase = getSupabase();
  if (supabase) {
    try {
      const sbUpdate: any = { updated_at: new Date().toISOString() };
      if (fields.status_verifikasi !== undefined) {
        sbUpdate.status_verifikasi =
          fields.status_verifikasi === 'menunggu-tinjauan'
            ? 'belum-diverifikasi'
            : fields.status_verifikasi;
      }
      if (fields.status_penanganan !== undefined) {
        sbUpdate.status_penanganan = fields.status_penanganan;
      }
      if (fields.deskripsi !== undefined) {
        sbUpdate.deskripsi = fields.deskripsi;
      }
      if (fields.wilayah !== undefined) {
        sbUpdate.wilayah = fields.wilayah;
      }

      const { data, error } = await supabase
        .from('laporan')
        .update(sbUpdate)
        .or(`id.eq.${id},kode.eq.${id}`)
        .select();

      console.log(`[UPDATE][SUPABASE] Baris diperbarui: ${data?.length ?? 0} untuk ID: "${id}"`);
      if (!error && data && data.length > 0) {
        const updatedItem = mapRawToLaporanItem(data[0]);
        if (memoryCache) {
          memoryCache = memoryCache.map((item) => (item.id === updatedItem.id ? updatedItem : item));
        }
        saveLocalDataFile();
        return updatedItem;
      }
    } catch (err) {
      console.error('[SUPABASE UPDATE ERROR]:', err);
    }
  }

  // 4. Fallback memory & local storage
  if (memoryCache) {
    const idx = memoryCache.findIndex((item) => item.id === id || item.kode === id || item.kode_laporan === id);
    if (idx !== -1) {
      memoryCache[idx] = {
        ...memoryCache[idx],
        ...fields,
        updated_at: new Date().toISOString(),
      };
      saveLocalDataFile();
      console.log(`[UPDATE][MEMORY] Laporan ditemukan dan diperbarui untuk ID: "${id}"`);
      return memoryCache[idx];
    }
  }

  console.warn(`[UPDATE] Laporan TIDAK DITEMUKAN untuk ID: "${id}"`);
  return null;
}

/**
 * Menghapus laporan dari database aktif (Postgres / Upstash / Supabase).
 */
export async function deleteLaporan(id: string): Promise<boolean> {
  await ensureDatabaseReady();
  let deleted = false;

  console.log(`[DELETE] Mencari laporan dengan ID: "${id}"`);

  // Pastikan memoryCache sudah terisi sebelum mencari
  if (!memoryCache) {
    await getLaporanList();
  }

  // 1. Delete dari Postgres / Neon
  const sql = getNeonSql();
  if (sql) {
    try {
      const res = await sql`
        DELETE FROM public.laporan
        WHERE id::text = ${id} OR kode = ${id} OR kode_laporan = ${id}
        RETURNING id
      `;
      console.log(`[DELETE][NEON] Baris terhapus: ${res?.length ?? 0} untuk ID: "${id}"`);
      if (res && res.length > 0) {
        deleted = true;
        console.log(`[NEON DELETE SUCCESS] Laporan ID ${id} dihapus.`);
      }
    } catch (err) {
      console.error('[NEON DELETE ERROR]:', err);
    }
  }

  // 2. Delete dari Upstash Redis
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const list = await getLaporanList();
      const filtered = list.filter((item) => item.id !== id && item.kode !== id && item.kode_laporan !== id);
      if (filtered.length !== list.length) {
        await redis.set('sigap:laporan:list', JSON.stringify(filtered));
        deleted = true;
        console.log(`[UPSTASH DELETE SUCCESS] Laporan ID ${id} dihapus dari Redis.`);
      }
    } catch (err) {
      console.error('[UPSTASH DELETE ERROR]:', err);
    }
  }

  // 3. Delete dari Supabase jika ada
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('laporan')
        .delete()
        .or(`id.eq.${id},kode.eq.${id}`)
        .select('id');
      console.log(`[DELETE][SUPABASE] Baris terhapus: ${data?.length ?? 0} untuk ID: "${id}"`);
      if (!error && data && data.length > 0) {
        deleted = true;
        console.log(`[SUPABASE DELETE SUCCESS] Laporan ID ${id} dihapus dari Supabase.`);
      }
    } catch (e) {
      console.warn('[SUPABASE DELETE WARNING]:', e);
    }
  }

  // 4. Update memory cache
  if (memoryCache) {
    const initialLen = memoryCache.length;
    memoryCache = memoryCache.filter((item) => item.id !== id && item.kode !== id && item.kode_laporan !== id);
    if (memoryCache.length < initialLen) {
      deleted = true;
      console.log(`[MEMORY DELETE SUCCESS] Laporan ID ${id} dihapus dari memory cache.`);
    }
  }

  if (deleted) {
    saveLocalDataFile();
  } else {
    console.warn(`[DELETE] Laporan TIDAK DITEMUKAN untuk ID: "${id}"`);
  }

  return deleted;
}

/**
 * Menghitung ringkasan statistik terverifikasi & wilayah teratas.
 */
function computeStats(
  rows: { wilayah?: string | null; status_penanganan?: string | null }[]
): StatisticsData {
  const sedangDitangani = rows.filter((r) => r.status_penanganan === 'diproses').length;

  const regionSet = new Set<string>();
  rows.forEach((r) => {
    const wilayah = r.wilayah || '';
    const id = matchWilayahSumsel(wilayah);
    regionSet.add(id || canonicalCityLabel(wilayah));
  });

  return {
    totalTerverifikasi: rows.length,
    sedangDitangani,
    wilayahTerdampak: regionSet.size,
  };
}

export async function getStatistics(): Promise<StatisticsData> {
  await ensureDatabaseReady();

  // Lightweight query: only the two columns needed, tanpa kolom foto/base64.
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT wilayah, status_penanganan
        FROM public.laporan
        WHERE status_verifikasi = 'terverifikasi'
      `;
      return computeStats(rows as any[]);
    } catch (err) {
      console.warn('[STATS][NEON] fallback ke daftar lengkap:', err);
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('laporan')
        .select('wilayah,status_penanganan')
        .eq('status_verifikasi', 'terverifikasi');
      if (!error && data) return computeStats(data as any[]);
    } catch (err) {
      console.warn('[STATS][SUPABASE] fallback ke daftar lengkap:', err);
    }
  }

  const list = await getLaporanList({ onlyVerified: true });
  return computeStats(list);
}
/**
 * Menghapus SELURUH laporan dari semua storage (untuk reset data produksi).
 * Hanya boleh dipanggil dari endpoint admin yang terproteksi.
 */
export async function clearAllLaporan(): Promise<void> {
  // 1. Hapus dari Postgres
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`DELETE FROM public.laporan`;
      console.log('[CLEAR ALL][NEON] Semua laporan dihapus dari Postgres.');
    } catch (err) {
      console.error('[CLEAR ALL][NEON] Error:', err);
    }
  }

  // 2. Hapus dari Redis
  const redis = getUpstashRedis();
  if (redis) {
    try {
      await redis.set('sigap:laporan:list', JSON.stringify([]));
      console.log('[CLEAR ALL][REDIS] Key sigap:laporan:list dikosongkan.');
    } catch (err) {
      console.error('[CLEAR ALL][REDIS] Error:', err);
    }
  }

  // 3. Hapus dari Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('laporan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('[CLEAR ALL][SUPABASE] Semua laporan dihapus dari Supabase.');
    } catch (err) {
      console.warn('[CLEAR ALL][SUPABASE] Error:', err);
    }
  }

  // 4. Kosongkan memori
  memoryCache = [];
  dbInitialized = false; // reset agar ensureDatabaseReady tidak re-seed
  saveLocalDataFile();
  console.log('[CLEAR ALL] Memory cache & data/laporan.json dikosongkan.');
}
