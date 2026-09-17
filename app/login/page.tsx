'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Key } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { Input } from '@/components/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('petugas@sigap.go.id');
  const [password, setPassword] = useState('sigap2026');
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
        // Store auth token in cookie / localStorage
        localStorage.setItem('sigap_auth', JSON.stringify(data.user));
        router.push('/dashboard');
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
    <div className="w-full py-16 flex items-center justify-center flex-1 bg-[#EDEDED]">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="PASSWORD"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" fullWidth disabled={loading} className="mt-2">
                {loading ? 'MEMVERIFIKASI KREDENSIAL...' : 'MASUK KE DASHBOARD →'}
              </Button>
            </form>

            <div className="p-4 bg-[#EDEDED] border border-[#000000] font-mono text-[12px] text-[#000000] flex flex-col gap-1">
              <div className="text-[#000000] font-bold flex items-center gap-1">
                <Key className="w-4 h-4 text-[#000000]" /> AKUN DEMO PETUGAS:
              </div>
              <div>Email: <span className="text-[#000000] font-bold">petugas@sigap.go.id</span></div>
              <div>Pass: <span className="text-[#000000] font-bold">sigap2026</span></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
