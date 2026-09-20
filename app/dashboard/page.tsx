'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LogOut,
  Eye,
  X,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Save,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/Badge';
import Button from '@/components/Button';
import { Toast } from '@/components/Toast';
import { LaporanItem, LaporanUpdate } from '@/lib/db/store';

const LeafletMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[180px] bg-[#800020] border border-[#5C0016] flex items-center justify-center font-mono text-[11px] text-[#E8C9CF]">
      MEMUAT MINI MAP...
    </div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<LaporanItem | null>(null);

  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [editing, setEditing] = useState(false);
  const [draftDeskripsi, setDraftDeskripsi] = useState('');
  const [draftWilayah, setDraftWilayah] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filterVerifikasi, setFilterVerifikasi] = useState<string>('ALL');
  const [filterPenanganan, setFilterPenanganan] = useState<string>('ALL');
  const [filterKeyakinan, setFilterKeyakinan] = useState<string>('ALL');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      // cache: 'no-store' agar browser tidak pernah menyajikan cache lama
      const res = await fetch('/api/laporan?scope=all', { cache: 'no-store' });
      const json = await res.json();
      if (json.data) setReports(json.data);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const closeModal = () => {
    setSelectedReport(null);
    setEditing(false);
    setConfirmDelete(false);
    setShowRejectReason(false);
    setRejectReason('');
  };

  const handleUpdate = async (
    updates: LaporanUpdate,
    successMsg: string,
    actionKey: string
  ): Promise<boolean> => {
    if (!selectedReport) return false;

    const id = selectedReport.id || (selectedReport as any).kode_laporan || selectedReport.kode;
    if (!id) {
      console.error('[DASHBOARD] ID laporan tidak valid:', selectedReport);
      setToast({ msg: 'ID LAPORAN TIDAK VALID', type: 'error' });
      return false;
    }

    console.log(`[DASHBOARD UPDATE] Aksi: "${actionKey}" | ID: "${id}" | Kode: "${selectedReport.kode}"`, updates);
    const previousReports = reports;
    const previousSelected = selectedReport;

    setPending(actionKey);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    setSelectedReport({ ...selectedReport, ...updates });

    try {
      const res = await fetch(`/api/laporan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.data) throw new Error(data.error || 'Gagal memperbarui laporan');

      setReports((prev) => prev.map((r) => (r.id === id ? data.data : r)));
      setSelectedReport(data.data);
      setToast({ msg: successMsg, type: 'success' });
      return true;
    } catch (err: any) {
      console.error('[DASHBOARD UPDATE ERROR]:', err);
      setReports(previousReports);
      setSelectedReport(previousSelected);
      setToast({ msg: err.message || 'Gagal memperbarui laporan', type: 'error' });
      return false;
    } finally {
      setPending(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;

    const id = selectedReport.id || (selectedReport as any).kode_laporan || selectedReport.kode;
    if (!id) {
      console.error('[DASHBOARD] ID laporan tidak valid untuk dihapus:', selectedReport);
      setToast({ msg: 'ID LAPORAN TIDAK VALID', type: 'error' });
      return;
    }

    console.log(`[DASHBOARD DELETE] Menghapus ID: "${id}" | Kode: "${selectedReport.kode}"`);
    const previousReports = reports;

    setPending('delete');
    setReports((prev) => prev.filter((r) => r.id !== id));
    setSelectedReport(null);
    setConfirmDelete(false);

    try {
      const res = await fetch(`/api/laporan/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus laporan');
      setToast({ msg: 'LAPORAN DIHAPUS', type: 'success' });
    } catch (err: any) {
      console.error('[DASHBOARD DELETE ERROR]:', err);
      setReports(previousReports);
      setToast({ msg: err.message || 'Gagal menghapus laporan', type: 'error' });
    } finally {
      setPending(null);
    }
  };

  const startEdit = () => {
    if (!selectedReport) return;
    setDraftDeskripsi(selectedReport.deskripsi || '');
    setDraftWilayah(selectedReport.wilayah || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const ok = await handleUpdate(
      { deskripsi: draftDeskripsi, wilayah: draftWilayah },
      'PERUBAHAN LAPORAN DISIMPAN',
      'edit'
    );
    if (ok) setEditing(false);
  };

  const filtered = reports.filter((r) => {
    if (filterVerifikasi !== 'ALL') {
      const v =
        r.status_verifikasi === 'belum-diverifikasi'
          ? 'menunggu-tinjauan'
          : r.status_verifikasi === 'spam'
          ? 'tidak-valid'
          : r.status_verifikasi;
      if (v !== filterVerifikasi) return false;
    }
    if (filterPenanganan !== 'ALL' && r.status_penanganan !== filterPenanganan) return false;
    if (filterKeyakinan !== 'ALL' && r.tingkat_keyakinan !== filterKeyakinan) return false;
    return true;
  });

  const busy = pending !== null;

  return (
    <div className="w-full flex-1 flex flex-col lg:flex-row bg-[#FFF9F2] border-t border-[#D0D5DD]">
      {/* Sidebar */}
      <aside className="w-full lg:w-[240px] bg-[#FFFFFF] border-b lg:border-b-0 lg:border-r border-[#D0D5DD] p-6 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#D0D5DD]">
            <div className="w-7 h-7 bg-[#800020] text-[#FFFFFF] flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-[15px] text-[#800020] truncate">
                BPBD SUMATERA SELATAN
              </span>
              <span className="font-mono text-[10px] text-[#8E95A3] truncate">
                PANEL PETUGAS
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 font-mono text-[12px]">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="p-3 bg-[#FFF9F2] border border-[#D0D5DD] text-[#800020] font-bold text-left flex items-center gap-2 hover:border-[#800020] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[#525866] ${loading ? 'animate-spin' : ''}`} /> REFRESH LAPORAN
            </button>
            <div className="p-3 text-[#8E95A3]">
              STATUS PETUGAS: <span className="text-[#15803D] font-bold">ONLINE (PIKET)</span>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
            } catch {
              // ignore
            }
            localStorage.removeItem('sigap_auth');
            router.push('/login');
            router.refresh();
          }}
          className="font-mono text-[12px] text-[#525866] hover:text-[#B91C1C] flex items-center gap-2 pt-6 border-t border-[#D0D5DD]"
        >
          <LogOut className="w-4 h-4" /> LOGOUT PETUGAS
        </button>
      </aside>

      {/* Content */}
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

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <select
              value={filterVerifikasi}
              onChange={(e) => setFilterVerifikasi(e.target.value)}
              className="bg-[#FFFFFF] border border-[#D0D5DD] text-[#800020] px-3 py-2 focus:outline-none focus:border-[#800020]"
            >
              <option value="ALL">VERIFIKASI: SEMUA</option>
              <option value="menunggu-tinjauan">MENUNGGU TINJAUAN</option>
              <option value="terverifikasi">TERVERIFIKASI</option>
              <option value="tidak-valid">TIDAK VALID</option>
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

            <select
              value={filterKeyakinan}
              onChange={(e) => setFilterKeyakinan(e.target.value)}
              className="bg-[#FFFFFF] border border-[#D0D5DD] text-[#800020] px-3 py-2 focus:outline-none focus:border-[#800020]"
            >
              <option value="ALL">KEYAKINAN: SEMUA</option>
              <option value="TINGGI">TINGGI</option>
              <option value="TINJAUAN">TINJAUAN</option>
              <option value="CURIGA">CURIGA</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full bg-[#FFFFFF] border border-[#D0D5DD] overflow-x-auto">
          <table className="w-full text-left border-collapse font-body text-[14px] min-w-[760px]">
            <thead>
              <tr className="bg-[#F3E6D5] border-b border-[#D0D5DD] font-mono text-[11px] text-[#8E95A3] uppercase">
                <th className="p-4">KODE / ID</th>
                <th className="p-4">WAKTU</th>
                <th className="p-4">WILAYAH</th>
                <th className="p-4">KEYAKINAN</th>
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
                    <td className="p-4 max-w-[200px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#272E3B] truncate block">{item.wilayah}</span>
                        {item.luar_wilayah && (
                          <span className="font-mono text-[9px] font-bold text-[#525866] bg-[#F0F1F3] border border-[#D0D5DD] px-1.5 py-0.5 uppercase tracking-wider inline-block w-fit">
                            LUAR WILAYAH SUMSEL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge type="keyakinan" value={item.tingkat_keyakinan || 'TINJAUAN'} isDashboard={true} />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge type="verifikasi" value={item.status_verifikasi} isDashboard={true} />
                        {item.sumber_koordinat === 'manual' && (
                          <span className="font-mono text-[9px] font-bold text-[#B45309] bg-[#B45309]/10 border border-[#B45309] px-1 py-0.5 uppercase tracking-wider">
                            PIN MANUAL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge type="penanganan" value={item.status_penanganan} isDashboard={true} />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedReport(item)}
                        className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D0D5DD] hover:border-[#800020] text-[#800020] font-mono text-[11px] uppercase inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#525866]" /> DETAIL &amp; AKSI
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail & Action Modal (popup) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[9990] bg-[#0F141A]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-3xl h-[90vh] grid grid-rows-[auto_1fr] bg-[#FFFFFF] border-2 border-[#800020] shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-[#FFFFFF] flex items-start justify-between gap-3 px-5 py-4 border-b border-[#D0D5DD]">
              <div className="flex flex-col gap-2 min-w-0">
                <span className="font-mono text-[13px] text-[#800020] font-bold truncate">
                  DETAIL LAPORAN: {selectedReport.kode}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedReport.sumber_koordinat === 'manual' && (
                    <Badge type="sumber" value="LOKASI DITENTUKAN MANUAL" isDashboard={true} />
                  )}
                  {selectedReport.luar_wilayah && (
                    <span className="font-mono text-[9px] font-bold text-[#525866] bg-[#F0F1F3] border border-[#D0D5DD] px-1.5 py-0.5 uppercase tracking-wider">
                      LUAR WILAYAH SUMSEL
                    </span>
                  )}
                  <Badge type="verifikasi" value={selectedReport.status_verifikasi} isDashboard={true} />
                  <Badge type="penanganan" value={selectedReport.status_penanganan} isDashboard={true} />
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={busy}
                className="p-1 text-[#8E95A3] hover:text-[#800020] disabled:opacity-40 shrink-0"
                aria-label="Tutup"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div
              className="min-h-0 overflow-y-auto overscroll-contain p-5 flex flex-col gap-5"
              style={{ overflowY: 'auto' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative aspect-[16/10] bg-[#FFF9F2] border border-[#D0D5DD] overflow-hidden">
                  <img src={selectedReport.foto_url} alt="Bukti Visual" className="w-full h-full object-cover" />
                </div>

                <div className="bg-[#F3E6D5] p-4 border border-[#D0D5DD] flex flex-col gap-3 font-mono text-[12px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#800020] font-bold uppercase">Integritas Geolokasi</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedReport.sumber_koordinat === 'manual' && (
                        <Badge type="sumber" value="LOKASI DITENTUKAN MANUAL" isDashboard={true} />
                      )}
                      <Badge type="keyakinan" value={selectedReport.tingkat_keyakinan || 'TINJAUAN'} isDashboard={true} />
                    </div>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#8E95A3]">SUMBER KOORDINAT:</span>
                    <span className="text-[#272E3B] text-right font-bold">
                      {selectedReport.sumber_koordinat === 'manual' ? 'MANUAL (PIN PETA)' : 'GPS BROWSER (OTOMATIS)'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#8E95A3]">GPS / PIN:</span>
                    <span className="text-[#272E3B] text-right">{selectedReport.lat_gps}, {selectedReport.lng_gps}</span>
                  </div>
                  {selectedReport.akurasi_gps != null && (
                    <div className="flex justify-between gap-3">
                      <span className="text-[#8E95A3]">AKURASI GPS:</span>
                      <span className="text-[#272E3B] text-right font-mono font-bold">±{selectedReport.akurasi_gps} METER</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-[#8E95A3]">EXIF FOTO:</span>
                    <span className="text-[#272E3B] text-right">
                      {selectedReport.lat_exif != null && selectedReport.lng_exif != null
                        ? `${selectedReport.lat_exif}, ${selectedReport.lng_exif}`
                        : 'Tidak tersedia'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 pt-2 border-t border-[#D0D5DD]">
                    <span className="text-[#8E95A3]">SELISIH JARAK:</span>
                    <span className={`font-bold text-right ${
                      selectedReport.tingkat_keyakinan === 'TINGGI' ? 'text-[#15803D]' :
                      selectedReport.tingkat_keyakinan === 'CURIGA' ? 'text-[#B91C1C]' :
                      'text-[#A16207]'
                    }`}>
                      {selectedReport.jarak_exif_gps_m != null
                        ? `${selectedReport.jarak_exif_gps_m} METER`
                        : 'EXIF tidak tersedia'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 pt-2 border-t border-[#D0D5DD]">
                    <span className="text-[#8E95A3]">WAKTU JEPRET (EXIF):</span>
                    <span className="text-[#272E3B] text-right">
                      {selectedReport.date_time_original
                        ? new Date(selectedReport.date_time_original).toLocaleString('id-ID')
                        : 'Tidak tersedia'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#8E95A3]">WAKTU TERIMA (SERVER):</span>
                    <span className="text-[#272E3B] text-right">
                      {new Date(selectedReport.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verifikasi Petugas & Ringkasan Keputusan */}
              {(() => {
                const isWaiting =
                  selectedReport.status_verifikasi === 'menunggu-tinjauan' ||
                  selectedReport.status_verifikasi === 'belum-diverifikasi';
                const isVerified = selectedReport.status_verifikasi === 'terverifikasi';
                const isInvalid =
                  selectedReport.status_verifikasi === 'tidak-valid' ||
                  selectedReport.status_verifikasi === 'spam';

                const formatTimestamp = (dateStr?: string | null) => {
                  if (!dateStr) return 'Baru saja';
                  try {
                    return new Date(dateStr).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  } catch {
                    return dateStr;
                  }
                };

                const handleResetVerifikasi = async () => {
                  await handleUpdate(
                    {
                      status_verifikasi: 'menunggu-tinjauan',
                      alasan_tidak_valid: null,
                      status_penanganan: 'menunggu',
                    },
                    'KEPUTUSAN DIBATALKAN — STATUS KEMBALI KE MENUNGGU TINJAUAN',
                    'reset-verifikasi'
                  );
                  setShowRejectReason(false);
                  setRejectReason('');
                };

                return (
                  <div className="bg-[#FFF9F2] border-2 border-[#800020] p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-[#800020] uppercase font-bold">
                        Aksi Verifikasi Petugas
                      </span>
                      <span className="font-mono text-[10px] uppercase">
                        Status saat ini:{' '}
                        <span className={`font-bold ${
                          isVerified ? 'text-[#15803D]' : isInvalid ? 'text-[#B91C1C]' : 'text-[#A16207]'
                        }`}>
                          {isVerified
                            ? 'TERVERIFIKASI'
                            : isInvalid
                            ? 'TIDAK VALID'
                            : 'MENUNGGU TINJAUAN'}
                        </span>
                      </span>
                    </div>

                    {/* Jika Masih Menunggu Tinjauan: Tampilkan Tombol Verifikasi */}
                    {isWaiting ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              setShowRejectReason(false);
                              handleUpdate(
                                { status_verifikasi: 'terverifikasi', alasan_tidak_valid: null },
                                'LAPORAN DIVERIFIKASI VALID',
                                'terverifikasi'
                              );
                            }}
                            disabled={busy}
                            className="h-[48px] font-mono text-[12px] uppercase font-bold border-2 inline-flex items-center justify-center gap-2 transition-colors bg-[#FFFFFF] text-[#15803D] border-[#15803D] hover:bg-[#15803D]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {pending === 'terverifikasi' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {pending === 'terverifikasi' ? 'MEMPROSES...' : 'VERIFIKASI VALID'}
                          </button>

                          <button
                            onClick={() => setShowRejectReason((prev) => !prev)}
                            disabled={busy}
                            className="h-[48px] font-mono text-[12px] uppercase font-bold border-2 inline-flex items-center justify-center gap-2 transition-colors bg-[#FFFFFF] text-[#B91C1C] border-[#B91C1C] hover:bg-[#B91C1C]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {pending === 'tidak-valid' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            {pending === 'tidak-valid' ? 'MEMPROSES...' : 'TANDAI TIDAK VALID'}
                          </button>
                        </div>

                        {/* Dropdown wajib pilih alasan saat menandai tidak valid */}
                        {showRejectReason && (
                          <div className="bg-[#FFFFFF] border-2 border-[#EF4444] p-4 flex flex-col gap-3 mt-1">
                            <label className="font-mono text-[11px] font-bold text-[#991B1B] uppercase flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5 text-[#DC2626]" />
                              PILIH ALASAN PENOLAKAN (WAJIB):
                            </label>
                            <select
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-full h-[42px] px-3 bg-[#FEF2F2] border border-[#EF4444] text-[#991B1B] font-body text-[13px] font-semibold focus:outline-none"
                            >
                              <option value="">-- Pilih salah satu alasan penolakan --</option>
                              <option value="Lokasi tidak sesuai bukti foto">Lokasi tidak sesuai bukti foto</option>
                              <option value="Bukan kebakaran hutan/lahan">Bukan kebakaran hutan/lahan</option>
                              <option value="Duplikat laporan yang sudah ada">Duplikat laporan yang sudah ada</option>
                              <option value="Foto tidak dapat diverifikasi">Foto tidak dapat diverifikasi</option>
                            </select>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                disabled={!rejectReason || busy}
                                onClick={async () => {
                                  const ok = await handleUpdate(
                                    { status_verifikasi: 'tidak-valid', alasan_tidak_valid: rejectReason },
                                    'LAPORAN DITANDAI TIDAK VALID',
                                    'tidak-valid'
                                  );
                                  if (ok) {
                                    setShowRejectReason(false);
                                    setRejectReason('');
                                  }
                                }}
                                className="h-[38px] px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFFFFF] font-mono text-[11px] uppercase font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {pending === 'tidak-valid' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                SIMPAN STATUS TIDAK VALID
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setShowRejectReason(false);
                                  setRejectReason('');
                                }}
                                className="h-[38px] px-4 bg-[#FFFFFF] border border-[#D0D5DD] text-[#525866] hover:bg-[#F3E6D5] font-mono text-[11px] uppercase font-bold transition-colors"
                              >
                                BATAL
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Ringkasan Keputusan Verifikasi */
                      <div className="flex flex-col gap-3">
                        {isVerified && (
                          <div className="bg-[#F0FDF4] border-2 border-[#16A34A] p-4 flex flex-col gap-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#15803D] text-[#FFFFFF] font-mono text-[11px] font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-4 h-4" /> TERVERIFIKASI
                              </span>
                              <span className="font-mono text-[11px] text-[#166534]">
                                Waktu Verifikasi: {formatTimestamp(selectedReport.updated_at || selectedReport.created_at)}
                              </span>
                            </div>
                            <p className="font-body text-[13px] text-[#14532D]">
                              Laporan telah divalidasi kebenarannya dan diteruskan untuk penanganan tim lapangan.
                            </p>
                          </div>
                        )}

                        {isInvalid && (
                          <div className="bg-[#FEF2F2] border-2 border-[#EF4444] p-4 flex flex-col gap-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B91C1C] text-[#FFFFFF] font-mono text-[11px] font-bold uppercase tracking-wider">
                                <X className="w-4 h-4" /> TIDAK VALID
                              </span>
                              <span className="font-mono text-[11px] text-[#991B1B]">
                                Waktu Penandaan: {formatTimestamp(selectedReport.updated_at || selectedReport.created_at)}
                              </span>
                            </div>
                            <div className="bg-[#FFFFFF] border border-[#FECACA] p-3 flex flex-col gap-1">
                              <span className="font-mono text-[10px] text-[#991B1B] font-bold uppercase">
                                Alasan Penolakan:
                              </span>
                              <span className="font-body text-[13px] font-bold text-[#7F1D1D]">
                                {selectedReport.alasan_tidak_valid || 'Tidak memenuhi kriteria validasi petugas.'}
                              </span>
                            </div>
                            <p className="font-body text-[12px] text-[#991B1B] italic">
                              Laporan ini ditandai Tidak Valid dan tidak diteruskan ke tim lapangan.
                            </p>
                          </div>
                        )}

                        {/* Opsi Batalkan Keputusan */}
                        <div className="pt-1 flex items-center justify-between">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleResetVerifikasi}
                            className="font-mono text-[11px] text-[#8E95A3] hover:text-[#800020] hover:underline inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Batalkan keputusan (kembalikan status ke Menunggu Tinjauan)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status Penanganan (Tim Lapangan) */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-[#D0D5DD]">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-[11px] text-[#800020] uppercase font-bold">
                          Status Penanganan (Tim Lapangan)
                        </div>
                        {isInvalid ? (
                          <span className="font-mono text-[10px] text-[#B91C1C] font-bold uppercase bg-[#FEF2F2] border border-[#EF4444] px-2 py-0.5">
                            TIDAK DITERUSKAN
                          </span>
                        ) : !isVerified ? (
                          <span className="font-mono text-[10px] text-[#A16207] font-bold uppercase">
                            TERKUNCI (HANYA AKTIF JIKA TERVERIFIKASI)
                          </span>
                        ) : null}
                      </div>

                      {isInvalid ? (
                        <div className="bg-[#FEF2F2] border border-[#FECACA] p-3 text-center font-body text-[12px] text-[#991B1B]">
                          Status penanganan terkunci karena laporan telah ditandai <b>TIDAK VALID</b>. Laporan ini tidak diteruskan ke tim lapangan.
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            {(['menunggu', 'diproses', 'selesai'] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => handleUpdate({ status_penanganan: p }, `STATUS: ${p.toUpperCase()}`, p)}
                                disabled={busy || !isVerified}
                                title={!isVerified ? 'Verifikasi laporan terlebih dahulu untuk mengubah status penanganan' : undefined}
                                className={`h-[44px] font-mono text-[11px] uppercase border-2 inline-flex items-center justify-center gap-1.5 transition-colors ${
                                  !isVerified
                                    ? 'bg-[#F3E6D5]/40 text-[#8E95A3] border-[#D0D5DD] opacity-50 cursor-not-allowed'
                                    : selectedReport.status_penanganan === p
                                    ? 'bg-[#800020] text-[#FFFFFF] border-[#800020] font-bold'
                                    : 'bg-[#FFFFFF] text-[#525866] border-[#D0D5DD] hover:border-[#800020]'
                                }`}
                              >
                                {pending === p && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {p}
                              </button>
                            ))}
                          </div>
                          {!isVerified && (
                            <span className="font-body text-[12px] text-[#A16207] italic">
                              * Status penanganan hanya aktif jika status verifikasi <b>TERVERIFIKASI</b>.
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

                {/* Hapus */}
                <div className="pt-3 border-t border-[#D0D5DD]">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={busy}
                      className="font-mono text-[11px] uppercase font-bold text-[#B91C1C] inline-flex items-center gap-1 hover:underline disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus laporan ini
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="font-mono text-[11px] text-[#B91C1C] font-bold uppercase">
                        Yakin hapus laporan ini?
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={busy}
                          className="h-[38px] px-4 bg-[#B91C1C] text-[#FFFFFF] font-mono text-[11px] uppercase font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {pending === 'delete' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {pending === 'delete' ? 'MENGHAPUS...' : 'Ya, hapus'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          disabled={busy}
                          className="h-[38px] px-4 bg-[#FFFFFF] border border-[#D0D5DD] text-[#525866] font-mono text-[11px] uppercase font-bold disabled:opacity-50"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              {/* Wilayah + Deskripsi (editable) */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#8E95A3] uppercase">Wilayah &amp; Deskripsi Pelapor</span>
                  {!editing ? (
                    <button
                      onClick={startEdit}
                      disabled={busy}
                      className="font-mono text-[11px] uppercase font-bold text-[#800020] inline-flex items-center gap-1 hover:underline disabled:opacity-40"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditing(false)}
                        disabled={busy}
                        className="font-mono text-[11px] uppercase font-bold text-[#525866] hover:underline disabled:opacity-40"
                      >
                        Batal
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={busy}
                        className="font-mono text-[11px] uppercase font-bold text-[#15803D] inline-flex items-center gap-1 hover:underline disabled:opacity-40"
                      >
                        {pending === 'edit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Simpan
                      </button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="flex flex-col gap-3">
                    <input
                      value={draftWilayah}
                      onChange={(e) => setDraftWilayah(e.target.value)}
                      className="w-full h-[42px] px-3 bg-[#FFF9F2] border border-[#D0D5DD] font-body text-[14px] text-[#272E3B] focus:outline-none focus:border-[#800020]"
                      placeholder="Wilayah"
                    />
                    <textarea
                      value={draftDeskripsi}
                      onChange={(e) => setDraftDeskripsi(e.target.value)}
                      className="w-full p-3 min-h-[90px] bg-[#FFF9F2] border border-[#D0D5DD] font-body text-[14px] text-[#272E3B] focus:outline-none focus:border-[#800020] resize-y"
                      placeholder="Deskripsi"
                    />
                  </div>
                ) : (
                  <div className="bg-[#FFF9F2] p-3 border border-[#D0D5DD]">
                    <div className="font-body text-[13px] font-bold text-[#272E3B]">{selectedReport.wilayah}</div>
                    <p className="font-body text-[14px] text-[#525866] mt-1">
                      {selectedReport.deskripsi || 'Tidak ada catatan deskripsi tambahan.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full h-[220px] border border-[#5C0016] bg-[#800020]">
                <LeafletMap
                  reports={[selectedReport]}
                  center={[selectedReport.lat_gps, selectedReport.lng_gps]}
                  zoom={13}
                  interactive={true}
                  scrollWheelZoom={false}
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
