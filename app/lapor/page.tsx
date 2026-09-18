'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Camera, MapPin, AlertOctagon, CheckCircle2, ShieldCheck, Flame, RefreshCw, Aperture } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { Textarea } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { parseExifData, ExifData } from '@/lib/exif';
import { evaluateLocationIntegrity, GeoComparisonResult } from '@/lib/geo';
import { reverseGeocode } from '@/lib/wilayah';
import piexif from 'piexifjs';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] bg-[#FFFFFF] border border-[#D0D5DD] flex items-center justify-center font-mono text-[11px] text-[#8E95A3]">
      MEMUAT FALLBACK PETA PIN...
    </div>
  ),
});

function decimalToDmsRational(value: number): number[][] {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 100), 100],
  ];
}

function embedGpsExif(jpegDataUrl: string, lat: number, lng: number): string {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeOriginal = `${now.getFullYear()}:${pad(now.getMonth() + 1)}:${pad(
      now.getDate()
    )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const exifObject = {
      '0th': {
        [piexif.ImageIFD.Make]: 'SIGAP',
        [piexif.ImageIFD.Model]: 'SIGAP Web Camera',
        [piexif.ImageIFD.Software]: 'SIGAP Infinitera',
      },
      Exif: {
        [piexif.ExifIFD.DateTimeOriginal]: dateTimeOriginal,
      },
      GPS: {
        [piexif.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
        [piexif.GPSIFD.GPSMapDatum]: 'WGS-84',
        [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? 'N' : 'S',
        [piexif.GPSIFD.GPSLatitude]: decimalToDmsRational(lat),
        [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? 'E' : 'W',
        [piexif.GPSIFD.GPSLongitude]: decimalToDmsRational(lng),
      },
    };

    const exifBytes = piexif.dump(exifObject);
    return piexif.insert(exifBytes, jpegDataUrl);
  } catch (error) {
    console.warn('Gagal menyisipkan GPS EXIF ke foto:', error);
    return jpegDataUrl;
  }
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'image/jpeg' });
}

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

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    requestBrowserLocation();
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
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
        setGpsLat(-3.0037);
        setGpsLng(104.706);
        setWilayah('Kec. Gandus, Kota Palembang, Sumatera Selatan (Fallback Pin)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Perangkat ini tidak mendukung akses kamera langsung.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access failed:', err);
      setCameraError('Akses kamera ditolak atau tidak tersedia. Izinkan kamera lalu coba lagi.');
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    let capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (gpsLat !== null && gpsLng !== null) {
      capturedDataUrl = embedGpsExif(capturedDataUrl, gpsLat, gpsLng);
    }

    setPhotoPreview(capturedDataUrl);

    const captured = await dataUrlToFile(capturedDataUrl, `sigap-${Date.now()}.jpg`);
    setFile(captured);

    const parsed = await parseExifData(captured);
    setExifInfo(parsed);

    if (gpsLat !== null && gpsLng !== null && parsed.latitude && parsed.longitude) {
      const check = evaluateLocationIntegrity(gpsLat, gpsLng, parsed.latitude, parsed.longitude);
      setGeoIntegrity(check);
    } else {
      setGeoIntegrity(null);
    }

    stopCamera();
  };

  const retakePhoto = () => {
    setFile(null);
    setPhotoPreview(null);
    setExifInfo(null);
    setGeoIntegrity(null);
    startCamera();
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
                <span className="text-[#8E95A3]">SKALA KEBAKARAN:</span>
                <span className="text-[#800020] font-bold">{submittedReport.skala}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E95A3]">KOORDINAT GPS:</span>
                <span className="text-[#800020]">{submittedReport.lat_gps}, {submittedReport.lng_gps}</span>
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
                  setGeoIntegrity(null);
                  setDeskripsi('');
                  stopCamera();
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
            {/* Left Column: Live Camera Capture & EXIF check */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#000000] font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#000000]" /> 1. AMBIL FOTO LANGSUNG (KAMERA)
                </label>
                <span className="font-body text-[14px] text-[#272E3B] font-medium">
                  Foto wajib diambil langsung dari kamera perangkat saat kejadian. Tidak tersedia unggah berkas dari galeri.
                </span>
              </div>

              {/* Live Camera Capture */}
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
                        onClick={retakePhoto}
                        className="font-mono text-[12px] uppercase text-[#FFFFFF] font-bold flex items-center gap-2 hover:underline"
                      >
                        <RefreshCw className="w-4 h-4 text-[#FFFFFF]" /> AMBIL ULANG FOTO
                      </button>
                    </div>
                  </>
                ) : cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover bg-[#000000]"
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 h-[48px] px-6 bg-[#000000] text-[#FFFFFF] font-mono text-[12px] uppercase font-bold flex items-center gap-2 hover:bg-[#272E3B] transition-colors"
                    >
                      <Aperture className="w-4 h-4 text-[#FFFFFF]" /> JEPRET FOTO
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center gap-3 p-6">
                    <div className="w-12 h-12 bg-[#FFF9F2] border border-[#000000] flex items-center justify-center text-[#000000]">
                      <Camera className="w-5 h-5 text-[#000000]" />
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="h-[44px] px-5 bg-[#000000] text-[#FFFFFF] font-mono text-[12px] uppercase font-bold hover:bg-[#272E3B] transition-colors"
                    >
                      AKTIFKAN KAMERA
                    </button>
                    <span className="font-mono text-[11px] text-[#272E3B] font-bold">
                      IZINKAN AKSES KAMERA SAAT DIMINTA BROWSER
                    </span>
                    {cameraError && (
                      <span className="font-mono text-[11px] text-[#DC2626] font-bold">{cameraError}</span>
                    )}
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

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
                      Koordinat GPS browser belum tersedia saat foto diambil. Izinkan lokasi lalu ambil ulang foto.
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

                  <div className="font-mono text-[16px] font-bold text-[#000000] bg-[#FFF9F2] p-3 border border-[#000000] flex items-center justify-between">
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
                    <Flame className="w-4 h-4 text-[#800020]" /> 3. SKALA KEBAKARAN
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['KECIL', 'SEDANG', 'BESAR'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSkala(s)}
                        className={`h-[48px] font-mono text-[13px] uppercase tracking-[0.06em] border font-bold transition-all ${
                          skala === s
                            ? 'bg-[#800020] text-[#FFFFFF] border-[#800020]'
                            : 'bg-[#FFFFFF] text-[#525866] border-[#D0D5DD] hover:border-[#800020]'
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
