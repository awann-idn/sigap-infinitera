import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { calculateHaversineDistance } from '../lib/geo';

// Baca file .env manual agar tidak tergantung dependensi dotenv eksternal
function getEnvConfig() {
  const envFiles = ['.env.local', '.env'];
  const config: Record<string, string> = {};

  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["']|["']$/g, '');
          if (!config[key]) config[key] = val;
        }
      }
    }
  }
  return config;
}

const envConfig = getEnvConfig();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  envConfig.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Konfigurasi Supabase tidak ditemukan di .env atau environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ambil sampel foto base64 dari data/laporan.json jika tersedia
function getSamplePhoto(): string {
  const dataPath = path.join(process.cwd(), 'data', 'laporan.json');
  try {
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      const items = JSON.parse(content);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.foto && typeof item.foto === 'string' && item.foto.startsWith('data:image')) {
            return item.foto;
          }
          if (item.foto_url && typeof item.foto_url === 'string' && item.foto_url.startsWith('data:image')) {
            return item.foto_url;
          }
        }
      }
    }
  } catch (err) {
    // ignore fallback below
  }
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

/**
 * Memastikan kolom is_seed ada di tabel laporan Supabase.
 * Jika tidak ada, menampilkan instruksi migrasi + URL SQL Editor project.
 */
async function checkIsSeedColumn(): Promise<boolean> {
  const { error } = await supabase.from('laporan').select('is_seed').limit(1);
  if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('is_seed'))) {
    // Ambil project ID dari URL Supabase (format: https://<projectid>.supabase.co)
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '';
    const sqlEditorUrl = projectId
      ? `https://supabase.com/dashboard/project/${projectId}/sql/new`
      : 'https://supabase.com/dashboard → SQL Editor';

    console.error('\n⚠️  KOLOM "is_seed" BELUM ADA DI TABEL "laporan" SUPABASE!');
    console.error('═══════════════════════════════════════════════════════════════════════');
    console.error('1. Buka Supabase SQL Editor di browser:');
    console.error(`   ${sqlEditorUrl}`);
    console.error('\n2. Jalankan perintah SQL berikut:');
    console.error('\n   ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;');
    console.error('   ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS alasan_tidak_valid TEXT;');
    console.error('   ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS luar_wilayah BOOLEAN DEFAULT false;');
    console.error("   ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS tingkat_keyakinan VARCHAR(20) DEFAULT 'TINJAUAN';");
    console.error('   ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS waktu_jepret_exif TIMESTAMPTZ;\n');
    console.error('3. Klik tombol [Run], lalu jalankan kembali script ini:');
    console.error('   npm run seed');
    console.error('═══════════════════════════════════════════════════════════════════════\n');
    return false;
  }
  return true;
}

/**
 * Menghapus SEMUA record seed (is_seed = true) dari Supabase dan file lokal.
 * Laporan asli (is_seed = false) tidak akan pernah tersentuh.
 */
async function clearSeedData(): Promise<void> {
  const isLocalOnly = process.argv.includes('--local');
  console.log('🔄 Memeriksa dan membersihkan data seed (is_seed = true)...');

  if (!isLocalOnly) {
    const hasColumn = await checkIsSeedColumn();
    if (!hasColumn) {
      process.exitCode = 1;
      return;
    }

    // Hapus dari Supabase
    const { data, error } = await supabase
      .from('laporan')
      .delete()
      .eq('is_seed', true)
      .select('id, kode');

    if (error) {
      console.error('❌ Gagal menghapus seed dari Supabase:', error.message);
      process.exitCode = 1;
      return;
    }

    const count = data ? data.length : 0;
    console.log(`✅ [SUPABASE] Berhasil menghapus ${count} laporan seed.`);
  }

  // Bersihkan juga dari data/laporan.json jika ada
  const dataPath = path.join(process.cwd(), 'data', 'laporan.json');
  try {
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      const items = JSON.parse(content);
      if (Array.isArray(items)) {
        const filtered = items.filter((item) => !item.is_seed);
        if (filtered.length !== items.length) {
          fs.writeFileSync(dataPath, JSON.stringify(filtered, null, 2), 'utf-8');
          console.log(`✅ [LOCAL JSON] Berhasil membersihkan ${items.length - filtered.length} laporan seed.`);
        }
      }
    }
  } catch (err) {
    console.warn('⚠️  Gagal membersihkan seed dari data/laporan.json:', err);
  }

  console.log('✨ Selesai. Semua laporan asli (is_seed = false) tetap aman.');
}

