import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeNext(next: string | null) {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const next = getSafeNext(url.searchParams.get('next'));

  if (!code) {
    const loginUrl = new URL('/login', request.nextUrl.origin);
    loginUrl.searchParams.set('error', 'Missing authentication code. Please sign in again.');
    loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL('/login', request.nextUrl.origin);
    loginUrl.searchParams.set('error', error.message);
    loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
