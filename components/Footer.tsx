import React from 'react';
import Link from 'next/link';
import { Shield, PhoneCall, Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#E2E8F0] border-t-2 border-[#000000] w-full text-[#000000] mt-auto font-medium">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#000000]">
          {/* Col 1: Brand */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-[16px] h-[16px] bg-[#FF4D00]"></div>
              <span className="font-display font-bold text-[26px] text-[#000000]">SIGAP</span>
            </div>
            <p className="font-body text-[15px] text-[#000000] max-w-md leading-relaxed font-medium">
              Sistem Informasi Geolokasi Aduan Pelaporan Kebakaran Hutan dan Lahan. Pengiriman data lokasi presisi GPS dan bukti visual real-time untuk respons cepat pemadam bencana.
            </p>
            <div className="font-mono text-[11px] text-[#000000] font-bold uppercase tracking-[0.08em] mt-2">
              SDG 13: PENANGANGAN PERUBAHAN IKLIM · INFINITERA 2026
            </div>
          </div>

          {/* Col 2: Emergency Contact */}
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[12px] tracking-[0.08em] text-[#000000] uppercase font-bold flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#000000]" /> KONTAK DARURAT
            </div>
            <div className="flex flex-col gap-2 font-mono text-[14px] text-[#000000]">
              <div className="p-3.5 bg-[#FFFFFF] border-2 border-[#000000]">
                <span className="text-[#000000] block text-[11px] font-bold">PANGGILAN DARURAT</span>
                <span className="text-[#000000] font-bold text-[18px]">112 / 113</span>
              </div>
              <div className="p-3.5 bg-[#FFFFFF] border-2 border-[#000000]">
                <span className="text-[#000000] block text-[11px] font-bold">BPBD PROVINSI</span>
                <span className="font-bold text-[15px]">(021) 555-0199</span>
              </div>
            </div>
          </div>

          {/* Col 3: Navigation & Responder Login */}
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[12px] tracking-[0.08em] text-[#000000] uppercase font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#000000]" /> NAVIGASI
            </div>
            <ul className="flex flex-col gap-3 font-body text-[14px] font-bold text-[#000000]">
              <li>
                <Link href="/lapor" className="hover:underline text-[#000000]">
                  LAPOR KEBAKARAN
                </Link>
              </li>
              <li>
                <Link href="/peta" className="hover:underline text-[#000000]">
                  PETA SEBARAN
                </Link>
              </li>
              <li>
                <Link href="/edukasi" className="hover:underline text-[#000000]">
                  EDUKASI & FAQ
                </Link>
              </li>
              <li>
                <Link href="/privasi" className="hover:underline text-[#000000]">
                  KEBIJAKAN PRIVASI
                </Link>
              </li>
              <li className="pt-3 border-t border-[#000000] mt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-[#000000] hover:underline font-bold"
                >
                  <Lock className="w-4 h-4 text-[#000000]" /> AKSES PETUGAS / LOGIN
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[#000000] font-bold">
          <div>© 2026 SIGAP Infinitera. Hak Cipta Dilindungi.</div>
          <div>OPENSTREETMAP DATA ATTRIBUTION © OPENSTREETMAP CONTRIBUTORS</div>
        </div>
      </div>
    </footer>
  );
}
