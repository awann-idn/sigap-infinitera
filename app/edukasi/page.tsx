'use client';

import React, { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import { HelpCircle, ChevronDown } from 'lucide-react';

export default function EdukasiPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const articles = [
    {
      id: 1,
      tag: 'PENCEGAHAN & TEKNOLOGI',
      title: 'Teknik Pembukaan Lahan Tanpa Bakar (PLTB)',
      date: '14 SEPTEMBER 2026',
      image: '/images/canal_blocking_prevention.png',
      content:
        'Pembukaan lahan gambut tanpa pembakaran memanfaatkan penyiangan mekanis, pencacahan sisa vegetasi menjadi mulsa organik, serta pengelolaan tinggi muka air tanah via sekatan kanal (canal blocking). Metode ini terbukti mencegah kebakaran lahan bawah permukaan (ground fire) yang sulit dipadamkan.',
    },
    {
      id: 2,
      tag: 'KESEHATAN MASYARAKAT',
      title: 'Perlindungan Paru-paru dari Bahaya Partikulat PM2.5',
      date: '12 SEPTEMBER 2026',
      image: '/images/firefighter_action.png',
      content:
        'Asap karhutla mengandung emisi karbon monoksida, senyawa organik volatil, dan partikel halus PM2.5 yang dapat menembus kantung udara paru-paru. Masyarakat di imbau menggunakan masker respirator N95/KN95, menutup ventilasi saat kabut asap pekat, dan memantau Indeks Standar Pencemar Udara (ISPU).',
    },
    {
      id: 3,
      tag: 'PROSEDUR EVAKUASI',
      title: 'Langkah Penyelamatkan Darurat Saat Terjebak Asap',
      date: '10 SEPTEMBER 2026',
      image: '/images/drone_monitoring.png',
      content:
        'Jika pemukiman Anda berdekatan dengan titik api: Segera berkumpul di titik evakuasi desa, sirami atap dan pekarangan dengan air, tiupan angin dapat mengarahkan lidah api dengan cepat. Segera hubungi hotline SIGAP atau 112 untuk koordinasi pemadam.',
    },
  ];

  const faqs = [
    {
      q: 'Kapan saya harus mengirimkan laporan lewat SIGAP?',
      a: 'Segera setelah Anda melihat kepulan asap tebal, pijar api lahan, atau indikasi awal karhutla di lingkungan Anda. Laporan yang masuk lebih cepat membantu pemadam mengisolasi titik api sebelum meluas.',
    },
    {
      q: 'Apa yang terjadi setelah laporan berhasil dikirim?',
      a: 'Laporan Anda langsung masuk ke Dashboard Piket Petugas Pemadam / BPBD. Petugas akan memverifikasi foto dan selisih koordinat GPS vs EXIF. Jika terkonfirmasi valid, status diubah menjadi "Terverifikasi" dan regu pemadam diterjunkan.',
    },
    {
      q: 'Bagaimana jika ponsel saya tidak melampirkan data EXIF foto?',
      a: 'Tidak masalah. SIGAP mengutamakan Geolocation API bawaan browser sebagai koordinat utama. Metadata EXIF foto hanya bertindak sebagai data pendukung validasi tambahan.',
    },
    {
      q: 'Apakah pelapor wajib mendaftar akun terlebih dahulu?',
      a: 'Tidak. Untuk mengurangi friksi pada kondisi darurat, pelaporan publik dilakukan secara Guest Report tanpa syarat registrasi akun.',
    },
  ];

  return (
    <div className="w-full py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <SectionHeader
          eyebrow="PUSAT EDUKASI & INFORMASI"
          counter="PREVENSI KARHUTLA"
          title="EDUKASI PENCEGAHAN KEBAKARAN & FAQ"
          description="Informasi preventif pengelolaan lahan tanpa bakar, mitigasi bahaya kesehatan asap, dan jawaban seputar alur pelaporan SIGAP."
        />

        {/* Static Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {articles.map((art) => (
            <Card key={art.id} className="flex flex-col justify-between border-2 border-[#000000]">
              <div className="flex flex-col gap-4">
                <div className="relative aspect-[16/9] bg-[#FFF9F2] overflow-hidden border border-[#000000]">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-[#FFFFFF] text-[#000000] font-mono text-[10px] uppercase font-bold px-2 py-1 border border-[#000000]">
                    {art.tag}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-[#000000] font-bold">{art.date}</div>
                <h3 className="font-display font-bold text-[22px] text-[#000000] leading-snug uppercase">
                  {art.title}
                </h3>
                <p className="font-body text-[15px] text-[#272E3B] leading-relaxed font-medium">
                  {art.content}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Accordion Section */}
        <div className="max-w-3xl mx-auto flex flex-col gap-6 pt-12 border-t-2 border-[#000000]">
          <div className="flex items-center gap-3 font-mono text-[12px] text-[#000000] uppercase font-bold">
            <HelpCircle className="w-5 h-5 text-[#000000]" /> PERTANYAAN FREKUENSI TINGGI (FAQ)
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-[#FFFFFF] border-2 border-[#000000] transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-display font-bold text-[18px] text-[#000000] hover:bg-[#FFF9F2]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-[#000000] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 font-body text-[15px] text-[#272E3B] font-medium leading-relaxed border-t border-[#000000]/20 mt-2">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
