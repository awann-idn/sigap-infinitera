import React from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { AlertOctagon } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center py-20 px-5 text-center bg-[#FFF9F2]">
      <div className="w-16 h-16 bg-[#000000] text-[#FFFFFF] flex items-center justify-center mb-6">
        <AlertOctagon className="w-10 h-10 text-[#FFFFFF]" />
      </div>

      <div className="font-mono text-[12px] text-[#000000] uppercase tracking-[0.1em] font-bold mb-2">
        ERROR 404 — HALAMAN TIDAK DITEMUKAN
      </div>

      <h1 className="font-display font-bold text-[clamp(40px,6vw,80px)] text-[#000000] leading-none mb-4 uppercase">
        RUTE TIDAK VALID
      </h1>

      <p className="font-body text-[16px] text-[#272E3B] max-w-md leading-relaxed mb-8 font-medium">
        Halaman yang Anda tuju tidak terdaftar atau telah dipindahkan dalam navigasi sistem SIGAP.
      </p>

      <Link href="/">
        <Button variant="primary">KEMBALI KE BERANDA SIGAP →</Button>
      </Link>
    </div>
  );
}
