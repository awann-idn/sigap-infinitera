'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Eye, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/Badge';
import Button from '@/components/Button';
import { LaporanItem } from '@/lib/db/store';

const LeafletMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[180px] bg-[#800020] border border-[#800020] flex items-center justify-center font-mono text-[11px] text-[#8E95A3]">
      MEMUAT MINI MAP...
    </div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<LaporanItem | null>(null);
  const [petugas, setPetugas] = useState<{ nama?: string; institusi?: string } | null>(null);

  const [filterVerifikasi, setFilterVerifikasi] = useState<string>('ALL');
  const [filterPenanganan, setFilterPenanganan] = useState<string>('ALL');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/laporan');
      const json = await res.json();
      if (json.data) {
        setReports(json.data);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sigap_auth');
      if (raw) setPetugas(JSON.parse(raw));
    } catch {
      setPetugas(null);
    }
  }, []);

  const handleUpdateStatus = async (
    id: string,
    verifikasi?: 'belum-diverifikasi' | 'terverifikasi' | 'spam',
    penanganan?: 'menunggu' | 'diproses' | 'selesai'
  ) => {
    try {
      const res = await fetch(`/api/laporan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_verifikasi: verifikasi,
          status_penanganan: penanganan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setReports((prev) => prev.map((r) => (r.id === id ? data.data : r)));
        if (selectedReport?.id === id) {
          setSelectedReport(data.data);
        }
      }
    } catch (e) {
      console.error('Update status error:', e);
    }
  };

  const filtered = reports.filter((r) => {
    if (filterVerifikasi !== 'ALL' && r.status_verifikasi !== filterVerifikasi) return false;
    if (filterPenanganan !== 'ALL' && r.status_penanganan !== filterPenanganan) return false;
    return true;
  });

  return (
    <div className="w-full flex-1 flex flex-col lg:flex-row bg-[#FFF9F2] border-t border-[#D0D5DD]">
      {/* Sidebar 240px */}
      <aside className="w-full lg:w-[240px] bg-[#FFFFFF] border-b lg:border-b-0 lg:border-r border-[#D0D5DD] p-6 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#D0D5DD]">
            <div className="w-7 h-7 bg-[#800020] text-[#FFFFFF] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-[16px] text-[#800020]">
                {petugas?.nama || 'PANEL PETUGAS'}
              </span>
              <span className="font-mono text-[10px] text-[#8E95A3]">
                {petugas?.institusi || 'DASHBOARD VERIFIKASI'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 font-mono text-[12px]">
            <button
              onClick={fetchReports}
              className="p-3 bg-[#FFF9F2] border border-[#D0D5DD] text-[#800020] font-bold text-left flex items-center gap-2 hover:border-[#800020]"
            >
              <RefreshCw className="w-4 h-4 text-[#525866]" /> REFRESH LAPORAN
            </button>
            <div className="p-3 text-[#8E95A3]">
              STATUS PETUGAS: <span className="text-[#16A34A] font-bold">ONLINE (PIKET)</span>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
            } catch {
              // ignore network errors, still clear local session
            }
            localStorage.removeItem('sigap_auth');
            router.push('/login');
            router.refresh();
          }}
          className="font-mono text-[12px] text-[#525866] hover:text-[#DC2626] flex items-center gap-2 pt-6 border-t border-[#D0D5DD]"
        >
          <LogOut className="w-4 h-4" /> LOGOUT PETUGAS
        </button>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D0D5DD]">
          <div>
            <h1 className="font-display font-bold text-[28px] text-[#800020]">
              DASHBOARD ADUAN KEBAKARAN
            </h1>
            <p className="font-mono text-[11px] text-[#8E95A3] uppercase mt-1">
              MANAJEMEN VERIFIKASI & PENANGANAN LAPORAN MASUK
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <select
              value={filterVerifikasi}
              onChange={(e) => setFilterVerifikasi(e.target.value)}
              className="bg-[#FFFFFF] border border-[#D0D5DD] text-[#800020] px-3 py-2 focus:outline-none focus:border-[#800020]"
            >
              <option value="ALL">VERIFIKASI: SEMUA</option>
              <option value="belum-diverifikasi">BELUM DIVERIFIKASI</option>
              <option value="terverifikasi">TERVERIFIKASI</option>
              <option value="spam">SPAM</option>
            </select>

            <select
              value={filterPenanganan}
              onChange={(e) => setFilterPenanganan(e.target.value)}
              className="bg-[#FFFFFF] border border-[#D0D5DD] text-[#800020] px-3 py-2 focus:outline-none focus:border-[#800020]"
            >
              <option value="ALL">PENANGANAN: SEMUA</option>
              <option value="menunggu">MENUNGGU</option>
              <option value="diproses">DIPROSES</option>
              <option value="selesai">SELESAI</option>
            </select>
          </div>
        </div>

        {/* Reports Table */}
        <div className="w-full bg-[#FFFFFF] border border-[#D0D5DD] overflow-x-auto">
          <table className="w-full text-left border-collapse font-body text-[14px]">
            <thead>
              <tr className="bg-[#FFF9F2] border-b border-[#D0D5DD] font-mono text-[11px] text-[#8E95A3] uppercase">
                <th className="p-4">KODE / ID</th>
                <th className="p-4">WAKTU</th>
                <th className="p-4">WILAYAH</th>
                <th className="p-4">SKALA</th>
                <th className="p-4">VERIFIKASI</th>
                <th className="p-4">PENANGANAN</th>
                <th className="p-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0D5DD]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-mono text-[12px] text-[#8E95A3]">
                    MEMUAT TABLE LAPORAN...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-mono text-[12px] text-[#8E95A3]">
                    TIDAK ADA DATA LAPORAN
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FFF9F2] transition-colors">
                    <td className="p-4 font-mono text-[13px] text-[#800020] font-bold">
                      {item.kode}
                    </td>
                    <td className="p-4 font-mono text-[12px] text-[#525866]">
                      {new Date(item.created_at).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="p-4 font-bold text-[#800020] max-w-[200px] truncate">
                      {item.wilayah}
                    </td>
                    <td className="p-4">
                      <Badge type="skala" value={item.skala} isDashboard={true} />
                    </td>
                    <td className="p-4">
                      <Badge type="verifikasi" value={item.status_verifikasi} isDashboard={true} />
                    </td>
                    <td className="p-4">
                      <Badge type="penanganan" value={item.status_penanganan} isDashboard={true} />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedReport(item)}
                        className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D0D5DD] hover:border-[#800020] text-[#800020] font-mono text-[11px] uppercase inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#525866]" /> DETAIL & AKSI
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Report Detail Drawer Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[9990] bg-[#800020]/70 backdrop-blur-sm flex justify-end p-0">
          <div className="w-full max-w-2xl bg-[#FFFFFF] border-l border-[#D0D5DD] h-full overflow-y-auto p-6 lg:p-8 flex flex-col justify-between shadow-2xl">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D0D5DD]">
                <div className="flex items-center gap-2 font-mono text-[14px] text-[#800020] font-bold">
                  <span>DETAIL LAPORAN: {selectedReport.kode}</span>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 text-[#8E95A3] hover:text-[#800020]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative aspect-[16/10] bg-[#FFF9F2] border border-[#D0D5DD] overflow-hidden">
                <img
                  src={selectedReport.foto_url}
                  alt="Bukti Visual"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-[#FFF9F2] p-4 border border-[#D0D5DD] flex flex-col gap-3 font-mono text-[12px]">
                <div className="text-[#800020] font-bold uppercase">PERBANDINGAN INTEGRITAS GEOLOKASI</div>
                <div className="flex justify-between">
                  <span className="text-[#8E95A3]">GPS BROWSER:</span>
                  <span className="text-[#800020]">{selectedReport.lat_gps}, {selectedReport.lng_gps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E95A3]">EXIF FOTO:</span>
                  <span className="text-[#800020]">
                    {selectedReport.lat_exif !== undefined ? `${selectedReport.lat_exif}, ${selectedReport.lng_exif}` : 'TIDAK TERSEDIA'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#D0D5DD]">
                  <span className="text-[#8E95A3]">SELISIH JARAK:</span>
                  <span className="text-[#800020] font-bold">
                    {selectedReport.jarak_exif_gps_m !== undefined ? `${selectedReport.jarak_exif_gps_m} METER` : 'N/A'}
                  </span>
                </div>
                {selectedReport.flag_manual && (
                  <div className="p-2 bg-[#FFFFFF] border border-[#DC2626] text-[#DC2626] text-[11px] font-bold">
                    FLAG: SELISIH &gt; 500M / FALLBACK PIN PERLU DIVERIFIKASI
                  </div>
                )}
              </div>

              <div className="w-full h-[180px] border border-[#800020] bg-[#800020]">
                <LeafletMap reports={[selectedReport]} center={[selectedReport.lat_gps, selectedReport.lng_gps]} zoom={13} interactive={false} />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-[#8E95A3] uppercase">DESKRIPSI PELAPOR:</span>
                <p className="font-body text-[14px] text-[#800020] bg-[#FFF9F2] p-3 border border-[#D0D5DD]">
                  {selectedReport.deskripsi || 'Tidak ada catatan deskripsi tambahan.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-6 border-t border-[#D0D5DD] mt-6">
              <div className="font-mono text-[11px] text-[#8E95A3] uppercase">AKSI VERIFIKASI PETUGAS:</div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'terverifikasi')}
                >
                  ✓ VERIFIKASI VALID
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'spam')}
                >
                  ✕ TANDAI SPAM
                </Button>
              </div>

              <div className="font-mono text-[11px] text-[#8E95A3] uppercase pt-2">STATUS PENANGANAN:</div>
              <div className="grid grid-cols-3 gap-2">
                {(['menunggu', 'diproses', 'selesai'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdateStatus(selectedReport.id, undefined, p)}
                    className={`h-[40px] font-mono text-[11px] uppercase border transition-colors ${
                      selectedReport.status_penanganan === p
                        ? 'bg-[#800020] text-[#FFFFFF] border-[#800020] font-bold'
                        : 'bg-[#FFF9F2] text-[#525866] border-[#D0D5DD] hover:border-[#800020]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
