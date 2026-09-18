'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LaporanItem } from '@/lib/db/store';

const LeafletMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-[#800020] border border-[#800020] flex items-center justify-center font-mono text-[11px] text-[#8E95A3]">
      MEMUAT INTERACTIVE MAP LEAFLET...
    </div>
  ),
});

export default function PetaPage() {
  const [reports, setReports] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'terverifikasi' | 'belum-diverifikasi'>('SEMUA');
  const [skalaFilter, setSkalaFilter] = useState<'SEMUA' | 'BESAR' | 'SEDANG' | 'KECIL'>('SEMUA');
  const [selectedReport, setSelectedReport] = useState<LaporanItem | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
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

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'SEMUA' && r.status_verifikasi !== statusFilter) return false;
    if (skalaFilter !== 'SEMUA' && r.skala !== skalaFilter) return false;
    return true;
  });

  return (
    <div className="w-full flex flex-col flex-1 py-10">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full flex-1 flex flex-col">
        <SectionHeader
          eyebrow="PETA SEBARAN REAL-TIME"
          counter={`MARKER: ${filteredReports.length}`}
          title="PETA SEBARAN TITIK KEBAKARAN LAHAN"
          description="Pemantauan sebaran lokasi titik api real-time hasil aduan masyarakat terkonfirmasi."
        />

        {/* Filter Bar */}
        <div className="w-full bg-[#FFFFFF] border border-[#D0D5DD] p-4 mb-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[12px]">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[#8E95A3] uppercase">STATUS:</span>
              <div className="flex items-center gap-1">
                {(['SEMUA', 'terverifikasi', 'belum-diverifikasi'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 uppercase text-[11px] border transition-colors ${
                      statusFilter === s
                        ? 'bg-[#800020] text-[#FFFFFF] border-[#800020] font-bold'
                        : 'bg-[#FFF9F2] text-[#525866] border-[#D0D5DD] hover:border-[#800020]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#8E95A3] uppercase">SKALA:</span>
              <div className="flex items-center gap-1">
                {(['SEMUA', 'BESAR', 'SEDANG', 'KECIL'] as const).map((sk) => (
                  <button
                    key={sk}
                    onClick={() => setSkalaFilter(sk)}
                    className={`px-3 py-1 uppercase text-[11px] border transition-colors ${
                      skalaFilter === sk
                        ? 'bg-[#800020] text-[#FFFFFF] border-[#800020] font-bold'
                        : 'bg-[#FFF9F2] text-[#525866] border-[#D0D5DD] hover:border-[#800020]'
                    }`}
                  >
                    {sk}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 text-[#800020] hover:underline uppercase font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#525866]" /> REFRESH PETA
          </button>
        </div>

        {/* Map Layout - Dark Software Telemetry Panel Matching Screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[550px]">
          <div className="lg:col-span-8 w-full h-[550px] relative border border-[#800020] bg-[#800020]">
            <LeafletMap
              reports={filteredReports}
              onSelectReport={(report) => setSelectedReport(report)}
            />
          </div>

          {/* Side Drawer List */}
          <div className="lg:col-span-4 flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-1">
            <div className="font-mono text-[11px] text-[#8E95A3] uppercase tracking-[0.08em] pb-2 border-b border-[#D0D5DD] flex justify-between">
              <span>LIST LAPORAN TERLOKASI</span>
              <span>{filteredReports.length} TITIK</span>
            </div>

            {loading ? (
              <div className="p-8 text-center font-mono text-[12px] text-[#8E95A3] animate-pulse">
                MEMUAT DATA TITIK API...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-8 text-center font-mono text-[12px] text-[#8E95A3] bg-[#FFFFFF] border border-[#D0D5DD]">
                TIDAK ADA LAPORAN SESUAI FILTER
              </div>
            ) : (
              filteredReports.map((report) => (
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
                      <Badge type="verifikasi" value={report.status_verifikasi} isDashboard={false} />
                    </div>
                    <h4 className="font-display font-bold text-[16px] text-[#800020] leading-snug">
                      {report.wilayah}
                    </h4>
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#525866] pt-2 border-t border-[#D0D5DD]">
                      <span>SKALA: <span className="text-[#800020] font-bold">{report.skala}</span></span>
                      <span className="text-[#8E95A3]">{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
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
