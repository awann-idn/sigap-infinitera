import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface PetugasUser {
  id: string;
  nama: string;
  email: string;
  institusi: string;
  role: string;
}

// Default staff officer profile
export const DEMO_PETUGAS: PetugasUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  nama: 'Komandan Budi Santoso',
  email: 'petugas@sigap.go.id',
  institusi: 'Manggala Agni / BPBD Sumatera Selatan',
  role: 'ADMIN',
};

// Bcrypt hash for default password 'sigap2026'
// Never stored as plaintext in code or sent to frontend
export const DEFAULT_STAFF_PASSWORD_HASH =
  process.env.STAFF_PASSWORD_HASH ||
  '$2b$10$2Bxvm5z73AGUU91bcjxZV.6B6MSxCD0ck6yadNEgqRKxgmhcOjNBK';

export const SESSION_SECRET =
  process.env.SESSION_SECRET || 'sigap-karhutla-sumsel-auth-secret-key-2026';
export const SESSION_COOKIE_NAME = 'sigap_session';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

interface SessionPayload {
  user: PetugasUser;
  exp: number; // unix timestamp in ms
}

/**
 * Creates a signed HMAC-SHA256 session token using Web Crypto API.
 */
export async function createSessionToken(user: PetugasUser): Promise<string> {
  const payload: SessionPayload = {
    user,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${payloadStr}.${signature}`;
}

/**
 * Validates a session token's signature and expiration using Web Crypto API.
 */
export async function verifySessionToken(token: string): Promise<PetugasUser | null> {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) return null;

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf-8')
    );

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
}

/**
 * Verifies staff credentials against bcrypt hash or Supabase Auth.
 */
export async function verifyStaffCredentials(
  email: string,
  passwordPlain: string
): Promise<{ success: boolean; user?: PetugasUser; error?: string }> {
  if (!email || !passwordPlain) {
    return { success: false, error: 'Email dan password wajib diisi' };
  }

  // 1. Supabase Auth verification if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordPlain,
      });

      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'Kredensial petugas tidak valid',
        };
      }

      const profile: PetugasUser = {
        id: data.user.id,
        nama: (data.user.user_metadata?.nama as string) || email.split('@')[0],
        email: data.user.email || email,
        institusi:
          (data.user.user_metadata?.institusi as string) || 'BPBD Sumatera Selatan',
        role: (data.user.user_metadata?.role as string) || 'PETUGAS_LAPANGAN',
      };

      return { success: true, user: profile };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memverifikasi akun petugas' };
    }
  }

  // 2. Local bcrypt password verification (never compares plaintext)
  if (email.toLowerCase().trim() === DEMO_PETUGAS.email.toLowerCase()) {
    const isMatch = await bcrypt.compare(passwordPlain, DEFAULT_STAFF_PASSWORD_HASH);
    if (isMatch) {
      return { success: true, user: DEMO_PETUGAS };
    }
  }

  return { success: false, error: 'Email atau password petugas salah' };
}

/**
 * Server-side session validation for Route Handlers and Server Actions.
 */
export async function validateStaffSession(request?: Request): Promise<boolean> {
  // 1. Check local session cookie from request headers or Next.js cookies
  let token: string | undefined;

  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    try {
      token = cookies().get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // ignore
    }
  }

  if (token) {
    const validUser = await verifySessionToken(token);
    if (validUser) return true;
  }

  // 2. Check Supabase session if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) return true;
    } catch {
      return false;
    }
  }

  return false;
}
