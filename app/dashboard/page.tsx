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

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/laporan?scope=all');
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
  };

  const handleUpdate = async (
    updates: LaporanUpdate,
    successMsg: string,
    actionKey: string
  ): Promise<boolean> => {
    if (!selectedReport) return false;

    const id = selectedReport.id;
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

    const id = selectedReport.id;
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
    if (filterVerifikasi !== 'ALL' && r.status_verifikasi !== filterVerifikasi) return false;
    if (filterPenanganan !== 'ALL' && r.status_penanganan !== filterPenanganan) return false;
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

        {/* Table */}
        <div className="w-full bg-[#FFFFFF] border border-[#D0D5DD] overflow-x-auto">
          <table className="w-full text-left border-collapse font-body text-[14px] min-w-[720px]">
            <thead>
              <tr className="bg-[#F3E6D5] border-b border-[#D0D5DD] font-mono text-[11px] text-[#8E95A3] uppercase">
                <th className="p-4">KODE / ID</th>
                <th className="p-4">WAKTU</th>
                <th className="p-4">WILAYAH</th>
                <th className="p-4">VERIFIKASI</th>
                <th className="p-4">PENANGANAN</th>
                <th className="p-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0D5DD]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-mono text-[12px] text-[#8E95A3]">
                    MEMUAT TABLE LAPORAN...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-mono text-[12px] text-[#8E95A3]">
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
                    <td className="p-4 font-bold text-[#272E3B] max-w-[200px] truncate">
                      {item.wilayah}
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
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#FFFFFF] border-2 border-[#800020] shadow-2xl">
            {/* Modal header */}
            <div className="shrink-0 bg-[#FFFFFF] flex items-start justify-between gap-3 px-5 py-4 border-b border-[#D0D5DD]">
              <div className="flex flex-col gap-2 min-w-0">
                <span className="font-mono text-[13px] text-[#800020] font-bold truncate">
                  DETAIL LAPORAN: {selectedReport.kode}
                </span>
                <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative aspect-[16/10] bg-[#FFF9F2] border border-[#D0D5DD] overflow-hidden">
                  <img src={selectedReport.foto_url} alt="Bukti Visual" className="w-full h-full object-cover" />
                </div>

                <div className="bg-[#F3E6D5] p-4 border border-[#D0D5DD] flex flex-col gap-3 font-mono text-[12px]">
                  <div className="text-[#800020] font-bold uppercase">Integritas Geolokasi</div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#8E95A3]">GPS BROWSER:</span>
                    <span className="text-[#272E3B] text-right">{selectedReport.lat_gps}, {selectedReport.lng_gps}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#8E95A3]">EXIF FOTO:</span>
                    <span className="text-[#272E3B] text-right">
                      {selectedReport.lat_exif != null && selectedReport.lng_exif != null
                        ? `${selectedReport.lat_exif}, ${selectedReport.lng_exif}`
                        : 'TIDAK TERSEDIA'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 pt-2 border-t border-[#D0D5DD]">
                    <span className="text-[#8E95A3]">SELISIH JARAK:</span>
                    <span className="text-[#272E3B] font-bold">
                      {selectedReport.jarak_exif_gps_m != null ? `${selectedReport.jarak_exif_gps_m} METER` : 'N/A'}
                    </span>
                  </div>
                  {selectedReport.flag_manual && (
                    <div className="p-2 bg-[#FFFFFF] border border-[#B91C1C] text-[#B91C1C] text-[11px] font-bold">
                      FLAG: SELISIH &gt; 500M / FALLBACK PIN PERLU DIVERIFIKASI
                    </div>
                  )}
                </div>
              </div>

              {/* Verifikasi (ditaruh di atas agar jelas) */}
              <div className="bg-[#FFF9F2] border-2 border-[#800020] p-4 flex flex-col gap-3">
                <div className="font-mono text-[11px] text-[#800020] uppercase font-bold">Aksi Verifikasi Petugas</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleUpdate({ status_verifikasi: 'terverifikasi' }, 'LAPORAN DIVERIFIKASI VALID', 'terverifikasi')}
                    disabled={busy}
                    className={`h-[48px] font-mono text-[12px] uppercase font-bold border-2 inline-flex items-center justify-center gap-2 transition-colors ${
                      selectedReport.status_verifikasi === 'terverifikasi'
                        ? 'bg-[#15803D] text-[#FFFFFF] border-[#15803D]'
                        : 'bg-[#FFFFFF] text-[#15803D] border-[#15803D] hover:bg-[#15803D]/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pending === 'terverifikasi' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {pending === 'terverifikasi' ? 'MEMPROSES...' : 'VERIFIKASI VALID'}
                  </button>

                  <button
                    onClick={() => handleUpdate({ status_verifikasi: 'spam' }, 'LAPORAN DITANDAI SPAM', 'spam')}
                    disabled={busy}
                    className={`h-[48px] font-mono text-[12px] uppercase font-bold border-2 inline-flex items-center justify-center gap-2 transition-colors ${
                      selectedReport.status_verifikasi === 'spam'
                        ? 'bg-[#B91C1C] text-[#FFFFFF] border-[#B91C1C]'
                        : 'bg-[#FFFFFF] text-[#B91C1C] border-[#B91C1C] hover:bg-[#B91C1C]/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pending === 'spam' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    {pending === 'spam' ? 'MEMPROSES...' : 'TANDAI SPAM'}
                  </button>
                </div>
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

              <div className="w-full h-[180px] border border-[#5C0016] bg-[#800020]">
                <LeafletMap
                  reports={[selectedReport]}
                  center={[selectedReport.lat_gps, selectedReport.lng_gps]}
                  zoom={13}
                  interactive={false}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4 pt-5 border-t border-[#D0D5DD]">
                <div className="font-mono text-[11px] text-[#8E95A3] uppercase">Status Penanganan</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['menunggu', 'diproses', 'selesai'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleUpdate({ status_penanganan: p }, `STATUS: ${p.toUpperCase()}`, p)}
                      disabled={busy}
                      className={`h-[44px] font-mono text-[11px] uppercase border-2 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedReport.status_penanganan === p
                          ? 'bg-[#800020] text-[#FFFFFF] border-[#800020] font-bold'
                          : 'bg-[#FFF9F2] text-[#525866] border-[#D0D5DD] hover:border-[#800020]'
                      }`}
                    >
                      {pending === p && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {p}
                    </button>
                  ))}
                </div>

                {/* Delete */}
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
                          className="h-[38px] px-4 bg-[#FFF9F2] border border-[#D0D5DD] text-[#525866] font-mono text-[11px] uppercase font-bold disabled:opacity-50"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
