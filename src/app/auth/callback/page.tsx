'use client';

import { useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function getSafeNext(next: string | null) {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

function redirectToLogin(error: string, next: string) {
  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('error', error);
  loginUrl.searchParams.set('next', next);
  window.location.replace(loginUrl.toString());
}

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const next = getSafeNext(searchParams.get('next'));
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');

      if (errorDescription) {
        redirectToLogin(errorDescription, next);
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        redirectToLogin('Missing authentication code. Please sign in again.', next);
        return;
      }

      if (!isSupabaseConfigured) {
        redirectToLogin('Supabase is not configured. Add your project URL and anon key before signing in.', next);
        return;
      }

      const supabase = createClient({ auth: { detectSessionInUrl: false } });
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        redirectToLogin(error.message, next);
        return;
      }

      window.localStorage.removeItem('hhs-demo-mode');
      window.location.replace(next);
    };

    void handleCallback();
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-600">Finishing sign in...</p>
    </div>
  );
}
