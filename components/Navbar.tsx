'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Flame } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'BERANDA' },
    { href: '/peta', label: 'PETA SEBARAN' },
    { href: '/edukasi', label: 'EDUKASI' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFF9F2] border-b-2 border-[#000000] w-full shadow-sm">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 h-[76px] flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-[16px] h-[16px] bg-[#D45060] shrink-0"></div>
          <span className="font-display font-bold text-[26px] tracking-[-0.03em] text-[#000000]">
            SIGAP
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body text-[14px] font-bold tracking-[0.04em] uppercase transition-colors py-1 ${
                  isActive
                    ? 'text-[#000000] border-b-2 border-[#000000]'
                    : 'text-[#000000] hover:text-[#D45060] opacity-80 hover:opacity-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Prominent High-Visibility "LAPOR KEBAKARAN" Button */}
          <Link
            href="/lapor"
            className="h-[42px] px-5 bg-[#800020] text-[#FFFFFF] font-mono text-[13px] font-bold tracking-[0.06em] uppercase flex items-center gap-2 hover:bg-[#9E1B36] transition-colors border border-[#800020]"
          >
            <Flame className="w-4 h-4 text-[#D45060]" />
            LAPOR KEBAKARAN
          </Link>
        </nav>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#000000]"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFF9F2] border-b-2 border-[#000000] px-5 py-6 flex flex-col gap-4">
          <Link
            href="/lapor"
            onClick={() => setMobileMenuOpen(false)}
            className="p-4 bg-[#800020] text-[#FFFFFF] font-mono text-[14px] font-bold tracking-[0.06em] uppercase flex items-center justify-between"
          >
            <span>LAPOR KEBAKARAN</span>
            <Flame className="w-5 h-5 text-[#D45060]" />
          </Link>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`p-3 font-body text-[14px] font-bold tracking-[0.04em] uppercase border-l-4 ${
                pathname === link.href
                  ? 'border-[#000000] text-[#000000] bg-[#FFFFFF]'
                  : 'border-transparent text-[#000000]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
