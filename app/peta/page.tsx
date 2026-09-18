'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import { LaporanItem } from '@/lib/db/store';

const LeafletMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-[#800020] border border-[#5C0016] flex items-center justify-center font-mono text-[11px] text-[#E8C9CF]">
      MEMUAT INTERACTIVE MAP LEAFLET...
    </div>
  ),
});

export default function PetaPage() {
  const [reports, setReports] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<LaporanItem | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Public endpoint: only verified reports are returned.
      const res = await fetch('/api/laporan');
      const json = await res.json();
      if (json.data) {
        setReports(json.data);
      }
    } catch (err) {
      console.error('Fetch reports failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="w-full flex flex-col flex-1 py-10">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full flex-1 flex flex-col">
        <SectionHeader
          eyebrow="PETA SEBARAN REAL-TIME"
          counter={`MARKER: ${reports.length}`}
          title="PETA SEBARAN TITIK KEBAKARAN LAHAN"
          description="Pemantauan sebaran lokasi titik api (wilayah Sumatera Selatan) yang telah diverifikasi oleh petugas."
        />

        {/* Info Bar */}
        <div className="w-full bg-[#FFFFFF] border border-[#D0D5DD] p-4 mb-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[12px]">
          <div className="flex items-center gap-2 text-[#525866]">
            <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            <span className="uppercase font-bold">Hanya menampilkan laporan terverifikasi petugas</span>
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 text-[#800020] hover:underline uppercase font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#525866]" /> REFRESH PETA
          </button>
        </div>

        {/* Map Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[550px]">
          <div className="lg:col-span-8 w-full h-[550px] relative border border-[#800020] bg-[#800020]">
            <LeafletMap
              reports={reports}
              onSelectReport={(report) => setSelectedReport(report)}
            />
          </div>

          {/* Side Drawer List */}
          <div className="lg:col-span-4 flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-1">
            <div className="font-mono text-[11px] text-[#8E95A3] uppercase tracking-[0.08em] pb-2 border-b border-[#D0D5DD] flex justify-between">
              <span>LIST LAPORAN TERLOKASI</span>
              <span>{reports.length} TITIK</span>
            </div>

            {loading ? (
              <div className="p-8 text-center font-mono text-[12px] text-[#8E95A3] animate-pulse">
                MEMUAT DATA TITIK API...
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center font-mono text-[12px] text-[#8E95A3] bg-[#FFFFFF] border border-[#D0D5DD]">
                BELUM ADA LAPORAN TERVERIFIKASI
              </div>
            ) : (
              reports.map((report) => (
                <Card
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`cursor-pointer transition-all ${
                    selectedReport?.id === report.id
                      ? 'border-[#800020] bg-[#FFFFFF]'
                      : 'border-[#D0D5DD] hover:border-[#800020]'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] text-[#800020] font-bold">
                        {report.kode}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-[#15803D] font-bold">
                        Terverifikasi
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-[16px] text-[#800020] leading-snug">
                      {report.wilayah}
                    </h4>
                    <div className="flex items-center justify-end font-mono text-[11px] text-[#8E95A3] pt-2 border-t border-[#D0D5DD]">
                      <span>{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
