import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Verification check for demo responder credentials
    if (email === 'petugas@sigap.go.id' && password === 'sigap2026') {
      return NextResponse.json({
        success: true,
        user: {
          id: 'a0000000-0000-0000-0000-000000000001',
          nama: 'Komandan Budi Santoso',
          email: 'petugas@sigap.go.id',
          institusi: 'Manggala Agni / BPBD Sumatera Selatan',
          role: 'ADMIN',
        },
      });
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
