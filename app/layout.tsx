import React from 'react';
import type { Metadata } from 'next';
import { Space_Grotesk, DM_Sans, Space_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { LoadingProvider } from '@/components/LoadingScreen';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIGAP — Sistem Informasi Geolokasi Aduan Pelaporan Kebakaran',
  description: 'Sistem pelaporan cepat karhutla berbasis foto & GPS presisi otomatis. Respon cepat pemadam kebakaran & pemantauan peta sebaran real-time.',
  keywords: ['SIGAP', 'Pelaporan Kebakaran', 'Karhutla', 'Bencana', 'Geolokasi', 'BPBD', 'Pemadam Kebakaran'],
  authors: [{ name: 'Infinitera 2.0 Team' }],
  openGraph: {
    title: 'SIGAP — Sistem Pelaporan Kebakaran Karhutla',
    description: 'Laporkan kejadian kebakaran lahan & hutan secara presisi via GPS browser dan foto metadata EXIF.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${spaceMono.variable}`}
    >
      <body className="bg-[#FFF9F2] text-[#000000] antialiased min-h-screen flex flex-col selection:bg-[#000000] selection:text-[#FFFFFF]">
        <LoadingProvider>
          <Navbar />
          <main className="flex-1 w-full flex flex-col">{children}</main>
          <Footer />
        </LoadingProvider>
      </body>
    </html>
  );
}
