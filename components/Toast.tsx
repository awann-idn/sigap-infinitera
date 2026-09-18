'use client';

import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  idCode?: string;
  type?: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  idCode,
  type = 'success',
  onClose,
  duration = 6000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[9990] bg-[#FFFFFF] border-2 border-[#800020] p-4 sm:max-w-md w-auto sm:w-full flex items-start justify-between gap-4 transition-all duration-200 shadow-xl"
    >
      <div className="flex items-start gap-3">
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
        )}
        <div className="flex flex-col gap-1">
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] font-bold text-[#000000]">
            {message}
          </div>
          {idCode && (
            <div className="font-mono text-[13px] text-[#000000] font-bold bg-[#F3E6D5] px-2 py-1 border border-[#94A3B8] w-fit">
              ID: {idCode}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-[#000000] hover:text-[#D45060] transition-colors p-1"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
