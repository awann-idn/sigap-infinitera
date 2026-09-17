-- SIGAP Database Schema (PostgreSQL / Supabase)

-- 1. Table Laporan
CREATE TABLE IF NOT EXISTS public.laporan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(30) UNIQUE NOT NULL,
  foto_url TEXT NOT NULL,
  lat_gps FLOAT NOT NULL,
  lng_gps FLOAT NOT NULL,
  lat_exif FLOAT,
  lng_exif FLOAT,
  jarak_exif_gps_m INT,
  flag_manual BOOLEAN DEFAULT FALSE,
  wilayah VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  skala VARCHAR(20) NOT NULL CHECK (skala IN ('KECIL', 'SEDANG', 'BESAR')),
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

-- Seed Data Demo
INSERT INTO public.petugas (id, nama, email, institusi, role)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Komandan Budi Santoso', 'petugas@sigap.go.id', 'Manggala Agni / BPBD Riau', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.laporan (id, kode, foto_url, lat_gps, lng_gps, lat_exif, lng_exif, jarak_exif_gps_m, flag_manual, wilayah, deskripsi, skala, status_verifikasi, status_penanganan, created_at)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'SIGAP-20260916-001',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
    0.5071,
    101.4478,
    0.5073,
    101.4480,
    30,
    FALSE,
    'Kec. Tampan, Kota Pekanbaru, Riau',
    'Terlihat asap tebal membumbung tinggi dari lahan gambut pinggir jalan utama.',
    'BESAR',
    'terverifikasi',
    'diproses',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'SIGAP-20260916-002',
    'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=1000&q=80',
    -0.0263,
    109.3425,
    -0.0350,
    109.3500,
    1200,
    TRUE,
    'Kec. Sungai Raya, Kab. Kubu Raya, Kalimantan Barat',
    'Kebakaran rerumputan kering dekat pemukiman warga.',
    'SEDANG',
    'belum-diverifikasi',
    'menunggu',
    NOW() - INTERVAL '45 minutes'
  )
ON CONFLICT (kode) DO NOTHING;
