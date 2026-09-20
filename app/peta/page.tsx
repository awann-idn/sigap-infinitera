'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, ShieldCheck, MapPin, ChevronRight, Layers } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { LaporanItem } from '@/lib/db/store';
import { WILAYAH_SUMSEL_LIST, matchWilayahSumsel, WilayahItem } from '@/lib/wilayah';

const LeafletMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-[#FFF9F2] flex items-center justify-center font-mono text-[11px] text-[#800020]">
      MEMUAT PETA SUMATERA SELATAN...
    </div>
  ),
});

interface RegionStatItem extends WilayahItem {
  count: number;
}

export default function PetaPage() {
  const [reports, setReports] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Map viewport state (default focus South Sumatra)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-3.1, 104.0]);
  const [mapZoom, setMapZoom] = useState<number>(8);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const fetchReports = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Public endpoint: only verified reports (sedang/sudah ditangani).
      const res = await fetch('/api/laporan', { cache: 'no-store' });
      const json = await res.json();
      if (json.data) setReports(json.data);
    } catch (err) {
      console.error('Fetch reports failed:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Auto-refresh tiap 20 detik agar perubahan status dari petugas ikut tampil.
    const interval = setInterval(() => fetchReports(true), 20000);

    // Refetch ketika pengguna kembali ke tab ini.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchReports(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Privacy protection: round marker coordinates to 3 decimals (±100m precision)
  const anonymizedReports = useMemo(() => {
    return reports.map((r) => ({
      ...r,
      lat_gps: Number(r.lat_gps.toFixed(3)),
      lng_gps: Number(r.lng_gps.toFixed(3)),
      lat_exif: r.lat_exif != null ? Number(r.lat_exif.toFixed(3)) : null,
      lng_exif: r.lng_exif != null ? Number(r.lng_exif.toFixed(3)) : null,
    }));
  }, [reports]);

  // Calculate verified fire spot distribution for all 17 regencies/cities
  const regionStats = useMemo<RegionStatItem[]>(() => {
    const countMap: Record<string, number> = {};
    WILAYAH_SUMSEL_LIST.forEach((w) => {
      countMap[w.id] = 0;
    });

    reports.forEach((report) => {
      if (report.status_verifikasi === 'terverifikasi') {
        const matchedId = matchWilayahSumsel(report.wilayah || '');
        if (matchedId && countMap[matchedId] !== undefined) {
          countMap[matchedId] += 1;
        }
      }
    });

    // Sort descending: highest count first, then alphabetical
    return WILAYAH_SUMSEL_LIST.map((w) => ({
      ...w,
      count: countMap[w.id] || 0,
    })).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });
  }, [reports]);

  const totalTitikApi = useMemo(() => {
    return regionStats.reduce((sum, r) => sum + r.count, 0);
  }, [regionStats]);

  const handleSelectRegion = (region: RegionStatItem) => {
    setSelectedRegionId(region.id);
    setMapCenter(region.center);
    setMapZoom(11);
  };

  const handleResetView = () => {
    setSelectedRegionId(null);
    setMapCenter([-3.1, 104.0]);
    setMapZoom(8);
  };

  return (
    <div className="w-full flex flex-col flex-1 py-10">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full flex-1 flex flex-col">
        <SectionHeader
          eyebrow="PETA SEBARAN REAL-TIME"
          counter={`TOTAL: ${totalTitikApi} TITIK TERVERIFIKASI`}
          title="PETA SEBARAN TITIK KEBAKARAN LAHAN"
          description="Pemantauan sebaran titik api di 17 Kabupaten & Kota Provinsi Sumatera Selatan yang telah diverifikasi petugas."
        />

        {/* Info & Filter Bar */}
        <div className="w-full bg-[#FFFFFF] border-2 border-[#800020] p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 font-mono text-[11px] sm:text-[12px]">
          <div className="flex items-center gap-2 text-[#272E3B]">
            <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
            <span className="uppercase font-bold">
              Laporan terverifikasi yang sedang/sudah ditangani
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#800020]/20">
            {selectedRegionId && (
              <button
                onClick={handleResetView}
                className="font-mono text-[10px] sm:text-[11px] text-[#525866] hover:text-[#800020] uppercase font-bold flex items-center gap-1 border border-[#D0D5DD] px-2 py-1 bg-[#FFF9F2]"
              >
                <Layers className="w-3.5 h-3.5" /> LIHAT SEMUA WILAYAH
              </button>
            )}

            <button
              onClick={() => fetchReports()}
              disabled={loading}
              className="flex items-center gap-1.5 text-[#800020] hover:underline uppercase font-bold disabled:opacity-50 text-[11px] sm:text-[12px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#800020] ${loading ? 'animate-spin' : ''}`} />
              REFRESH PETA
            </button>
          </div>
        </div>

        {/* 2-Column Grid Layout: 75% Left (Map) / 25% Right (List) on desktop, stacked on <1024px */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 w-full lg:h-[700px]">
          {/* Kolom Kiri: 75% (9 of 12 cols) - Leaflet Map */}
          <div className="lg:col-span-9 h-[380px] sm:h-[500px] lg:h-full border-2 border-[#800020] bg-[#FFF9F2] relative overflow-hidden flex flex-col">
            <LeafletMap
              reports={anonymizedReports}
              center={mapCenter}
              zoom={mapZoom}
              roundCoords={true}
            />

            {/* Privacy indicator overlay on map corner */}
            <div className="absolute bottom-2 left-2 z-[900] bg-[#FFFFFF]/90 backdrop-blur border border-[#800020] px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[9px] sm:text-[10px] text-[#525866] uppercase">
              Koordinat publik disamarkan ±100m (Privasi Warga)
            </div>

            {/* Status legend overlay */}
            <div className="absolute bottom-2 right-2 z-[900] bg-[#FFFFFF]/90 backdrop-blur border border-[#800020] px-2.5 py-1.5 font-mono text-[9px] sm:text-[10px] text-[#272E3B] uppercase flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 inline-block" style={{ background: '#800020' }} /> Diproses
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 inline-block" style={{ background: '#15803D' }} /> Selesai
              </span>
            </div>
          </div>

          {/* Kolom Kanan: 25% (3 of 12 cols) - Panel Sebaran per Wilayah */}
          <div className="lg:col-span-3 h-[480px] lg:h-full border-2 border-[#800020] bg-[#FFFFFF] flex flex-col overflow-hidden shadow-sm">
            {/* Header Panel */}
            <div className="bg-[#FFF9F2] px-4 py-3.5 border-b-2 border-[#800020] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#800020]" />
                <h2 className="font-mono text-[12px] uppercase tracking-[0.08em] font-bold text-[#800020]">
                  SEBARAN PER WILAYAH
                </h2>
              </div>
              <span className="font-mono text-[10px] text-[#525866] font-bold bg-[#FFFFFF] px-1.5 py-0.5 border border-[#D0D5DD]">
                17 WILAYAH
              </span>
            </div>

            {/* Scrollable Region List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#D0D5DD]/80">
              {loading ? (
                <div className="p-6 text-center font-mono text-[11px] text-[#8E95A3] animate-pulse">
                  MENGHITUNG SEBARAN WILAYAH...
                </div>
              ) : (
                regionStats.map((item) => {
                  const isZero = item.count === 0;
                  const isSelected = selectedRegionId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectRegion(item)}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors text-[13px] ${
                        isSelected
                          ? 'bg-[#FFF9F2] border-l-4 border-l-[#800020]'
                          : isZero
                          ? 'hover:bg-[#F8FAFC]'
                          : 'hover:bg-[#FFF9F2]/70'
                      }`}
                      title={`Klik untuk zoom ke ${item.name}`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span
                          className={`font-body font-bold leading-tight truncate ${
                            isZero ? 'text-[#8E95A3]' : 'text-[#272E3B]'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#8E95A3]">
                          {item.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isZero ? (
                          <span className="font-mono text-[11px] text-[#8E95A3] px-2 py-0.5 border border-[#D0D5DD]/60 bg-[#F8FAFC]">
                            0 Titik
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-[#800020] px-2 py-0.5 border border-[#800020] bg-[#FFF9F2]">
                            {item.count} Titik
                          </span>
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-[#800020]' : 'text-[#D0D5DD]'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-3 bg-[#FFF9F2] border-t-2 border-[#800020] font-mono text-[11px] flex items-center justify-between shrink-0">
              <span className="text-[#525866]">TOTAL TERVERIFIKASI:</span>
              <span className="font-bold text-[#800020]">{totalTitikApi} TITIK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
