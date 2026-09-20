-- SIGAP Database Schema (PostgreSQL / Supabase)

-- 1. Table Laporan
CREATE TABLE IF NOT EXISTS public.laporan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(30) UNIQUE NOT NULL,
  foto_url TEXT NOT NULL,
  lat_gps FLOAT NOT NULL,
  lng_gps FLOAT NOT NULL,
  akurasi_gps FLOAT,
  lat_exif FLOAT,
  lng_exif FLOAT,
  exif_lat FLOAT,
  exif_lng FLOAT,
  jarak_exif_gps_m INT,
  selisih_jarak INT,
  flag_manual BOOLEAN DEFAULT FALSE,
  sumber_koordinat VARCHAR(20) NOT NULL DEFAULT 'gps' CHECK (sumber_koordinat IN ('gps', 'manual')),
  wilayah VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  skala VARCHAR(20) NOT NULL CHECK (skala IN ('KECIL', 'SEDANG', 'BESAR')),
  tingkat_keyakinan VARCHAR(20) NOT NULL DEFAULT 'TINJAUAN' CHECK (tingkat_keyakinan IN ('TINGGI', 'TINJAUAN', 'CURIGA')),
  date_time_original TIMESTAMPTZ,
  waktu_jepret_exif TIMESTAMPTZ,
  status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'belum-diverifikasi' CHECK (status_verifikasi IN ('belum-diverifikasi', 'terverifikasi', 'spam')),
  status_penanganan VARCHAR(30) NOT NULL DEFAULT 'menunggu' CHECK (status_penanganan IN ('menunggu', 'diproses', 'selesai')),
  petugas_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for geospatial & filter queries
CREATE INDEX IF NOT EXISTS idx_laporan_status_verifikasi ON public.laporan(status_verifikasi);
CREATE INDEX IF NOT EXISTS idx_laporan_status_penanganan ON public.laporan(status_penanganan);
CREATE INDEX IF NOT EXISTS idx_laporan_created_at ON public.laporan(created_at DESC);

-- 2. Table User_Petugas
CREATE TABLE IF NOT EXISTS public.petugas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  institusi VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'PETUGAS_LAPANGAN'
);

-- Auto-create profil petugas setiap user baru dibuat di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_petugas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.petugas (id, nama, email, institusi, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'institusi', 'BPBD Sumatera Selatan'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'PETUGAS_LAPANGAN')
  )
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_petugas();

-- 3. Table Log_Verifikasi
CREATE TABLE IF NOT EXISTS public.log_verifikasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laporan_id UUID NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  petugas_id UUID REFERENCES public.petugas(id),
  aksi VARCHAR(100) NOT NULL,
  catatan TEXT,
  waktu TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table Rate Limit
CREATE TABLE IF NOT EXISTS public.rate_limit (
  ip VARCHAR(50) PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  last_request TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Data Demo (Wilayah Kota Palembang & Sumatera Selatan)
INSERT INTO public.petugas (id, nama, email, institusi, role)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Komandan Budi Santoso', 'petugas@sigap.go.id', 'Manggala Agni / BPBD Sumatera Selatan', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.laporan (id, kode, foto_url, lat_gps, lng_gps, lat_exif, lng_exif, jarak_exif_gps_m, flag_manual, wilayah, deskripsi, skala, tingkat_keyakinan, date_time_original, status_verifikasi, status_penanganan, created_at)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'SIGAP-20260916-001',
    '/images/karhutla_smoke_forest.png',
    -3.0037,
    104.7060,
    -3.0039,
    104.7062,
    30,
    FALSE,
    'Kec. Gandus, Kota Palembang, Sumatera Selatan',
    'Terlihat asap tebal membumbung tinggi dari lahan gambut kering tepi Sungai Musi.',
    'BESAR',
    'TINGGI',
    NOW() - INTERVAL '2 hours 5 minutes',
    'terverifikasi',
    'diproses',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'SIGAP-20260916-002',
    '/images/firefighter_action.png',
    -2.9176,
    104.7063,
    -2.9480,
    104.7010,
    3430,
    TRUE,
    'Kec. Sukarami, Kota Palembang, Sumatera Selatan',
    'Kebakaran rerumputan dan semak kering dekat permukiman warga.',
    'SEDANG',
    'TINJAUAN',
    NOW() - INTERVAL '50 minutes',
    'belum-diverifikasi',
    'menunggu',
    NOW() - INTERVAL '45 minutes'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'SIGAP-20260916-003',
    '/images/drone_monitoring.png',
    -3.2456,
    104.6570,
    NULL,
    NULL,
    NULL,
    FALSE,
    'Kec. Indralaya, Kab. Ogan Ilir, Sumatera Selatan',
    'Titik api kecil bekas pembakaran lahan semak yang mulai meluas.',
    'KECIL',
    'TINJAUAN',
    NULL,
    'terverifikasi',
    'selesai',
    NOW() - INTERVAL '24 hours'
  )
ON CONFLICT (kode) DO NOTHING;
