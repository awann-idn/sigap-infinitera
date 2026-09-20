import { NextResponse } from 'next/server';
import { validateStaffSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const isValid = await validateStaffSession(request);
    return NextResponse.json({ authenticated: isValid });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
