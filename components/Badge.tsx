import React from 'react';

export type StatusVerifikasi = 'belum-diverifikasi' | 'terverifikasi' | 'spam';
export type StatusPenanganan = 'menunggu' | 'diproses' | 'selesai';

interface BadgeProps {
  type?: 'verifikasi' | 'penanganan' | 'skala' | 'keyakinan' | 'sumber';
  value: string;
  isDashboard?: boolean;
  className?: string;
}

export function Badge({ type = 'verifikasi', value, isDashboard = false, className = '' }: BadgeProps) {
  let label = value.toUpperCase();

  if (!isDashboard) {
    if (value === 'terverifikasi') label = 'TERVERIFIKASI';
    else if (value === 'belum-diverifikasi') label = 'BELUM DIVERIFIKASI';
    else if (value === 'spam') label = 'SPAM';
    else label = value.toUpperCase();

    return (
      <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-[#272E3B] bg-[#F3E6D5] border border-[#94A3B8] ${className}`}>
        {label}
      </span>
    );
  }

  let colorStyle = 'text-[#272E3B] border-[#C1C7D0] bg-[#FFFFFF]';

  if (type === 'verifikasi') {
    switch (value) {
      case 'terverifikasi':
        colorStyle = 'text-[#15803D] border-[#15803D] bg-[#15803D]/10 font-bold';
        label = 'TERVERIFIKASI';
        break;
      case 'belum-diverifikasi':
        colorStyle = 'text-[#A16207] border-[#A16207] bg-[#A16207]/10 font-bold';
        label = 'BELUM DIVERIFIKASI';
        break;
      case 'spam':
        colorStyle = 'text-[#B91C1C] border-[#B91C1C] bg-[#B91C1C]/10 font-bold';
        label = 'SPAM';
        break;
    }
  } else if (type === 'penanganan') {
    switch (value) {
      case 'selesai':
        colorStyle = 'text-[#15803D] border-[#15803D] bg-[#15803D]/10 font-bold';
        label = 'SELESAI';
        break;
      case 'diproses':
        colorStyle = 'text-[#000000] border-[#000000] bg-[#000000]/10 font-bold';
        label = 'DIPROSES';
        break;
      case 'menunggu':
      default:
        colorStyle = 'text-[#A16207] border-[#A16207] bg-[#A16207]/10 font-bold';
        label = 'MENUNGGU';
        break;
    }
  } else if (type === 'skala') {
    colorStyle = 'text-[#000000] border-[#000000] bg-[#FFF9F2] font-bold';
    label = value.toUpperCase();
  } else if (type === 'keyakinan') {
    switch (value.toUpperCase()) {
      case 'TINGGI':
        colorStyle = 'text-[#15803D] border-[#15803D] bg-[#15803D]/10 font-bold';
        label = 'TINGGI';
        break;
      case 'TINJAUAN':
        colorStyle = 'text-[#A16207] border-[#A16207] bg-[#A16207]/10 font-bold';
        label = 'TINJAUAN';
        break;
      case 'CURIGA':
        colorStyle = 'text-[#B91C1C] border-[#B91C1C] bg-[#B91C1C]/10 font-bold';
        label = 'CURIGA';
        break;
      default:
        label = value.toUpperCase();
    }
  } else if (type === 'sumber') {
    if (value.toLowerCase() === 'manual' || value.toUpperCase().includes('MANUAL')) {
      colorStyle = 'text-[#B45309] border-[#B45309] bg-[#B45309]/10 font-bold';
      label = 'LOKASI DITENTUKAN MANUAL';
    } else {
      colorStyle = 'text-[#15803D] border-[#15803D] bg-[#15803D]/10 font-bold';
      label = 'GPS OTOMATIS';
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] uppercase border ${colorStyle} ${className}`}>
      <span className="w-1.5 h-1.5 bg-current inline-block"></span>
      {label}
    </span>
  );
}
