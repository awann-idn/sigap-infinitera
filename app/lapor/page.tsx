'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Upload, Camera, MapPin, AlertOctagon, CheckCircle2, ShieldCheck, Flame, RefreshCw } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { Textarea } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { parseExifData, ExifData } from '@/lib/exif';
import { evaluateLocationIntegrity, GeoComparisonResult } from '@/lib/geo';
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

  const [geoIntegrity, setGeoIntegrity] = useState<GeoComparisonResult | null>(null);
  const [wilayah, setWilayah] = useState<string>('');

  const [deskripsi, setDeskripsi] = useState('');
  const [skala, setSkala] = useState<'KECIL' | 'SEDANG' | 'BESAR'>('SEDANG');

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string; idCode?: string; type?: 'success' | 'error' } | null>(null);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (exifInfo?.latitude && exifInfo?.longitude) {
          const check = evaluateLocationIntegrity(lat, lng, exifInfo.latitude, exifInfo.longitude);
          setGeoIntegrity(check);
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setGpsStatus('DENIED');
        setGpsLat(0.5071);
        setGpsLng(101.4478);
        setWilayah('Kec. Tampan, Kota Pekanbaru, Riau (Fallback Pin)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('Ukuran file maksimal 10MB');
      return;
    }

    setFile(selectedFile);
    setPhotoPreview(URL.createObjectURL(selectedFile));

    const parsed = await parseExifData(selectedFile);
    setExifInfo(parsed);

    if (gpsLat !== null && gpsLng !== null && parsed.latitude && parsed.longitude) {
      const check = evaluateLocationIntegrity(gpsLat, gpsLng, parsed.latitude, parsed.longitude);
      setGeoIntegrity(check);
    } else {
      setGeoIntegrity(null);
    }
  };

  const handlePinDragEnd = async (lat: number, lng: number) => {
    setGpsLat(lat);
    setGpsLng(lng);
    const regionName = await reverseGeocode(lat, lng);
    setWilayah(regionName);

    if (exifInfo?.latitude && exifInfo?.longitude) {
      const check = evaluateLocationIntegrity(lat, lng, exifInfo.latitude, exifInfo.longitude);
      setGeoIntegrity(check);
    }
  };

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
        lat_exif: exifInfo?.latitude,
        lng_exif: exifInfo?.longitude,
        jarak_exif_gps_m: geoIntegrity?.distanceMeters ?? undefined,
        flag_manual: geoIntegrity?.flagManualVerification || gpsStatus === 'DENIED',
        wilayah: wilayah || `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`,
        deskripsi,
        skala,
        status_verifikasi: 'belum-diverifikasi',
        status_penanganan: 'menunggu',
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
          description="Submit foto lokasi kejadian dan koordinat presisi. Laporan akan langsung dikirim ke dashboard piket pemadam kebakaran setempat."
        />

        {submittedReport ? (
          <Card className="max-w-2xl mx-auto p-8 border border-[#D0D5DD] flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-[#0F141A] text-[#FFFFFF] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] text-[#525866] uppercase tracking-[0.1em]">
                LAPORAN TELAH DITERIMA SISTEM
              </span>
              <h3 className="font-display font-bold text-[32px] text-[#0F141A]">
                {submittedReport.kode}
              </h3>
              <p className="font-body text-[15px] text-[#525866] max-w-md">
                Terima kasih atas laporan Anda. Tim pemadam kebakaran telah menerima koordinat lokasi dan sedang melakukan verifikasi data.
              </p>
            </div>

            <div className="w-full bg-[#EDEDED] p-4 border border-[#D0D5DD] font-mono text-[12px] flex flex-col gap-2 text-left">
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">WILAYAH:</span>
                <span className="text-[#0F141A] font-bold">{submittedReport.wilayah}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">SKALA KEBAKARAN:</span>
                <span className="text-[#0F141A] font-bold">{submittedReport.skala}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">KOORDINAT GPS:</span>
                <span className="text-[#0F141A]">{submittedReport.lat_gps}, {submittedReport.lng_gps}</span>
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
            {/* Left Column: Photo Upload & EXIF check */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#000000] font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#000000]" /> 1. UNGGAH FOTO BUKTI VISUAL
                </label>
                <span className="font-body text-[14px] text-[#272E3B] font-medium">
                  Ambil foto langsung dari kamera perangkat atau unggah berkas gambar.
                </span>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full aspect-[4/3] bg-[#FFFFFF] border-2 border-dashed ${
                  photoPreview ? 'border-[#000000]' : 'border-[#000000]/40 hover:border-[#000000]'
                } flex flex-col items-center justify-center p-6 cursor-pointer relative overflow-hidden transition-colors group`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {photoPreview ? (
                  <>
                    <img
                      src={photoPreview}
                      alt="Preview Kebakaran"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#000000]/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[#FFFFFF] font-mono text-[12px] uppercase transition-opacity">
                      <RefreshCw className="w-6 h-6 mb-2 text-[#FFFFFF]" />
                      KLIK UNTUK GANTI FOTO
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-[#EDEDED] border border-[#000000] flex items-center justify-center text-[#000000]">
                      <Upload className="w-5 h-5 text-[#000000]" />
                    </div>
                    <div className="font-mono text-[13px] font-bold text-[#000000]">
                      KLIK ATAU DRAG FOTO KE SINI
                    </div>
                    <span className="font-mono text-[11px] text-[#272E3B] font-bold">
                      JPG, PNG, WEBP — MAKS 10MB
                    </span>
                  </div>
                )}
              </div>

              {/* EXIF Metadata Card */}
              {exifInfo && (
                <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 flex flex-col gap-2 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-[#000000] font-bold pb-2 border-b border-[#000000]">
                    <span>METADATA FOTO EXIF</span>
                    <span>{exifInfo.hasGps ? 'GPS TERSEDIA' : 'TIDAK ADA GPS METADATA'}</span>
                  </div>
                  {exifInfo.hasGps ? (
                    <div className="flex flex-col gap-1 text-[#000000] pt-1 font-bold">
                      <div>EXIF LAT: {exifInfo.latitude?.toFixed(5)}</div>
                      <div>EXIF LNG: {exifInfo.longitude?.toFixed(5)}</div>
                    </div>
                  ) : (
                    <div className="text-[#272E3B] pt-1 font-medium">
                      Kamera mobile tidak melampirkan GPS EXIF. Menggunakan GPS Browser utama.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Location GPS & Details */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              {/* Step 2: Location GPS */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#000000] font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#000000]" /> 2. KOORDINAT PRESISI LOKASI (GPS)
                  </label>
                  <button
                    type="button"
                    onClick={requestBrowserLocation}
                    className="font-mono text-[11px] text-[#000000] font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> REFRESH GPS
                  </button>
                </div>

                {/* GPS Status Bar */}
                <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between font-mono text-[12px]">
                    <span className="text-[#000000] font-bold uppercase">STATUS IZIN GPS:</span>
                    <span className="text-[#000000] font-bold">
                      {gpsStatus === 'SUCCESS'
                        ? 'AKTIF & PRESISI'
                        : gpsStatus === 'FETCHING'
                        ? 'MENGAMBIL KOORDINAT...'
                        : 'FALLBACK MAP PIN'}
                    </span>
                  </div>

                  <div className="font-mono text-[16px] font-bold text-[#000000] bg-[#EDEDED] p-3 border border-[#000000] flex items-center justify-between">
                    <span>
                      LAT: {gpsLat !== null ? gpsLat.toFixed(5) : '...'} &nbsp; LNG:{' '}
                      {gpsLng !== null ? gpsLng.toFixed(5) : '...'}
                    </span>
                    <ShieldCheck className="w-5 h-5 text-[#000000]" />
                  </div>

                  <div className="font-body text-[14px] text-[#272E3B] font-medium">
                    Wilayah: <span className="text-[#000000] font-mono font-bold">{wilayah || 'Mendeteksi alamat...'}</span>
                  </div>
                </div>

                {/* Geo Integrity Warning */}
                {geoIntegrity && (
                  <div className="p-4 bg-[#FFFFFF] border-2 border-[#000000] font-mono text-[11px] flex items-start gap-3 text-[#000000]">
                    <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5 text-[#000000]" />
                    <div>
                      <div className="font-bold uppercase">
                        {geoIntegrity.flagManualVerification
                          ? 'FLAG: PERLU VERIFIKASI MANUAL (>500M)'
                          : 'INTEGRITAS LOKASI VALID'}
                      </div>
                      <div className="text-[#272E3B] font-medium">{geoIntegrity.reason}</div>
                    </div>
                  </div>
                )}

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
              </div>

              {/* Step 3: Fire Scale & Description */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#525866] font-bold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#0F141A]" /> 3. SKALA KEBAKARAN
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['KECIL', 'SEDANG', 'BESAR'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSkala(s)}
                        className={`h-[48px] font-mono text-[13px] uppercase tracking-[0.06em] border font-bold transition-all ${
                          skala === s
                            ? 'bg-[#0F141A] text-[#FFFFFF] border-[#0F141A]'
                            : 'bg-[#FFFFFF] text-[#525866] border-[#D0D5DD] hover:border-[#0F141A]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="4. DESKRIPSI SINGKAT KONDISI LAPANGAN (OPSIONAL)"
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
