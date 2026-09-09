import { type NextRequest, type NextProxy } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

export const proxy: NextProxy = (request: NextRequest) => {
  return updateSession(request);
};

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};