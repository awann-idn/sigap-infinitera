import React from 'react';
import Link from 'next/link';
import { MapPin, ShieldAlert, ArrowRight, Phone } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { getStatistics } from '@/lib/db/store';

export const revalidate = 0;

export default async function LandingPage() {
  const stats = await getStatistics();

  const edukasiArticles = [
    {
      id: 'pencegahan-lahan-gambut',
      title: 'Teknik Pembukaan Lahan Tanpa Bakar (PLTB) pada Gambut',
      excerpt: 'Panduan praktis pengelolaan tanah gambut secara komposting dan mulsa tanpa pemicu api.',
      tag: 'PENCEGAHAN',
      date: '14 SEP 2026',
      image: '/images/canal_blocking_prevention.png',
    },
    {
      id: 'dampak-kesehatan-asap',
      title: 'Mitigasi Risiko ISPA Akibat Paparan Asap Kebakaran Hutan',
      excerpt: 'Langkah pencegahan racun partikulat PM2.5 menggunakan masker N95 dan pemurni udara mandiri.',
      tag: 'KESEHATAN',
      date: '12 SEP 2026',
      image: '/images/firefighter_action.png',
    },
    {
      id: 'prosedur-evakuasi-darurat',
      title: 'Prosedur Evakuasi Cepat Saat Titik Api Mendekati Pemukiman',
      excerpt: 'Langkah dasar penyelamatkan keluarga, hewan ternak, dan jalur angin yang wajib dihindari.',
      tag: 'EVAKUASI',
      date: '10 SEP 2026',
      image: '/images/drone_monitoring.png',
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* HERO SECTION */}
      <section className="w-full border-b border-[#C1C7D0] py-16 md:py-28 relative bg-[#EDEDED]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase bg-[#FFFFFF] px-3 py-1.5 border border-[#C1C7D0] w-fit">
              <span>RESPONS DARURAT BENCANA KARHUTLA</span>
            </div>

            {/* Giant Oversized Display Type */}
            <h1 className="font-display text-[clamp(64px,10vw,150px)] font-bold tracking-[-0.04em] text-[#000000] leading-[0.92] uppercase">
              LAPOR TITIK API PRESISI GPS.
            </h1>

            <p className="font-body text-[16px] md:text-[18px] text-[#272E3B] leading-[1.6] max-w-xl mt-2 font-medium">
              Kanal pelaporan bencana kebakaran hutan & lahan tanpa instalasi aplikasi. Verifikasi presisi lokasi otomatis berbasis GPS browser dan metadata foto EXIF.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link href="/lapor">
                <Button variant="primary">
                  LAPOR SEKARANG
                </Button>
              </Link>
              <Link href="/peta">
                <Button variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4 text-[#000000]" />
                  LIHAT PETA SEBARAN
                </Button>
              </Link>
            </div>

            {/* Micro Feature Highlights */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#C1C7D0] mt-6 font-mono text-[11px] text-[#272E3B] font-bold">
              <div>TANPA REGISTRASI CRITICAL</div>
              <div>AUTO GEOLOCATION GPS</div>
              <div>DATABUAT PETUGAS RESMI</div>
            </div>
          </div>

          {/* Right Column: Hero Visual Frame */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 relative w-full shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-[#C1C7D0] font-mono text-[11px] text-[#272E3B] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#FF4D00]"></span>
                  <span>PREVIEW SYSTEM MVP</span>
                </div>
                <span>SIGAP-SYS v1.0</span>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div className="relative aspect-[16/10] bg-[#EDEDED] border border-[#C1C7D0] overflow-hidden">
                  <img
                    src="/images/karhutla_smoke_forest.png"
                    alt="Laporan Titik Api Peatland"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 right-3 font-mono text-[11px] bg-[#FFFFFF]/95 p-2 border border-[#000000] flex justify-between items-center text-[#000000] font-bold">
                    <span>LAT: -3.0037  LNG: 104.7060</span>
                    <span className="text-[#272E3B]">EXIF MATCH</span>
                  </div>
                </div>

                <div className="bg-[#EDEDED] p-3 border border-[#C1C7D0] flex items-center justify-between font-mono text-[12px]">
                  <span className="text-[#4B5565] font-bold">STATUS TERAKHIR:</span>
                  <span className="text-[#000000] font-bold uppercase">2 TERVERIFIKASI LAPANGAN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK SECTION */}
      <section className="w-full border-b border-[#C1C7D0] bg-[#E2E8F0] py-16">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#C1C7D0]">
            <div className="flex flex-col gap-2 md:px-8 first:pl-0">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase">
                TOTAL LAPORAN MASUK
              </span>
              <span className="font-display font-bold text-[clamp(48px,5vw,72px)] text-[#000000] leading-none">
                {String(stats.totalLaporan).padStart(3, '0')}
              </span>
              <span className="font-body text-[14px] text-[#272E3B]">
                Laporan aduan masyarakat terdaftar di database.
              </span>
            </div>

            <div className="flex flex-col gap-2 md:px-8">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase">
                LAPORAN TERVERIFIKASI
              </span>
              <span className="font-display font-bold text-[clamp(48px,5vw,72px)] text-[#000000] leading-none">
                {String(stats.terverifikasi).padStart(3, '0')}
              </span>
              <span className="font-body text-[14px] text-[#272E3B]">
                Dikonfirmasi petugas pemadam / BPBD di lapangan.
              </span>
            </div>

            <div className="flex flex-col gap-2 md:px-8">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase">
                WILAYAH TERBANYAK
              </span>
              <span className="font-display font-bold text-[clamp(24px,3vw,36px)] text-[#000000] leading-tight mt-2">
                {stats.wilayahTerbanyak}
              </span>
              <span className="font-body text-[14px] text-[#272E3B]">
                Frekuensi aduan tertinggi dalam 30 hari terakhir.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT EDUKASI SECTION */}
      <section className="w-full border-b border-[#C1C7D0] py-20">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <SectionHeader
            eyebrow="EDUKASI & PREVENSI"
            counter="ARTICLE 01—03"
            title="PENCEGAHAN & EDUTAINMENT KARHUTLA"
            description="Upaya preventif pembukaan lahan tanpa bakar dan panduan penanganan keselamatan darurat bagi warga."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {edukasiArticles.map((art) => (
              <Card key={art.id} className="flex flex-col justify-between group border-[#C1C7D0]">
                <div className="flex flex-col gap-4">
                  <div className="relative aspect-[16/9] bg-[#EDEDED] overflow-hidden border border-[#C1C7D0]">
                    <img
                      src={art.image}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-[#FFFFFF] text-[#000000] font-mono text-[10px] uppercase font-bold px-2 py-1 border border-[#C1C7D0]">
                      {art.tag}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-[#4B5565] font-bold">{art.date}</div>
                  <h3 className="font-display font-bold text-[20px] text-[#000000] leading-snug">
                    {art.title}
                  </h3>
                  <p className="font-body text-[14px] text-[#272E3B] line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>
                <Link
                  href="/edukasi"
                  className="font-mono text-[12px] uppercase text-[#000000] font-bold flex items-center gap-1 mt-6"
                >
                  BACA SELENGKAPNYA <ArrowRight className="w-4 h-4 text-[#000000]" />
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAK DARURAT RESMI SECTION */}
      <section className="w-full py-20 bg-[#EDEDED]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="bg-[#FFFFFF] border-2 border-[#000000] p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#000000] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#FFFFFF]" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-display font-bold text-[28px] text-[#000000]">
                  BUTUH BANTUAN DARURAT SEGERA?
                </h3>
                <p className="font-body text-[15px] text-[#272E3B] max-w-xl">
                  Gunakan hotline resmi Pemadam Kebakaran & BPBD jika terjadi ancaman jiwa langsung. SIGAP memproses laporan secara paralel ke petugas piket.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <a href="tel:112" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full gap-2">
                  <Phone className="w-4 h-4" /> PANGGIL 112
                </Button>
              </a>
              <Link href="/lapor" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  FORM LAPOR SIGAP
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
