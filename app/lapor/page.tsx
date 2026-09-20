'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Camera,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Trash2,
  AlertTriangle,
  AlertCircle,
  SwitchCamera,
  X,
  Upload,
} from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { Textarea } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { parseExifData, ExifData } from '@/lib/exif';
import { calculateHaversineDistance, isLuarWilayahSumsel } from '@/lib/geo';
import { reverseGeocode } from '@/lib/wilayah';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[240px] bg-[#FFFFFF] border border-[#D0D5DD] flex items-center justify-center font-mono text-[11px] text-[#8E95A3]">
      MEMUAT FALLBACK PETA PIN...
    </div>
  ),
});

/**
 * Kompresi gambar di sisi klien:
 * - Resize sisi terpanjang maksimal 1280px (menjaga rasio aspek)
 * - Konversi ke format image/jpeg dengan quality 0.8
 * - Menghasilkan Base64 Data URL hemat ukuran (~100-300 KB)
 */
function compressImageClient(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context tidak tersedia'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function LaporPage() {
  const [file, setFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exifInfo, setExifInfo] = useState<ExifData | null>(null);
  // Ref mirrors exifInfo so handleSubmit always reads the freshest EXIF
  // even if React batches the setState and hasn't flushed yet.
  const exifRef = useRef<ExifData | null>(null);

  // Perangkat & mode pengujian
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [hasWebcam, setHasWebcam] = useState<boolean | null>(null);

  // Modal kamera desktop (Webcam)
  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(0);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [sumberKoordinat, setSumberKoordinat] = useState<'gps' | 'manual'>('gps');
  const [showManualPin, setShowManualPin] = useState(false);

  const [wilayah, setWilayah] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string; idCode?: string; type?: 'success' | 'error' } | null>(null);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  useEffect(() => {
    requestBrowserLocation();

    if (typeof window !== 'undefined') {
      // 1. Deteksi Mode Pengujian (?dev=1)
      const params = new URLSearchParams(window.location.search);
      setIsDevMode(params.get('dev') === '1');

      // 2. Deteksi Mobile Device
      const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobileCheck);

      // 3. Deteksi Kamera/Webcam pada Desktop
      if (!mobileCheck && navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            const videoDevs = devices.filter((d) => d.kind === 'videoinput');
            setHasWebcam(videoDevs.length > 0);
          })
          .catch(() => {
            setHasWebcam(false);
          });
      }
    }

    return () => {
      stopWebcamStream();
    };
  }, []);

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('ERROR');
      setGpsErrorMessage('Browser Anda tidak mendukung Geolocation API.');
      setGpsLat(null);
      setGpsLng(null);
      setGpsAccuracy(null);
      setWilayah('');
      return;
    }

    setGpsStatus('FETCHING');
    setGpsErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setGpsLat(lat);
        setGpsLng(lng);
        setGpsAccuracy(accuracy);
        setGpsStatus('SUCCESS');
        setGpsErrorMessage(null);
        setSumberKoordinat('gps');
        setShowManualPin(false);

        const regionName = await reverseGeocode(lat, lng);
        setWilayah(regionName);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsStatus('ERROR');
        // JANGAN mengisi koordinat palsu / fallback
        setGpsLat(null);
        setGpsLng(null);
        setGpsAccuracy(null);
        setWilayah('');

        let message = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === 1) {
          // PERMISSION_DENIED
          message = 'Izin akses lokasi ditolak oleh browser/pengguna. Silakan izinkan akses lokasi pada browser Anda.';
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          message = 'Sinyal GPS tidak tersedia. Pastikan fitur GPS aktif dan memiliki sinyal yang cukup.';
        } else if (err.code === 3) {
          // TIMEOUT
          message = 'Waktu pencarian GPS habis (timeout). Coba berpindah ke area terbuka lalu perbarui.';
        }
        setGpsErrorMessage(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // VALIDASI FOTO:
    // - Maksimal 5 MB
    // - Hanya image/jpeg, image/png, image/webp
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    if (!ALLOWED_TYPES.includes(selectedFile.type.toLowerCase())) {
      setToastMessage({
        msg: 'Format file tidak didukung. Hanya file JPG, PNG, atau WebP yang diizinkan.',
        type: 'error',
      });
      e.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setToastMessage({
        msg: 'Ukuran foto melebihi batas maksimal 5 MB.',
        type: 'error',
      });
      e.target.value = '';
      return;
    }

    setFile(selectedFile);

    // ── LANGKAH 1: BACA EXIF DARI FILE ASLI ────────────────────────────────
    // WAJIB dilakukan SEBELUM kompresi — canvas.toDataURL() menghapus semua EXIF.
    console.log('[EXIF] Memulai ekstraksi dari file ASLI sebelum kompresi...');
    const parsed = await parseExifData(selectedFile);
    console.log('[EXIF] Hasil ekstraksi:', {
      hasGps: parsed.hasGps,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      dateTimeOriginal: parsed.dateTimeOriginal,
      make: parsed.make,
      model: parsed.model,
    });
    if (!parsed.hasGps) {
      console.warn('[EXIF] GPS tidak ditemukan di foto. Tingkat keyakinan akan TINJAUAN atau CURIGA.');
    }
    // Simpan ke state DAN ref agar handleSubmit selalu dapat nilai terbaru
    setExifInfo(parsed);
    exifRef.current = parsed;

    // ── LANGKAH 2: KOMPRESI GAMBAR ─────────────────────────────────────────
    // Baru dijalankan SETELAH EXIF tersimpan.
    console.log('[EXIF] Mulai kompresi canvas...');
    try {
      const compressedBase64 = await compressImageClient(selectedFile, 1280, 0.7);
      console.log('[EXIF] Kompresi selesai. Ukuran base64:', Math.round(compressedBase64.length / 1024), 'KB');
      setPhotoPreview(compressedBase64);
    } catch (compErr) {
      console.warn('[EXIF] Kompresi canvas gagal, fallback ke data URL mentah:', compErr);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const stopWebcamStream = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const openWebcamModal = async (deviceId?: string) => {
    setIsWebcamOpen(true);
    setIsStartingCamera(true);
    setWebcamError(null);

    stopWebcamStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung akses kamera langsung (MediaDevices API).');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (errFallback) {
        // Fallback jika constraint resolusi tidak didukung
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Perbarui daftar kamera setelah izin diberikan
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      if (videoInputs.length > 0) {
        const currentTrack = stream.getVideoTracks()[0];
        const currentSettings = currentTrack?.getSettings?.();
        if (currentSettings?.deviceId) {
          const idx = videoInputs.findIndex((d) => d.deviceId === currentSettings.deviceId);
          if (idx !== -1) setCurrentDeviceIndex(idx);
        }
      }
    } catch (err: any) {
      console.error('Gagal mengakses kamera:', err);
      let errorMsg = 'Gagal mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Tidak ditemukan perangkat webcam pada komputer/laptop ini.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setWebcamError(errorMsg);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const closeWebcamModal = () => {
    stopWebcamStream();
    setIsWebcamOpen(false);
    setWebcamError(null);
  };

  const switchWebcamDevice = () => {
    if (videoDevices.length <= 1) return;
    const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
    setCurrentDeviceIndex(nextIndex);
    openWebcamModal(videoDevices[nextIndex].deviceId);
  };

  const captureWebcamPhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const MAX_DIM = 1280;
    const rawWidth = video.videoWidth || 1280;
    const rawHeight = video.videoHeight || 720;
    const scale = Math.min(1, MAX_DIM / Math.max(rawWidth, rawHeight));
    const width = Math.round(rawWidth * scale);
    const height = Math.round(rawHeight * scale);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    // Buat objek File untuk form submission
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: 'image/jpeg' });
    const capturedFile = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });

    setFile(capturedFile);
    setPhotoPreview(dataUrl);

    // PENTING: Foto hasil webcam desktop tidak memiliki EXIF.
    // Pastikan sistem menanganinya sebagai "EXIF tidak tersedia" dan tingkat keyakinan TINJAUAN — jangan diisi nilai apa pun dari GPS browser.
    console.log('[WEBCAM] Foto diambil dari webcam. EXIF diatur NULL (TINJAUAN).');
    setExifInfo(null);
    exifRef.current = null;

    closeWebcamModal();
  };

  useEffect(() => {
    if (isWebcamOpen && videoRef.current && webcamStreamRef.current) {
      videoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [isWebcamOpen, isStartingCamera]);

  const clearPhoto = () => {
    setFile(null);
    setPhotoPreview(null);
    setExifInfo(null);
    exifRef.current = null;
    closeWebcamModal();
  };

  const handlePinDragEnd = async (lat: number, lng: number) => {
    setGpsLat(lat);
    setGpsLng(lng);
    setGpsAccuracy(null);
    setSumberKoordinat('manual');
    setGpsStatus('SUCCESS');
    setGpsErrorMessage(null);
    const regionName = await reverseGeocode(lat, lng);
    setWilayah(regionName);
  };

  const handleToggleManualPin = () => {
    setShowManualPin((prev) => !prev);
  };

  // Calculate distance for preview display
  const previewDistance =
    gpsLat !== null &&
    gpsLng !== null &&
    exifInfo?.latitude != null &&
    exifInfo?.longitude != null
      ? calculateHaversineDistance(gpsLat, gpsLng, exifInfo.latitude, exifInfo.longitude)
      : null;

  // Check if coordinates are outside Sumatera Selatan coverage area
  const isOutsideSumsel =
    gpsLat !== null && gpsLng !== null && isLuarWilayahSumsel(gpsLat, gpsLng);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (gpsLat === null || gpsLng === null) {
      setToastMessage({ msg: 'Lokasi koordinat wajib tersedia', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      // Foto WAJIB ada — jangan pakai fallback aset statis
      if (!photoPreview) {
        throw new Error('Foto belum dipilih. Ambil foto terlebih dahulu.');
      }
      const photoPayload = photoPreview;

      // Baca EXIF dari ref — dijamin nilai terbaru meski React belum flush state
      const latestExif = exifRef.current;
      console.log('[SUBMIT] EXIF saat submit:', latestExif);

      const payload = {
        foto: photoPayload,
        foto_url: photoPayload,
        foto_tipe: 'image/jpeg',
        foto_size: photoPayload.length,
        lat: gpsLat,
        lng: gpsLng,
        lat_gps: gpsLat,
        lng_gps: gpsLng,
        akurasi_gps: gpsAccuracy,
        // EXIF values come ONLY from the photo, never from browser GPS
        lat_exif: latestExif?.latitude ?? null,
        lng_exif: latestExif?.longitude ?? null,
        exif_lat: latestExif?.latitude ?? null,
        exif_lng: latestExif?.longitude ?? null,
        date_time_original: latestExif?.dateTimeOriginal ?? null,
        waktu_jepret_exif: latestExif?.dateTimeOriginal ?? null,
        wilayah: wilayah || `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`,
        deskripsi,
        sumber_koordinat: sumberKoordinat,
      };

      const res = await fetch('/api/laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Only display success if response is strictly OK, success is true, and valid report ID exists
      if (res.ok && data.success && data.data && data.data.id) {
        setSubmittedReport(data.data);
        setToastMessage({
          msg: 'LAPORAN TERKIRIM BERHASIL',
          idCode: data.data.kode_laporan || data.data.kode,
          type: 'success',
        });
      } else {
        setSubmittedReport(null);
        throw new Error(data.error || 'Gagal menyimpan laporan ke server.');
      }
    } catch (err: any) {
      console.error('Submit report error:', err);
      setSubmittedReport(null);
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

            <div className="w-full bg-[#FFF9F2] p-4 border border-[#D0D5DD] font-mono text-[11px] sm:text-[12px] flex flex-col gap-2.5 text-left">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-[#8E95A3] shrink-0">WILAYAH:</span>
                <span className="text-[#800020] font-bold break-words">{submittedReport.wilayah}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-[#8E95A3] shrink-0">KOORDINAT GPS:</span>
                <span className="text-[#800020]">{submittedReport.lat_gps}, {submittedReport.lng_gps}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-[#8E95A3] shrink-0">SUMBER KOORDINAT:</span>
                <span className="text-[#800020] font-bold">
                  {submittedReport.sumber_koordinat === 'manual' ? 'MANUAL (PIN PETA)' : 'GPS OTOMATIS'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-[#8E95A3] shrink-0">TINGKAT KEYAKINAN:</span>
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
                  setGpsLat(null);
                  setGpsLng(null);
                  setGpsAccuracy(null);
                  setWilayah('');
                  setDeskripsi('');
                  setShowManualPin(false);
                  requestBrowserLocation();
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

                    {isMobile ? (
                      /* DI MOBILE: Tetap gunakan input capture="environment" persis seperti sekarang untuk menjaga EXIF asli perangkat */
                      <>
                        <label className="h-[44px] px-5 bg-[#000000] text-[#FFFFFF] font-mono text-[12px] uppercase font-bold hover:bg-[#272E3B] transition-colors cursor-pointer inline-flex items-center justify-center">
                          AMBIL FOTO DARI KAMERA
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <span className="font-mono text-[11px] text-[#272E3B] font-bold">
                          KAMERA BELAKANG
                        </span>
                      </>
                    ) : (
                      /* DI DESKTOP: Buka preview kamera dalam modal dengan MediaDevices */
                      <>
                        <button
                          type="button"
                          onClick={() => openWebcamModal()}
                          className="h-[44px] px-5 bg-[#000000] text-[#FFFFFF] font-mono text-[12px] uppercase font-bold hover:bg-[#272E3B] transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          AMBIL FOTO DARI KAMERA
                        </button>
                        <span className="font-mono text-[11px] text-[#272E3B] font-bold">
                          {hasWebcam === false ? 'KAMERA TIDAK TERDETEKSI' : 'WEBCAM DESKTOP'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. MODE PENGUJIAN (TERSEMBUNYI) - Hanya muncul jika URL memiliki query parameter ?dev=1 */}
              {isDevMode && (
                <div className="p-3.5 bg-[#FFF9F2] border-2 border-dashed border-[#F59E0B] flex flex-col gap-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> MODE PENGUJIAN
                    </span>
                    <span className="text-[10px] text-[#8E95A3] bg-[#FFFFFF] px-1.5 py-0.5 border border-[#F59E0B]/50 font-bold">
                      ?dev=1
                    </span>
                  </div>
                  <p className="font-body text-[12px] text-[#525866]">
                    Unggah file gambar dari perangkat untuk menguji ekstraksi EXIF asli dan alur laporan:
                  </p>
                  <label className="h-[38px] px-4 bg-[#FFFFFF] border border-[#000000] hover:bg-[#F3F4F6] text-[#000000] text-[11px] uppercase font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#000000]" />
                    <span>PILIH FILE FOTO (UJI EXIF)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* EXIF Metadata Card - Jika foto memiliki metadata EXIF */}
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

              {/* Status untuk foto Webcam Desktop (tanpa EXIF) */}
              {photoPreview && !exifInfo && (
                <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 flex flex-col gap-2 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-[#000000] font-bold pb-2 border-b border-[#000000]">
                    <span>METADATA FOTO</span>
                    <span className="text-[#800020] font-bold">EXIF TIDAK TERSEDIA</span>
                  </div>
                  <div className="text-[#272E3B] pt-1 font-medium leading-relaxed">
                    Foto diambil melalui webcam desktop tanpa metadata EXIF. Laporan ditangani dengan tingkat keyakinan <strong className="text-[#800020]">TINJAUAN</strong> untuk verifikasi manual petugas.
                  </div>
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

                <div className="bg-[#FFFFFF] border-2 border-[#000000] p-4 flex flex-col gap-3">
                  {/* Coordinates Display Box */}
                  {gpsStatus === 'FETCHING' ? (
                    <div className="font-mono text-[14px] font-bold text-[#800020] bg-[#FFF9F2] p-4 border border-[#000000] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <RefreshCw className="w-5 h-5 text-[#800020] animate-spin shrink-0" />
                        <span>Mengambil lokasi...</span>
                      </div>
                    </div>
                  ) : gpsStatus === 'ERROR' ? (
                    <div className="bg-[#FEF2F2] p-4 border-2 border-[#EF4444] flex flex-col gap-3">
                      <div className="flex items-start gap-2.5 text-[#991B1B]">
                        <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[13px] font-bold uppercase">
                            {gpsErrorMessage?.toLowerCase().includes('izin')
                              ? 'Izin Akses Lokasi Ditolak'
                              : 'Lokasi Belum Terdeteksi'}
                          </span>
                          <p className="font-body text-[13px] text-[#7F1D1D] leading-snug">
                            {gpsErrorMessage || 'Izin akses lokasi ditolak oleh browser/pengguna. Silakan izinkan akses lokasi pada pengaturan browser Anda.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#FCA5A5]/50">
                        <button
                          type="button"
                          onClick={requestBrowserLocation}
                          className="h-[34px] px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] font-mono text-[11px] uppercase font-bold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          COBA LAGI
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowManualPin(true)}
                          className="h-[34px] px-3.5 bg-[#FFFFFF] border border-[#DC2626] hover:bg-[#FEF2F2] text-[#DC2626] font-mono text-[11px] uppercase font-bold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          TENTUKAN PIN MANUAL
                        </button>
                      </div>
                    </div>
                  ) : gpsLat !== null && gpsLng !== null ? (
                    <div className="bg-[#FFF9F2] p-4 border border-[#000000] flex flex-col gap-2">
                      {/* Baris 1 (utama, teks besar): nama wilayah hasil reverse geocoding */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-mono text-[10px] text-[#8E95A3] font-bold uppercase tracking-wider">
                            WILAYAH TERDETEKSI
                          </span>
                          <div className="font-display font-bold text-[18px] sm:text-[20px] text-[#000000] leading-snug break-words">
                            {wilayah || <span className="text-[#8E95A3] italic font-normal text-[15px]">Mendeteksi nama wilayah...</span>}
                          </div>
                        </div>
                        <ShieldCheck className="w-5 h-5 text-[#800020] shrink-0 mt-1" />
                      </div>

                      {/* Baris 2 (kecil, warna abu): LAT: -3.19741   LNG: 104.65960 */}
                      <div className="pt-2 border-t border-[#000000]/10 flex flex-wrap items-center justify-between gap-2 font-mono text-[12px] text-[#6B7280]">
                        <span className="font-medium tracking-wide">
                          LAT: {gpsLat.toFixed(5)} &nbsp;&nbsp; LNG: {gpsLng.toFixed(5)}
                        </span>
                        {sumberKoordinat === 'gps' && gpsAccuracy !== null && (
                          <span className="font-semibold text-[#4B5565] text-[11px]">
                            Akurasi GPS: ±{gpsAccuracy}m
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-[14px] font-bold text-[#B91C1C] bg-[#FEF2F2] p-4 border-2 border-[#EF4444] flex items-center justify-between gap-3">
                      <span>Lokasi belum terdeteksi</span>
                      <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0" />
                    </div>
                  )}

                  {/* Weak GPS Warning (> 100m) */}
                  {sumberKoordinat === 'gps' && gpsAccuracy !== null && gpsAccuracy > 100 && (
                    <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] p-3 text-[#92400E] font-mono text-[12px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
                      <span className="font-bold">
                        Sinyal GPS lemah. Pindah ke area terbuka lalu tekan Perbarui Lokasi GPS.
                      </span>
                    </div>
                  )}

                  {/* Manual Location Notice */}
                  {sumberKoordinat === 'manual' && gpsLat !== null && (
                    <div className="font-mono text-[11px] text-[#B45309] font-bold bg-[#FEF3C7] border border-[#F59E0B] p-2.5 flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-[#B45309]" />
                      <span>LOKASI DITENTUKAN MANUAL (Laporan otomatis masuk tingkat TINJAUAN)</span>
                    </div>
                  )}

                  {/* TOMBOL REFRESH GPS: outline button, responsif di mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={requestBrowserLocation}
                      disabled={gpsStatus === 'FETCHING'}
                      className="h-[40px] px-3 sm:px-4 bg-transparent border-2 border-[#800020] text-[#800020] hover:bg-[#800020] hover:text-[#FFFFFF] font-mono text-[11px] uppercase font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 w-full sm:w-fit cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'FETCHING' ? 'animate-spin' : ''}`} />
                      <span>{gpsStatus === 'FETCHING' ? 'MENGAMBIL LOKASI...' : 'PERBARUI LOKASI GPS'}</span>
                    </button>

                    {(gpsStatus === 'ERROR' || showManualPin) && (
                      <button
                        type="button"
                        onClick={handleToggleManualPin}
                        className="h-[40px] px-3 sm:px-4 bg-transparent border-2 border-[#000000] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF] font-mono text-[11px] uppercase font-bold inline-flex items-center justify-center gap-2 transition-colors w-full sm:w-fit cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#800020]" />
                        <span>{showManualPin ? 'TUTUP PETA MANUAL' : 'TENTUKAN PIN MANUAL DI PETA'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Fallback Draggable Pin Map */}
                {(showManualPin || (gpsStatus === 'ERROR' && gpsLat !== null)) && (
                  <div className="flex flex-col gap-2 p-3 bg-[#FFFFFF] border-2 border-[#000000]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-[#000000] font-bold uppercase">
                        FALLBACK PIN MANUAL (GESER PIN KE TITIK KEBAKARAN):
                      </span>
                      <span className="font-mono text-[10px] text-[#B45309] font-bold bg-[#FEF3C7] border border-[#F59E0B] px-1.5 py-0.5 uppercase">
                        SUMBER: MANUAL
                      </span>
                    </div>
                    <div className="w-full h-[240px]">
                      <MapContainer
                        reports={[]}
                        center={gpsLat !== null && gpsLng !== null ? [gpsLat, gpsLng] : undefined}
                        zoom={14}
                        draggablePin={true}
                        onPinDragEnd={handlePinDragEnd}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Description & Submit Button */}
              <div className="flex flex-col gap-6">
                <Textarea
                  label="3. DESKRIPSI SINGKAT KONDISI LAPANGAN (OPSIONAL)"
                  placeholder="Contoh: Asap tebal mengarah ke pemukiman RT 04, luas perkiraan 2 hektar gambut kering."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                />

                {/* Out-of-bounds Sumsel warning — shown when GPS coords are outside province */}
                {isOutsideSumsel && (
                  <div className="bg-[#FFFBEB] border-2 border-[#F59E0B] p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[12px] font-bold text-[#92400E] uppercase tracking-wide">
                        LOKASI DI LUAR WILAYAH SUMATERA SELATAN
                      </span>
                      <p className="font-body text-[13px] text-[#78350F] leading-snug">
                        Lokasi Anda terdeteksi di luar Provinsi Sumatera Selatan. SIGAP saat ini melayani wilayah Sumatera Selatan.
                        Laporan tetap dapat dikirim dan akan tercatat sebagai laporan luar wilayah.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={submitting || !file || gpsLat === null || gpsLng === null}
                  className="mt-2 text-[13px] sm:text-[15px] h-[52px] sm:h-[56px] px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? 'MEMPROSES LAPORAN...'
                    : !file && (gpsLat === null || gpsLng === null)
                    ? 'FOTO & KOORDINAT WAJIB TERISI'
                    : !file
                    ? 'AMBIL FOTO TERLEBIH DAHULU'
                    : gpsLat === null || gpsLng === null
                    ? 'LOKASI BELUM TERSEDIA'
                    : isOutsideSumsel
                    ? 'KIRIM LAPORAN (LUAR WILAYAH)'
                    : 'KIRIM LAPORAN DARURAT SIGAP'}
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

      {/* MODAL KAMERA DESKTOP (WEBCAM) */}
      {isWebcamOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border-2 border-[#000000] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-4 py-3 bg-[#000000] text-[#FFFFFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#FFFFFF]" />
                <span className="font-mono text-[12px] uppercase font-bold tracking-wider">
                  KAMERA WEBCAM DESKTOP
                </span>
              </div>
              <button
                type="button"
                onClick={closeWebcamModal}
                className="text-[#FFFFFF] hover:text-[#EF4444] transition-colors p-1"
                aria-label="Tutup modal kamera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewport Video Live */}
            <div className="relative aspect-[4/3] bg-[#000000] flex items-center justify-center overflow-hidden">
              {webcamError ? (
                <div className="p-6 text-center flex flex-col items-center gap-3 text-[#FFFFFF]">
                  <AlertCircle className="w-10 h-10 text-[#EF4444]" />
                  <div className="font-mono text-[13px] font-bold text-[#EF4444] uppercase">
                    Kamera Tidak Dapat Digunakan
                  </div>
                  <p className="font-body text-[13px] text-[#D0D5DD] max-w-sm">
                    {webcamError}
                  </p>
                  <button
                    type="button"
                    onClick={() => openWebcamModal()}
                    className="mt-2 px-4 py-2 bg-[#800020] text-[#FFFFFF] font-mono text-[11px] uppercase font-bold hover:bg-[#600018] transition-colors inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> COBA LAGI
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {isStartingCamera && (
                    <div className="absolute inset-0 bg-[#000000]/60 flex items-center justify-center font-mono text-[12px] text-[#FFFFFF] gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFFFF]" />
                      <span>MEMULAI KAMERA...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Kontrol Bawah Modal */}
            <div className="p-4 bg-[#FFF9F2] border-t-2 border-[#000000] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={switchWebcamDevice}
                    disabled={isStartingCamera || !!webcamError}
                    className="h-[42px] px-3 bg-[#FFFFFF] border border-[#000000] hover:bg-[#F3F4F6] text-[#000000] text-[11px] uppercase font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span>GANTI KAMERA ({currentDeviceIndex + 1}/{videoDevices.length})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={closeWebcamModal}
                  className="h-[42px] px-4 bg-[#FFFFFF] border border-[#D0D5DD] hover:border-[#000000] text-[#525866] hover:text-[#000000] text-[11px] uppercase font-bold transition-colors cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={captureWebcamPhoto}
                  disabled={isStartingCamera || !!webcamError}
                  className="h-[42px] px-6 bg-[#800020] hover:bg-[#600018] text-[#FFFFFF] text-[12px] uppercase font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Camera className="w-4 h-4 text-[#FFFFFF]" />
                  AMBIL FOTO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
