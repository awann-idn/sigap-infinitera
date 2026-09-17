import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import { ShieldCheck, Eye, Lock, FileText } from 'lucide-react';

export default function PrivasiPage() {
  return (
    <div className="w-full py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <SectionHeader
          eyebrow="TRANSPARANSI DATA"
          counter="KAPASITAS PRD §9"
          title="KEBIJAKAN PRIVASI & RETENSI DATA"
          description="Transparansi pengumpulan lokasi GPS, pemrosesan metadata foto EXIF, dan perlindungan privasi pelapor."
        />

        <div className="max-w-4xl flex flex-col gap-8">
          <Card className="p-8 flex flex-col gap-4 border-[#000000]">
            <h3 className="font-display font-bold text-[22px] text-[#000000] flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#000000]" /> 1. Pengambilan Data Lokasi (Geolokasi)
            </h3>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              SIGAP meminta izin akses Geolocation API browser semata-mata untuk mengamankan koordinat presisi titik bencana kebakaran hutan dan lahan. Data koordinat tidak digunakan untuk pelacakan individu dan hanya ditampilkan pada peta publik dalam konteks insiden kebakaran.
            </p>
          </Card>

          <Card className="p-8 flex flex-col gap-4 border-[#000000]">
            <h3 className="font-display font-bold text-[22px] text-[#000000] flex items-center gap-2">
              <Eye className="w-6 h-6 text-[#000000]" /> 2. Metadata Foto EXIF
            </h3>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              Foto yang diunggah diproses untuk mengekstraksi koordinat EXIF sebagai data pembanding cross-check GPS browser. Semua metadata pribadi perangkat lunak kamera non-lokasi disaring dan tidak disimpan secara permanen.
            </p>
          </Card>

          <Card className="p-8 flex flex-col gap-4 border-[#000000]">
            <h3 className="font-display font-bold text-[22px] text-[#000000] flex items-center gap-2">
              <Lock className="w-6 h-6 text-[#000000]" /> 3. Retensi & Enkripsi Data
            </h3>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              Semua password dan kredensial petugas pemadam di-hash menggunakan algoritma aman (Bcrypt/Supabase Auth). Data foto pelaporan publik disimpan selama durasi tanggap bencana dan dapat diarsip oleh instansi berwenang.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