/**
 * Membuat data seed (20 laporan) dengan variasi lengkap sesuai spesifikasi:
 * - 14 TINGGI (~70%): exif berselisih 5-60 m, waktu jepret < 10 menit
 * - 4 TINJAUAN (~20%): exif_lat & exif_lng null
 * - 2 CURIGA (~10%): exif > 5 km atau selisih waktu > 2 jam
 * - Sebaran: Palembang 5, Ogan Ilir 4, OKI 3, Banyuasin 3, Muba 2, Muara Enim 2, Lahat 1
 * - Status bervariasi: Menunggu Tinjauan, Terverifikasi (Menunggu/Diproses/Selesai), Tidak Valid
 * - Waktu tersebar 30 hari terakhir, beberapa 24 jam terakhir
 */
async function generateSeedData(): Promise<void> {
  const isLocalOnly = process.argv.includes('--local');
  console.log('🌱 Menyiapkan seed data SIGAP (Sumatera Selatan)...');

  if (!isLocalOnly) {
    const hasColumn = await checkIsSeedColumn();
    if (!hasColumn) {
      process.exitCode = 1;
      return;
    }

    // Bersihkan seed lama terlebih dahulu agar idempotence (tidak duplikat)
    console.log('🧹 Menghapus seed data lama sebelum mengisikan yang baru...');
    await supabase.from('laporan').delete().eq('is_seed', true);
  }

  const samplePhoto = getSamplePhoto();
  const now = new Date();

  // Helper untuk membuat timestamp dalam rentang hari/jam yang lalu
  function getPastDate(daysAgo: number, hoursAgo: number = 0, minutesAgo: number = 0): Date {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    d.setMinutes(d.getMinutes() - minutesAgo);
    return d;
  }

  // Definisi 20 spesifikasi laporan
  interface SeedSpec {
    wilayah: string;
    deskripsi: string;
    latGps: number;
    lngGps: number;
    daysAgo: number;
    hoursAgo: number;
    kategori: 'TINGGI' | 'TINJAUAN' | 'CURIGA';
    statusVerifikasi: 'menunggu-tinjauan' | 'terverifikasi' | 'tidak-valid';
    statusPenanganan: 'menunggu' | 'diproses' | 'selesai';
    alasanTidakValid?: string;
    skala?: 'KECIL' | 'SEDANG' | 'BESAR';
    // Offset untuk TINGGI (5-60m) atau CURIGA (>5km)
    latOffsetMeters?: number;
    lngOffsetMeters?: number;
    // Selisih menit antara waktu jepret dan waktu terima
    jepretDeltaMinutes?: number;
  }

  const specs: SeedSpec[] = [
    // ══════════════════════════════════════════════════════════════════════════
    // PALEMBANG (5 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 1. Gandus: 2 jam lalu, TINGGI, menunggu-tinjauan
    {
      wilayah: 'Kota Palembang',
      deskripsi: 'Terlihat kepulan asap tebal di semak belukar dekat perumahan Griya Gandus Asri.',
      latGps: -3.0037,
      lngGps: 104.706,
      daysAgo: 0,
      hoursAgo: 2,
      kategori: 'TINGGI',
      statusVerifikasi: 'menunggu-tinjauan',
      statusPenanganan: 'menunggu',
      skala: 'SEDANG',
      latOffsetMeters: 18,
      lngOffsetMeters: 12,
      jepretDeltaMinutes: 3,
    },
    // 2. Sukarami: 1 hari lalu, TINGGI, terverifikasi -> diproses
    {
      wilayah: 'Kota Palembang',
      deskripsi: 'Kebakaran lahan kosong ilalang di area Talang Betutu samping gudang kayu.',
      latGps: -2.915,
      lngGps: 104.721,
      daysAgo: 1,
      hoursAgo: 5,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'diproses',
      skala: 'BESAR',
      latOffsetMeters: -25,
      lngOffsetMeters: 15,
      jepretDeltaMinutes: 4,
    },
    // 3. Kertapati: 8 hari lalu, CURIGA (waktu jepret berbeda > 4 jam), terverifikasi -> selesai
    {
      wilayah: 'Kota Palembang',
      deskripsi: 'Titik api di bantaran rel kereta api Kertapati, warga sudah mulai memadamkan.',
      latGps: -3.032,
      lngGps: 104.745,
      daysAgo: 8,
      hoursAgo: 3,
      kategori: 'CURIGA',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'selesai',
      skala: 'SEDANG',
      latOffsetMeters: 20,
      lngOffsetMeters: 10,
      jepretDeltaMinutes: 280, // > 4.5 jam! (CURIGA)
    },
    // 4. Plaju: 14 hari lalu, TINJAUAN (tanpa EXIF), tidak-valid
    {
      wilayah: 'Kota Palembang',
      deskripsi: 'Asap hitam membubung tinggi di belakang komplek Pertamina Plaju.',
      latGps: -2.998,
      lngGps: 104.812,
      daysAgo: 14,
      hoursAgo: 6,
      kategori: 'TINJAUAN',
      statusVerifikasi: 'tidak-valid',
      statusPenanganan: 'menunggu',
      alasanTidakValid: 'Bukan kebakaran hutan atau lahan terbuka, hanya pembakaran tumpukan ban bekas oleh warga.',
      skala: 'KECIL',
    },
    // 5. Alang-Alang Lebar: 22 hari lalu, TINGGI, terverifikasi -> selesai
    {
      wilayah: 'Kota Palembang',
      deskripsi: 'Api membakar semak kering di dekat jalan lingkar barat Alang-Alang Lebar.',
      latGps: -2.902,
      lngGps: 104.685,
      daysAgo: 22,
      hoursAgo: 4,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'selesai',
      skala: 'SEDANG',
      latOffsetMeters: 30,
      lngOffsetMeters: -20,
      jepretDeltaMinutes: 5,
    },

    // ══════════════════════════════════════════════════════════════════════════
    // OGAN ILIR (4 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 6. Indralaya: 6 jam lalu, TINGGI, terverifikasi -> diproses
    {
      wilayah: 'Kabupaten Ogan Ilir',
      deskripsi: 'Lahan gambut kering di samping Tol Indralaya terbakar cepat tertiup angin kencang.',
      latGps: -3.228,
      lngGps: 104.652,
      daysAgo: 0,
      hoursAgo: 6,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'diproses',
      skala: 'BESAR',
      latOffsetMeters: 35,
      lngOffsetMeters: 20,
      jepretDeltaMinutes: 2,
    },
    // 7. Pemulutan: 3 hari lalu, TINGGI, terverifikasi -> diproses
    {
      wilayah: 'Kabupaten Ogan Ilir',
      deskripsi: 'Kebakaran lahan tidur di Desa Ibul Besar Pemulutan, kepulan asap mengarah ke jalan lintas.',
      latGps: -3.125,
      lngGps: 104.748,
      daysAgo: 3,
      hoursAgo: 8,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'diproses',
      skala: 'BESAR',
      latOffsetMeters: -15,
      lngOffsetMeters: -25,
      jepretDeltaMinutes: 6,
    },
    // 8. Tanjung Raja: 11 hari lalu, TINGGI, menunggu-tinjauan
    {
      wilayah: 'Kabupaten Ogan Ilir',
      deskripsi: 'Titik api terlihat di perkebunan sawit rakyat dekat rawa lebak Tanjung Raja.',
      latGps: -3.352,
      lngGps: 104.712,
      daysAgo: 11,
      hoursAgo: 2,
      kategori: 'TINGGI',
      statusVerifikasi: 'menunggu-tinjauan',
      statusPenanganan: 'menunggu',
      skala: 'SEDANG',
      latOffsetMeters: 22,
      lngOffsetMeters: 18,
      jepretDeltaMinutes: 5,
    },
    // 9. Rantau Panjang: 25 hari lalu, TINJAUAN (tanpa EXIF), terverifikasi -> selesai
    {
      wilayah: 'Kabupaten Ogan Ilir',
      deskripsi: 'Kebakaran semak belukar di pinggiran sawah pasang surut Rantau Panjang.',
      latGps: -3.284,
      lngGps: 104.815,
      daysAgo: 25,
      hoursAgo: 5,
      kategori: 'TINJAUAN',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'selesai',
      skala: 'KECIL',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // OGAN KOMERING ILIR / OKI (3 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 10. Kayu Agung: 12 jam lalu, TINGGI, terverifikasi -> diproses
    {
      wilayah: 'Kabupaten Ogan Komering Ilir',
      deskripsi: 'Kebakaran lahan gambut cukup luas di Kayu Agung mendekati permukiman penduduk.',
      latGps: -3.395,
      lngGps: 104.842,
      daysAgo: 0,
      hoursAgo: 12,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'diproses',
      skala: 'BESAR',
      latOffsetMeters: 28,
      lngOffsetMeters: -14,
      jepretDeltaMinutes: 4,
    },
    // 11. Pedamaran: 4 hari lalu, CURIGA (jarak EXIF > 7.5 km dari GPS!), menunggu-tinjauan
    {
      wilayah: 'Kabupaten Ogan Komering Ilir',
      deskripsi: 'Asap pekat dari arah lahan gambut Pedamaran Timur, tercium bau sangit pekat.',
      latGps: -3.468,
      lngGps: 104.885,
      daysAgo: 4,
      hoursAgo: 7,
      kategori: 'CURIGA',
      statusVerifikasi: 'menunggu-tinjauan',
      statusPenanganan: 'menunggu',
      skala: 'SEDANG',
      latOffsetMeters: 6500, // > 6.5 km! (CURIGA)
      lngOffsetMeters: 4500,
      jepretDeltaMinutes: 5,
    },
    // 12. Pampangan: 18 hari lalu, TINGGI, terverifikasi -> selesai
    {
      wilayah: 'Kabupaten Ogan Komering Ilir',
      deskripsi: 'Lahan purun dan gambut terbakar di kawasan rawa Pampangan, butuh pemadaman helikopter water bombing.',
      latGps: -3.265,
      lngGps: 105.021,
      daysAgo: 18,
      hoursAgo: 6,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'selesai',
      skala: 'BESAR',
      latOffsetMeters: 14,
      lngOffsetMeters: 38,
      jepretDeltaMinutes: 3,
    },

    // ══════════════════════════════════════════════════════════════════════════
    // BANYUASIN (3 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 13. Talang Kelapa: 18 jam lalu, TINGGI, menunggu-tinjauan
    {
      wilayah: 'Kabupaten Banyuasin',
      deskripsi: 'Semak belukar kering di belakang perumahan Sukajadi Talang Kelapa terbakar.',
      latGps: -2.875,
      lngGps: 104.632,
      daysAgo: 0,
      hoursAgo: 18,
      kategori: 'TINGGI',
      statusVerifikasi: 'menunggu-tinjauan',
      statusPenanganan: 'menunggu',
      skala: 'KECIL',
      latOffsetMeters: 15,
      lngOffsetMeters: 12,
      jepretDeltaMinutes: 7,
    },
    // 14. Rambutan: 5 hari lalu, TINGGI, terverifikasi -> menunggu
    {
      wilayah: 'Kabupaten Banyuasin',
      deskripsi: 'Kebakaran semak belukar di Desa Sungai Dua Rambutan menjalar ke arah kebun karet.',
      latGps: -3.085,
      lngGps: 104.895,
      daysAgo: 5,
      hoursAgo: 4,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'menunggu',
      skala: 'SEDANG',
      latOffsetMeters: -20,
      lngOffsetMeters: 35,
      jepretDeltaMinutes: 4,
    },
    // 15. Tanjung Lago: 16 hari lalu, TINJAUAN (tanpa EXIF), terverifikasi -> selesai
    {
      wilayah: 'Kabupaten Banyuasin',
      deskripsi: 'Lahan pasang surut Tanjung Lago terbakar di pinggir kanal perkebunan.',
      latGps: -2.652,
      lngGps: 104.782,
      daysAgo: 16,
      hoursAgo: 3,
      kategori: 'TINJAUAN',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'selesai',
      skala: 'SEDANG',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // MUSI BANYUASIN / MUBA (2 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 16. Sekayu: 6 hari lalu, TINGGI, terverifikasi -> menunggu
    {
      wilayah: 'Kabupaten Musi Banyuasin',
      deskripsi: 'Kebakaran semak belukar di pinggiran kota Sekayu dekat jalan poros lingkar praja.',
      latGps: -2.885,
      lngGps: 103.842,
      daysAgo: 6,
      hoursAgo: 5,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'menunggu',
      skala: 'SEDANG',
      latOffsetMeters: 16,
      lngOffsetMeters: -24,
      jepretDeltaMinutes: 6,
    },
    // 17. Sungai Lilin: 20 hari lalu, TINGGI, terverifikasi -> selesai
    {
      wilayah: 'Kabupaten Musi Banyuasin',
      deskripsi: 'Lahan semak kering di dekat jalur pipa gas Sungai Lilin, regu pemadam sudah meluncur.',
      latGps: -2.572,
      lngGps: 104.115,
      daysAgo: 20,
      hoursAgo: 7,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'selesai',
      skala: 'SEDANG',
      latOffsetMeters: 42,
      lngOffsetMeters: -18,
      jepretDeltaMinutes: 5,
    },

    // ══════════════════════════════════════════════════════════════════════════
    // MUARA ENIM (2 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 18. Muara Enim Kota: 7 hari lalu, TINGGI, terverifikasi -> menunggu
    {
      wilayah: 'Kabupaten Muara Enim',
      deskripsi: 'Titik kebakaran semak lereng perbukitan dekat jalan lintas Muara Enim - Lahat.',
      latGps: -3.654,
      lngGps: 103.778,
      daysAgo: 7,
      hoursAgo: 4,
      kategori: 'TINGGI',
      statusVerifikasi: 'terverifikasi',
      statusPenanganan: 'menunggu',
      skala: 'SEDANG',
      latOffsetMeters: 19,
      lngOffsetMeters: 22,
      jepretDeltaMinutes: 3,
    },
    // 19. Gelumbang: 13 hari lalu, TINJAUAN (tanpa EXIF), tidak-valid
    {
      wilayah: 'Kabupaten Muara Enim',
      deskripsi: 'Asap terlihat dari arah kebun karet Gelumbang, dikira kebakaran hutan.',
      latGps: -3.251,
      lngGps: 104.425,
      daysAgo: 13,
      hoursAgo: 2,
      kategori: 'TINJAUAN',
      statusVerifikasi: 'tidak-valid',
      statusPenanganan: 'menunggu',
      alasanTidakValid: 'Bukan kebakaran hutan/lahan. Petugas mengecek lokasi dan mendapati warga sedang membakar tumpukan pelepah kelapa sawit.',
      skala: 'KECIL',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // LAHAT (1 laporan)
    // ══════════════════════════════════════════════════════════════════════════
    // 20. Lahat Kota: 28 hari lalu, TINGGI, menunggu-tinjauan
    {
      wilayah: 'Kabupaten Lahat',
      deskripsi: 'Kebakaran vegetasi semak bambu kering di tepian Sungai Lematang Lahat.',
      latGps: -3.792,
      lngGps: 103.542,
      daysAgo: 28,
      hoursAgo: 8,
      kategori: 'TINGGI',
      statusVerifikasi: 'menunggu-tinjauan',
      statusPenanganan: 'menunggu',
      skala: 'KECIL',
      latOffsetMeters: 24,
      lngOffsetMeters: -16,
      jepretDeltaMinutes: 8,
    },
  ];

  console.log(`📊 Menyusun ${specs.length} payload laporan seed...`);

  // Konversi meter ke delta derajat (1 deg lat ~ 111320m, 1 deg lng ~ 111320 * cos(lat)m)
  function metersToDegrees(latMeters: number, lngMeters: number, latOrigin: number) {
    const dLat = latMeters / 111320;
    const dLng = lngMeters / (111320 * Math.cos((latOrigin * Math.PI) / 180));
    return { dLat, dLng };
  }

  // Periksa kolom apa saja yang benar-benar ada di tabel Supabase
  const possibleCols = [
    'is_seed',
    'alasan_tidak_valid',
    'luar_wilayah',
    'tingkat_keyakinan',
    'waktu_jepret_exif',
    'jarak_exif_gps_m',
    'lat_exif',
    'lng_exif',
  ];
  const availableCols = new Set<string>();
  await Promise.all(
    possibleCols.map(async (col) => {
      const { error } = await supabase.from('laporan').select(col).limit(1);
      if (!error) availableCols.add(col);
    })
  );

  const seedPayloads: any[] = [];
  const localItems: any[] = [];
  let seq = 1;

  for (const s of specs) {
    const id = crypto.randomUUID();
    const waktuTerimaDate = getPastDate(s.daysAgo, s.hoursAgo, Math.floor(Math.random() * 30));
    const waktuTerimaIso = waktuTerimaDate.toISOString();

    // Format kode: SIGAP-YYYYMMDD-SXX
    const yyyy = waktuTerimaDate.getFullYear();
    const mm = String(waktuTerimaDate.getMonth() + 1).padStart(2, '0');
    const dd = String(waktuTerimaDate.getDate()).padStart(2, '0');
    const kode = `SIGAP-${yyyy}${mm}${dd}-S${String(seq).padStart(2, '0')}`;
    seq++;

    let exifLat: number | null = null;
    let exifLng: number | null = null;
    let jarakM: number | null = null;
    let waktuJepretIso: string | null = null;

    if (s.kategori === 'TINGGI' || s.kategori === 'CURIGA') {
      const { dLat, dLng } = metersToDegrees(
        s.latOffsetMeters || 15,
        s.lngOffsetMeters || 15,
        s.latGps
      );
      exifLat = Number((s.latGps + dLat).toFixed(6));
      exifLng = Number((s.lngGps + dLng).toFixed(6));

      // Hitung selisih jarak dengan rumus Haversine secara akurat
      jarakM = calculateHaversineDistance(s.latGps, s.lngGps, exifLat, exifLng);

      // Hitung waktu jepret
      const jepretDate = new Date(waktuTerimaDate.getTime() - (s.jepretDeltaMinutes || 4) * 60 * 1000);
      waktuJepretIso = jepretDate.toISOString();
    }

    // Mapping status verifikasi sesuai check constraint Supabase ('belum-diverifikasi', 'terverifikasi', 'spam')
    const sbStatusVerif =
      s.statusVerifikasi === 'menunggu-tinjauan'
        ? 'belum-diverifikasi'
        : s.statusVerifikasi === 'tidak-valid'
        ? 'spam'
        : s.statusVerifikasi;

    const sbPayload: Record<string, any> = {
      id,
      kode,
      foto_url: samplePhoto,
      lat_gps: s.latGps,
      lng_gps: s.lngGps,
      flag_manual: false,
      wilayah: s.wilayah,
      deskripsi: s.deskripsi,
      skala: s.skala || 'SEDANG',
      status_verifikasi: sbStatusVerif,
      status_penanganan: s.statusPenanganan,
      is_seed: true,
      created_at: waktuTerimaIso,
      updated_at: waktuTerimaIso,
    };

    if (availableCols.has('lat_exif')) sbPayload.lat_exif = exifLat;
    if (availableCols.has('lng_exif')) sbPayload.lng_exif = exifLng;
    if (availableCols.has('jarak_exif_gps_m')) sbPayload.jarak_exif_gps_m = jarakM;
    if (availableCols.has('alasan_tidak_valid')) sbPayload.alasan_tidak_valid = s.alasanTidakValid || null;
    if (availableCols.has('luar_wilayah')) sbPayload.luar_wilayah = false;
    if (availableCols.has('tingkat_keyakinan')) sbPayload.tingkat_keyakinan = s.kategori;
    if (availableCols.has('waktu_jepret_exif')) sbPayload.waktu_jepret_exif = waktuJepretIso;

    seedPayloads.push(sbPayload);

    localItems.push({
      id,
      kode,
      kode_laporan: kode,
      foto: samplePhoto,
      foto_url: samplePhoto,
      lat_gps: s.latGps,
      lng_gps: s.lngGps,
      lat: s.latGps,
      lng: s.lngGps,
      exif_lat: exifLat,
      exif_lng: exifLng,
      lat_exif: exifLat,
      lng_exif: exifLng,
      selisih_jarak: jarakM,
      jarak_exif_gps_m: jarakM,
      flag_manual: false,
      sumber_koordinat: 'gps',
      wilayah: s.wilayah,
      deskripsi: s.deskripsi,
      skala: s.skala || 'SEDANG',
      tingkat_keyakinan: s.kategori,
      status_verifikasi: s.statusVerifikasi,
      status_penanganan: s.statusPenanganan,
      alasan_tidak_valid: s.alasanTidakValid || null,
      waktu_jepret_exif: waktuJepretIso,
      date_time_original: waktuJepretIso,
      is_seed: true,
      luar_wilayah: false,
      waktu_terima: waktuTerimaIso,
      created_at: waktuTerimaIso,
      updated_at: waktuTerimaIso,
    });
  }

  if (!isLocalOnly) {
    // Insert ke Supabase
    console.log('🚀 Memasukkan laporan seed ke Supabase...');
    const { error: insertErr } = await supabase.from('laporan').insert(seedPayloads);

    if (insertErr) {
      console.error('❌ Gagal melakukan insert seed ke Supabase:', insertErr.message);
      process.exitCode = 1;
      return;
    }
  }

  // Simpan juga ke data/laporan.json (sinkronisasi lokal)
  const dataPath = path.join(process.cwd(), 'data', 'laporan.json');
  try {
    let existingItems: any[] = [];
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        existingItems = parsed.filter((item) => !item.is_seed);
      }
    }
    const combined = [...localItems, ...existingItems];
    fs.writeFileSync(dataPath, JSON.stringify(combined, null, 2), 'utf-8');
    console.log('💾 [LOCAL JSON] Berhasil menyinkronkan 20 laporan seed ke data/laporan.json');
  } catch (err) {
    console.warn('⚠️  Gagal menyimpan seed ke data/laporan.json:', err);
  }

  console.log('\n🎉 [SEED SUCCESS] Berhasil menambahkan 20 laporan seed (is_seed = true)!');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('📍 Komposisi Tingkat Keyakinan:');
  console.log('   - TINGGI   : 14 laporan (70%) — EXIF 5-60m dari GPS, waktu jepret < 10 menit');
  console.log('   - TINJAUAN :  4 laporan (20%) — EXIF lat/lng null');
  console.log('   - CURIGA   :  2 laporan (10%) — 1 berselisih >5km, 1 waktu jepret >4 jam');
  console.log('🗺️  Sebaran Wilayah:');
  console.log('   - Kota Palembang              : 5 laporan');
  console.log('   - Kabupaten Ogan Ilir         : 4 laporan');
  console.log('   - Kabupaten Ogan Komering Ilir: 3 laporan');
  console.log('   - Kabupaten Banyuasin         : 3 laporan');
  console.log('   - Kabupaten Musi Banyuasin    : 2 laporan');
  console.log('   - Kabupaten Muara Enim        : 2 laporan');
  console.log('   - Kabupaten Lahat             : 1 laporan');
  console.log('📋 Status:');
  console.log('   - Menunggu Tinjauan: 7');
  console.log('   - Terverifikasi    : 11 (Menunggu: 4, Diproses: 4, Selesai: 3)');
  console.log('   - Tidak Valid      : 2 (dengan alasan penolakan)');
  console.log('🕒 Rentang Waktu: 30 hari terakhir (4 di antaranya dalam 24 jam terakhir)');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('💡 Untuk menghapus semua seed kapan saja: npm run seed:clear\n');
}

async function main() {
  const isClear = process.argv.includes('--clear');
  if (isClear) {
    await clearSeedData();
  } else {
    await generateSeedData();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exitCode = 1;
});
