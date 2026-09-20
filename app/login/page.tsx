'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Key } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { Input } from '@/components/Input';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function LoginPage() {
  const router = useRouter();
  const supabaseReady = isSupabaseConfigured();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('sigap_auth', JSON.stringify(data.user));
        router.push('/dashboard');
        router.refresh();
      } else {
        throw new Error(data.error || 'Email atau password salah');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full py-16 flex items-center justify-center flex-1 bg-[#FFF9F2]">
      <div className="max-w-md w-full px-5">
        <Card className="p-8 border-2 border-[#000000]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-[#000000]">
              <div className="w-10 h-10 bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[20px] text-[#000000]">
                  AKSES PETUGAS
                </span>
                <span className="font-mono text-[11px] text-[#272E3B] uppercase font-bold">
                  DASHBOARD VERIFIKASI BENCANA
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#DC2626]/10 border border-[#DC2626] text-[#DC2626] font-mono text-[12px] font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label="EMAIL PETUGAS RESMI"
                type="email"
                placeholder="nama@instansi.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="PASSWORD"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" fullWidth disabled={loading} className="mt-2">
                {loading ? 'MEMVERIFIKASI KREDENSIAL...' : 'MASUK KE DASHBOARD →'}
              </Button>
            </form>

            <div className="p-4 bg-[#F3E6D5] border border-[#000000] font-mono text-[11px] text-[#272E3B] flex flex-col gap-1 leading-relaxed">
              <div className="text-[#000000] font-bold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#800020]" /> AKSES TERBATAS:
              </div>
              <div>Halaman ini khusus untuk personel operasional BPBD Sumatera Selatan dan regu Manggala Agni. Sesi diautentikasi aman melalui server.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
