'use client';

import { useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function AuthResetPage() {
  useEffect(() => {
    const handleResetLink = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');

      if (errorDescription) {
        window.location.replace(`/login?mode=forgot&error=${encodeURIComponent(errorDescription)}`);
        return;
      }

      const code = searchParams.get('code');
      if (code && isSupabaseConfigured) {
        const { error } = await createClient({ auth: { detectSessionInUrl: false } }).auth.exchangeCodeForSession(code);
        if (error) {
          window.location.replace(`/login?mode=forgot&error=${encodeURIComponent(error.message)}`);
          return;
        }

        window.location.replace('/login?mode=reset');
        return;
      }

      window.location.replace(`/login?mode=reset${window.location.hash}`);
    };

    void handleResetLink();
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-600">Opening password reset...</p>
    </div>
  );
}
