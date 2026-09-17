import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const DEMO_EMAIL = 'petugas@sigap.go.id';
const DEMO_PASSWORD = 'sigap2026';

const DEMO_USER = {
  id: 'a0000000-0000-0000-0000-000000000001',
  nama: 'Komandan Budi Santoso',
  email: DEMO_EMAIL,
  institusi: 'Manggala Agni / BPBD Sumatera Selatan',
  role: 'ADMIN',
};

interface PetugasProfile {
  id: string;
  nama: string;
  email: string;
  institusi: string;
  role: string;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        return NextResponse.json(
          { success: false, error: error?.message || 'Email atau password petugas tidak valid' },
          { status: 401 }
        );
      }

      const profile: PetugasProfile = {
        id: data.user.id,
        nama: (data.user.user_metadata?.nama as string) || email.split('@')[0],
        email: data.user.email || email,
        institusi: (data.user.user_metadata?.institusi as string) || 'BPBD Sumatera Selatan',
        role: (data.user.user_metadata?.role as string) || 'PETUGAS_LAPANGAN',
      };

      const { data: petugas } = await supabase
        .from('petugas')
        .select('id, nama, email, institusi, role')
        .eq('email', email)
        .maybeSingle();

      if (petugas) {
        Object.assign(profile, petugas);
      }

      return NextResponse.json({ success: true, user: profile });
    }

    // Fallback demo login when Supabase env is not configured.
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      return NextResponse.json({ success: true, user: DEMO_USER });
    }

    return NextResponse.json(
      { success: false, error: 'Email atau password petugas tidak valid' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal login' },
      { status: 500 }
    );
  }
}
