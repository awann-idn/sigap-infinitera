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

  const heroNews = [
    {
      tag: 'KARHUTLA',
      date: '17 SEP 2026',
      title: 'BPBD Sumatera Selatan Siagakan Regu Piket 24 Jam di Titik Rawan',
      image: '/images/firefighter_action.png',
    },
    {
      tag: 'PEMANTAUAN',
      date: '16 SEP 2026',
      title: 'Deteksi Dini Titik Api Lahan Gambut Ogan Ilir',
      image: '/images/drone_monitoring.png',
    },
    {
      tag: 'PENCEGAHAN',
      date: '15 SEP 2026',
      title: 'Sosialisasi Pembukaan Lahan Tanpa Bakar di Gandus',
      image: '/images/canal_blocking_prevention.png',
    },
  ];

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
      <section className="w-full border-b border-[#C1C7D0] py-14 md:py-20 relative bg-[#FFF9F2]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase bg-[#FFFFFF] px-3 py-1.5 border border-[#C1C7D0] w-fit">
              <span>RESPONS DARURAT BENCANA KARHUTLA</span>
            </div>

            <h1 className="font-display text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] text-[#800020] leading-[1.15] uppercase">
              SEBELUM SATELIT MELIHAT, WARGA SUDAH MELAPOR.
            </h1>

            <p className="font-body text-[16px] md:text-[18px] text-[#272E3B] leading-[1.6] max-w-xl font-medium">
              Asap yang kita hirup bersama, dipadamkan bersama. Satu foto dari lokasi cukup untuk mempercepat langkah petugas.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 pt-2 max-w-md sm:max-w-none">
              <Link href="/lapor" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full sm:w-auto">
                  LAPOR SEKARANG
                </Button>
              </Link>
              <Link href="/peta" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto gap-2">
                  <MapPin className="w-4 h-4 text-[#800020]" />
                  LIHAT PETA SEBARAN
                </Button>
              </Link>
            </div>

            {/* Alur Pelaporan */}
            <div className="pt-8 border-t border-[#C1C7D0] mt-4 flex flex-col gap-4">
              <span className="font-mono text-[11px] font-bold text-[#800020] uppercase tracking-[0.15em]">
                ALUR PELAPORAN
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[32px] font-bold text-[#800020] leading-none">
                    01
                  </span>
                  <h4 className="font-body font-bold text-[15px] text-[#000000] leading-snug">
                    Foto di lokasi
                  </h4>
                  <p className="font-body text-[13px] text-[#4B5565] leading-relaxed line-clamp-2">
                    Jepret langsung dari kamera perangkat
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[32px] font-bold text-[#800020] leading-none">
                    02
                  </span>
                  <h4 className="font-body font-bold text-[15px] text-[#000000] leading-snug">
                    GPS terkunci
                  </h4>
                  <p className="font-body text-[13px] text-[#4B5565] leading-relaxed line-clamp-2">
                    Koordinat dicocokkan dengan EXIF foto
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[32px] font-bold text-[#800020] leading-none">
                    03
                  </span>
                  <h4 className="font-body font-bold text-[15px] text-[#000000] leading-snug">
                    Verifikasi petugas
                  </h4>
                  <p className="font-body text-[13px] text-[#4B5565] leading-relaxed line-clamp-2">
                    Ditinjau BPBD &amp; Manggala Agni
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Berita Terbaru */}
          <div className="lg:col-span-5 w-full flex flex-col gap-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] font-bold text-[#800020]">
              <span className="w-2.5 h-2.5 bg-[#D45060]" /> Berita Terbaru
            </div>

            <Link
              href="/edukasi"
              className="group block bg-[#FFFFFF] border-2 border-[#800020] overflow-hidden"
            >
              <div className="relative aspect-[16/10] bg-[#F3E6D5] overflow-hidden">
                <img
                  src={heroNews[0].image}
                  alt={heroNews[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 bg-[#800020] text-[#FFFFFF] font-mono text-[10px] uppercase font-bold px-2 py-1">
                  {heroNews[0].tag}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <span className="font-mono text-[10px] text-[#8E95A3] font-bold">{heroNews[0].date}</span>
                <h3 className="font-display font-bold text-[18px] text-[#800020] leading-snug">
                  {heroNews[0].title}
                </h3>
              </div>
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {heroNews.slice(1, 3).map((news) => (
                <Link
                  key={news.title}
                  href="/edukasi"
                  className="group flex gap-3 bg-[#FFFFFF] border border-[#C1C7D0] p-2 hover:border-[#800020] transition-colors"
                >
                  <div className="w-[72px] h-[72px] shrink-0 bg-[#F3E6D5] overflow-hidden">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-mono text-[9px] uppercase text-[#D45060] font-bold">{news.tag}</span>
                    <h4 className="font-body text-[13px] font-bold text-[#272E3B] leading-snug line-clamp-3">
                      {news.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK SECTION */}
      <section className="w-full border-b border-[#C1C7D0] bg-[#F3E6D5] py-16">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#C1C7D0]">
            <div className="flex flex-col gap-2 md:px-8 first:pl-0">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase">
                TITIK API TERVERIFIKASI
              </span>
              <span className="font-display font-bold text-[clamp(48px,5vw,72px)] text-[#000000] leading-none">
                {String(stats.totalTerverifikasi).padStart(3, '0')}
              </span>
              <span className="font-body text-[14px] text-[#272E3B]">
                Titik api yang telah diverifikasi petugas di lapangan.
              </span>
            </div>

            <div className="flex flex-col gap-2 md:px-8">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#272E3B] font-bold uppercase">
                PENANGANAN SELESAI
              </span>
              <span className="font-display font-bold text-[clamp(48px,5vw,72px)] text-[#000000] leading-none">
                {String(stats.penangananSelesai).padStart(3, '0')}
              </span>
              <span className="font-body text-[14px] text-[#272E3B]">
                Titik api terverifikasi yang sudah ditangani tim pemadam.
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
                  <div className="relative aspect-[16/9] bg-[#FFF9F2] overflow-hidden border border-[#C1C7D0]">
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
      <section className="w-full py-20 bg-[#FFF9F2]">
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
