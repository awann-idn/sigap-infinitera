import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import { ShieldCheck, Eye, Lock, FileText } from 'lucide-react';

export default function PrivasiPage() {
  return (
    <div className="w-full py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <SectionHeader
          eyebrow="TRANSPARANSI & PRIVASI"
          counter="DOKUMEN KEBIJAKAN"
          title="KEBIJAKAN PRIVASI DATA PELAPORAN"
          description="Komitmen perlindungan data publik, prinsip anonimitas pelapor, dan ketentuan penggunaan informasi pada platform SIGAP."
        />

        <div className="max-w-4xl flex flex-col gap-6">
          <Card className="p-8 flex flex-col gap-4 border-2 border-[#000000]">
            <h2 className="font-display font-bold text-[20px] text-[#000000] flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#800020]" />
              Prinsip Anonimitas dan Batasan Data yang Dikumpulkan
            </h2>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              Sistem Informasi Geolokasi Aduan Pelaporan (SIGAP) dirancang dengan komitmen penuh terhadap perlindungan privasi masyarakat. SIGAP sama sekali tidak mengumpulkan nama lengkap, Nomor Induk Kependudukan (NIK), nomor telepon seluler, maupun informasi pengenal identitas pribadi lainnya dari warga yang mengirimkan laporan, sehingga seluruh proses pelaporan insiden kebakaran hutan dan lahan bersifat anonim. Data yang dihimpun dan disimpan oleh sistem dibatasi secara ketat pada dokumentasi visual foto kejadian lapangan, koordinat geografis titik lokasi, pencatatan waktu pelaporan secara otomatis, serta keterangan deskripsi tambahan bersifat opsional yang disertakan oleh pelapor.
            </p>
          </Card>

          <Card className="p-8 flex flex-col gap-4 border-2 border-[#000000]">
            <h2 className="font-display font-bold text-[20px] text-[#000000] flex items-center gap-2">
              <Eye className="w-6 h-6 text-[#800020]" />
              Integritas Dokumentasi dan Ketentuan Pengambilan Foto
            </h2>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              Guna menjamin keabsahan dan keaslian setiap laporan yang masuk ke meja kendali tanggap darurat, berkas foto bukti kebakaran wajib diambil secara langsung melalui sensor kamera perangkat pada saat pelapor berada di lokasi kejadian. SIGAP secara sistematis memblokir dan menolak pengunggahan gambar dari galeri atau berkas media lokal pada perangkat mobile guna mencegah manipulasi visual, penyebaran disinformasi, atau penggunaan foto arsip usang yang tidak mencerminkan kondisi riil di lapangan.
            </p>
          </Card>

          <Card className="p-8 flex flex-col gap-4 border-2 border-[#000000]">
            <h2 className="font-display font-bold text-[20px] text-[#000000] flex items-center gap-2">
              <Lock className="w-6 h-6 text-[#800020]" />
              Pengaburan Koordinat Publik dan Akses Terbatas Petugas
            </h2>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              Demi melindungi privasi kepemilikan tanah serta properti warga di sekitar area titik api, koordinat lokasi yang dipublikasikan pada peta sebaran terbuka disamarkan secara otomatis melalui pembulatan nilai presisi hingga toleransi rentang ±100 meter. Informasi koordinat presisi penuh dengan akurasi meter mutlak hanya dapat diakses secara eksklusif oleh personel dan petugas operasional berwenang, seperti Badan Penanggulangan Bencana Daerah (BPBD) dan satuan Manggala Agni, yang telah melewati proses autentikasi resmi untuk kepentingan taktis navigasi armada dan pemadaman langsung di lapangan.
            </p>
          </Card>

          <Card className="p-8 flex flex-col gap-4 border-2 border-[#000000]">
            <h2 className="font-display font-bold text-[20px] text-[#000000] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#800020]" />
              Tujuan Penyimpanan dan Retensi Data Laporan
            </h2>
            <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
              Semua data laporan yang telah terkirim disimpan dalam basis data terenkripsi untuk keperluan dokumentasi historis, evaluasi penanganan bencana karhutla, serta analisis spasial mitigasi titik rawan kebakaran lintas instansi. SIGAP tidak memperjualbelikan, memindahtangankan, ataupun memanfaatkan data pelaporan untuk kepentingan komersial di luar misi penyelamatan lingkungan dan penanggulangan bencana kebakaran hutan dan lahan di wilayah Sumatera Selatan.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
