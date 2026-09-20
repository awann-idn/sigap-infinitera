import { NextResponse } from 'next/server';
import {
  verifyStaffCredentials,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const verification = await verifyStaffCredentials(email, password);

    if (!verification.success || !verification.user) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Email atau password petugas tidak valid' },
        { status: 401 }
      );
    }

    const user = verification.user;
    const sessionToken = await createSessionToken(user);

    const response = NextResponse.json({ success: true, user });

    // Set secure HTTP-only cookie for session persistence and middleware validation
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses autentikasi petugas' },
      { status: 500 }
    );
  }
}
