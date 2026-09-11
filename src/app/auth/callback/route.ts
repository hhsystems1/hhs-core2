import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const safeNext = next.startsWith('/') ? next : '/dashboard';
  const redirectUrl = new URL(safeNext, request.nextUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
