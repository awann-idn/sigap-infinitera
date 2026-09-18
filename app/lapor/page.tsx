'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Camera, MapPin, CheckCircle2, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { Textarea } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { parseExifData, ExifData } from '@/lib/exif';
import { calculateHaversineDistance } from '@/lib/geo';
import { reverseGeocode } from '@/lib/wilayah';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] bg-[#FFFFFF] border border-[#D0D5DD] flex items-center justify-center font-mono text-[11px] text-[#8E95A3]">
      MEMUAT FALLBACK PETA PIN...
    </div>
  ),
});

export default function LaporPage() {
  const [file, setFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exifInfo, setExifInfo] = useState<ExifData | null>(null);

  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'DENIED'>('IDLE');

  const [wilayah, setWilayah] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string; idCode?: string; type?: 'success' | 'error' } | null>(null);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  useEffect(() => {
    requestBrowserLocation();
  }, []);

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('DENIED');
      return;
    }

    setGpsStatus('FETCHING');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsLat(lat);
        setGpsLng(lng);
        setGpsStatus('SUCCESS');

        const regionName = await reverseGeocode(lat, lng);
        setWilayah(regionName);
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setGpsStatus('DENIED');
        setGpsLat(-3.0037);
        setGpsLng(104.706);
        setWilayah('Kec. Gandus, Kota Palembang, Sumatera Selatan (Fallback Pin)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Read file for preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Parse EXIF from original file (no canvas re-render)
    const parsed = await parseExifData(selectedFile);
    setExifInfo(parsed);
  };

  const clearPhoto = () => {
    setFile(null);
    setPhotoPreview(null);
    setExifInfo(null);
  };

  const handlePinDragEnd = async (lat: number, lng: number) => {
    setGpsLat(lat);
    setGpsLng(lng);
    const regionName = await reverseGeocode(lat, lng);
    setWilayah(regionName);
  };

  // Calculate distance for preview display
  const previewDistance =
    gpsLat !== null &&
    gpsLng !== null &&
    exifInfo?.latitude != null &&
    exifInfo?.longitude != null
      ? calculateHaversineDistance(gpsLat, gpsLng, exifInfo.latitude, exifInfo.longitude)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (gpsLat === null || gpsLng === null) {
      setToastMessage({ msg: 'Lokasi koordinat wajib tersedia', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const mockPhotoUrl = photoPreview || '/images/karhutla_smoke_forest.png';

      const payload = {
        foto_url: mockPhotoUrl,
        lat_gps: gpsLat,
        lng_gps: gpsLng,
        // EXIF values come ONLY from the photo, never from browser GPS
        lat_exif: exifInfo?.latitude ?? null,
        lng_exif: exifInfo?.longitude ?? null,
        date_time_original: exifInfo?.dateTimeOriginal ?? null,
        wilayah: wilayah || `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`,
        deskripsi,
        // Server calculates: jarak_exif_gps_m, tingkat_keyakinan, flag_manual
      };

      const res = await fetch('/api/laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.data) {
        setSubmittedReport(data.data);
        setToastMessage({
          msg: 'LAPORAN TERKIRIM BERHASIL',
          idCode: data.data.kode,
          type: 'success',
        });
      } else {
        throw new Error(data.error || 'Gagal mengirim laporan');
      }
    } catch (err: any) {
      console.error(err);
      setToastMessage({ msg: err.message || 'Gagal mengirim laporan', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <SectionHeader
          eyebrow="FORM PELAPORAN DARURAT"
          counter="SINGLE-PAGE FLOW"
          title="LAPOR TITIK KEBAKARAN LAHAN"
          description="Ambil foto langsung dari kamera perangkat; koordinat presisi terisi otomatis. Laporan masuk ke dashboard petugas dan baru tampil di peta publik setelah diverifikasi."
        />

        {submittedReport ? (
          <Card className="max-w-2xl mx-auto p-8 border border-[#D0D5DD] flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-[#800020] text-[#FFFFFF] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] text-[#525866] uppercase tracking-[0.1em]">
                LAPORAN TELAH DITERIMA SISTEM
              </span>
              <h3 className="font-display font-bold text-[32px] text-[#800020]">
                {submittedReport.kode}
              </h3>
              <p className="font-body text-[15px] text-[#525866] max-w-md">
                Terima kasih atas laporan Anda. Tim pemadam kebakaran telah menerima koordinat lokasi dan sedang melakukan verifikasi data.
              </p>
            </div>

            <div className="w-full bg-[#FFF9F2] p-4 border border-[#D0D5DD] font-mono text-[12px] flex flex-col gap-2 text-left">
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">WILAYAH:</span>
                <span className="text-[#800020] font-bold">{submittedReport.wilayah}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">KOORDINAT GPS:</span>
                <span className="text-[#800020]">{submittedReport.lat_gps}, {submittedReport.lng_gps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">TINGKAT KEYAKINAN:</span>
                <span className="text-[#800020] font-bold">{submittedReport.tingkat_keyakinan}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  setSubmittedReport(null);
                  setFile(null);
                  setPhotoPreview(null);
                  setExifInfo(null);
                  setDeskripsi('');
                }}
              >
                BUAT LAPORAN BARU
              </Button>
              <a href="/peta" className="w-full">
                <Button variant="outline" fullWidth>
                  PANTAU DI PETA
                </Button>
              </a>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Photo Capture & EXIF check */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#000000] font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#000000]" /> 1. AMBIL FOTO LANGSUNG (KAMERA)
                </label>
                <span className="font-body text-[14px] text-[#272E3B] font-medium">
                  Foto wajib diambil langsung dari kamera perangkat saat kejadian. Metadata EXIF asli akan dibaca otomatis.
                </span>
              </div>

              {/* Native File Input for Camera Capture */}
              <div
                className={`w-full aspect-[4/3] bg-[#FFFFFF] border-2 border-dashed ${
                  photoPreview ? 'border-[#000000]' : 'border-[#000000]/40'
                } flex flex-col items-center justify-center relative overflow-hidden transition-colors`}
              >
                {photoPreview ? (
                  <>
                    <img
                      src={photoPreview}
                      alt="Preview Kebakaran"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-[#000000]/85 p-3 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="font-mono text-[12px] uppercase text-[#FFFFFF] font-bold flex items-center gap-2 hover:underline"
                      >
                        <Trash2 className="w-4 h-4 text-[#FFFFFF]" /> HAPUS & AMBIL ULANG
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center gap-3 p-6">
                    <div className="w-12 h-12 bg-[#FFF9F2] border border-[#000000] flex items-center justify-center text-[#000000]">
                      <Camera className="w-5 h-5 text-[#000000]" />
                    </div>
                    <label className="h-[44px] px-5 bg-[#000000] text-[#FFFFFF] font-mono text-[12px] uppercase font-bold hover:bg-[#272E3B] transition-colors cursor-pointer inline-flex items-center justify-center">
                      AMBIL FOTO DARI KAMERA
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="font-mono text-[11px] text-[#272E3B] font-bold">
                      KAMERA BELAKANG AKAN TERBUKA OTOMATIS
                    </span>
                  </div>
                )}
              </div>

              {/* EXIF Metadata Card */}
              {exifInfo && (
                <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 flex flex-col gap-2 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-[#000000] font-bold pb-2 border-b border-[#000000]">
                    <span>METADATA FOTO EXIF</span>
                    <span>{exifInfo.hasGps ? 'GPS TERSEDIA' : 'TIDAK ADA GPS EXIF'}</span>
                  </div>
                  {exifInfo.hasGps ? (
                    <div className="flex flex-col gap-1 text-[#000000] pt-1 font-bold">
                      <div>EXIF LAT: {exifInfo.latitude?.toFixed(5)}</div>
                      <div>EXIF LNG: {exifInfo.longitude?.toFixed(5)}</div>
                    </div>
                  ) : (
                    <div className="text-[#272E3B] pt-1 font-medium">
                      Foto tidak mengandung koordinat GPS EXIF. Lokasi akan divalidasi dari GPS browser saja.
                    </div>
                  )}
                  {exifInfo.dateTimeOriginal && (
                    <div className="text-[#525866] pt-1 border-t border-[#000000]/20 mt-1">
                      WAKTU JEPRET: {new Date(exifInfo.dateTimeOriginal).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              )}

              {/* Distance Preview (client-side) */}
              {file && gpsLat !== null && gpsLng !== null && (
                <div className="p-4 bg-[#FFFFFF] border-2 border-[#000000] font-mono text-[11px] flex flex-col gap-1">
                  <div className="font-bold uppercase text-[#000000]">
                    SELISIH GPS BROWSER VS EXIF FOTO
                  </div>
                  <div className="text-[#272E3B] font-medium">
                    {previewDistance !== null
                      ? `${previewDistance} meter`
                      : 'EXIF tidak tersedia'}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Location GPS & Details */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              {/* Step 2: Location GPS */}
              <div className="flex flex-col gap-4">
                <label className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#000000] font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#800020]" /> 2. KOORDINAT &amp; WILAYAH LOKASI
                </label>

                <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 flex flex-col gap-2">
                  <div className="font-mono text-[15px] font-bold text-[#000000] bg-[#FFF9F2] p-3 border border-[#000000] flex items-center justify-between gap-3">
                    <span className="break-all">
                      LAT: {gpsLat !== null ? gpsLat.toFixed(5) : '...'} &nbsp; LNG:{' '}
                      {gpsLng !== null ? gpsLng.toFixed(5) : '...'}
                    </span>
                    <ShieldCheck className="w-5 h-5 text-[#800020] shrink-0" />
                  </div>

                  <div className="font-body text-[14px] text-[#272E3B] font-medium">
                    Wilayah: <span className="text-[#800020] font-mono font-bold">{wilayah || 'Mendeteksi alamat...'}</span>
                  </div>
                </div>

                {/* Fallback Draggable Pin Map */}
                {gpsStatus === 'DENIED' && gpsLat !== null && gpsLng !== null && (
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[11px] text-[#525866]">
                      Geser pin pada peta berikut ke titik pusat kejadian kebakaran:
                    </span>
                    <div className="w-full h-[220px]">
                      <MapContainer
                        reports={[]}
                        center={[gpsLat, gpsLng]}
                        zoom={14}
                        draggablePin={true}
                        onPinDragEnd={handlePinDragEnd}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={requestBrowserLocation}
                  className="self-start font-mono text-[11px] text-[#800020] font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> REFRESH GPS
                </button>
              </div>

              {/* Step 3: Description */}
              <div className="flex flex-col gap-6">
                <Textarea
                  label="3. DESKRIPSI SINGKAT KONDISI LAPANGAN (OPSIONAL)"
                  placeholder="Contoh: Asap tebal mengarah ke pemukiman RT 04, luas perkiraan 2 hektar gambut kering."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={submitting || !file}
                  className="mt-2 text-[15px] h-[56px]"
                >
                  {submitting ? 'MEMPROSES LAPORAN...' : 'KIRIM LAPORAN DARURAT SIGAP'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.msg}
          idCode={toastMessage.idCode}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
