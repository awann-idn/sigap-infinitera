'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, ShieldCheck, MapPin } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { LaporanItem } from '@/lib/db/store';
import { normalizeWilayahCity } from '@/lib/wilayah';

const LeafletMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[560px] bg-[#800020] flex items-center justify-center font-mono text-[11px] text-[#E8C9CF]">
      MEMUAT INTERACTIVE MAP LEAFLET...
    </div>
  ),
});

interface CityStat {
  city: string;
  count: number;
  level: 'RENDAH' | 'SEDANG' | 'TINGGI';
}

function getLevel(count: number): CityStat['level'] {
  if (count >= 3) return 'TINGGI';
  if (count === 2) return 'SEDANG';
  return 'RENDAH';
}

const LEVEL_STYLE: Record<CityStat['level'], string> = {
  TINGGI: 'text-[#B91C1C] border-[#B91C1C] bg-[#B91C1C]/10',
  SEDANG: 'text-[#A16207] border-[#A16207] bg-[#A16207]/10',
  RENDAH: 'text-[#15803D] border-[#15803D] bg-[#15803D]/10',
};

export default function PetaPage() {
  const [reports, setReports] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Public endpoint: only verified reports are returned.
      const res = await fetch('/api/laporan');
      const json = await res.json();
      if (json.data) setReports(json.data);
    } catch (err) {
      console.error('Fetch reports failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const cityStats = useMemo<CityStat[]>(() => {
    const counts: Record<string, number> = {};
    reports.forEach((report) => {
      const city = normalizeWilayahCity(report.wilayah || '');
      counts[city] = (counts[city] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([city, count]) => ({ city, count, level: getLevel(count) }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  return (
    <div className="w-full flex flex-col flex-1 py-10">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full flex-1 flex flex-col">
        <SectionHeader
          eyebrow="PETA SEBARAN REAL-TIME"
          counter={`MARKER: ${reports.length}`}
          title="PETA SEBARAN TITIK KEBAKARAN LAHAN"
          description="Pemantauan sebaran titik api (wilayah Sumatera Selatan) yang telah diverifikasi petugas."
        />

        {/* Info Bar */}
        <div className="w-full bg-[#FFFFFF] border border-[#D0D5DD] p-4 mb-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[12px]">
          <div className="flex items-center gap-2 text-[#525866]">
            <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
            <span className="uppercase font-bold">Hanya menampilkan laporan terverifikasi petugas</span>
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 text-[#800020] hover:underline uppercase font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#525866]" /> REFRESH PETA
          </button>
        </div>

        {/* Full Map */}
        <div className="relative w-full h-[68vh] min-h-[520px] border border-[#800020] bg-[#800020] overflow-hidden">
          <LeafletMap reports={reports} />

          {/* Floating city panel (IQAir-style) */}
          <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[300px] z-[1000] bg-[#FFFFFF]/95 backdrop-blur border border-[#800020] max-h-[60%] overflow-y-auto shadow-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#D0D5DD]">
              <MapPin className="w-4 h-4 text-[#800020]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] font-bold text-[#800020]">
                Kota Terdampak
              </span>
            </div>

            {loading ? (
              <div className="p-4 font-mono text-[11px] text-[#8E95A3] animate-pulse">
                MEMUAT DATA KOTA...
              </div>
            ) : cityStats.length === 0 ? (
              <div className="p-4 font-mono text-[11px] text-[#8E95A3]">
                Belum ada kota terdampak.
              </div>
            ) : (
              <ul className="divide-y divide-[#D0D5DD]">
                {cityStats.map((stat) => (
                  <li key={stat.city} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-body text-[13px] font-bold text-[#272E3B] leading-snug">
                        {stat.city}
                      </span>
                      <span className="font-mono text-[10px] text-[#8E95A3]">
                        {stat.count} titik api
                      </span>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 font-mono text-[10px] uppercase font-bold border ${LEVEL_STYLE[stat.level]}`}
                    >
                      {stat.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="px-4 py-2 border-t border-[#D0D5DD] font-mono text-[9px] text-[#8E95A3] uppercase">
              Indeks dihitung dari jumlah laporan terverifikasi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
