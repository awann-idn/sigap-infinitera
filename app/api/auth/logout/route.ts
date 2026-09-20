import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase sign out failed:', error);
    }
  }

  const response = NextResponse.json({ success: true });

  // Clear HTTP-only session cookie
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
