'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, Loader2 } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'signin';
    return new URLSearchParams(window.location.search).get('mode') === 'reset' ? 'reset' : 'signin';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (params.get('mode') === 'reset' && data.session) setRecoveryReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (params.get('mode') === 'reset' && session)) {
        setMode('reset');
        setRecoveryReady(Boolean(session));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const title = useMemo(() => {
    if (mode === 'signup') return 'Create your account';
    if (mode === 'forgot') return 'Reset your password';
    if (mode === 'reset') return 'Choose a new password';
    return 'Sign in to Mission Control';
  }, [mode]);

  const resetState = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleDemo = () => {
    window.localStorage.setItem('hhs-demo-mode', '1');
    router.push('/dashboard');
  };

  const redirectTo = (next: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add your keys to .env.local, or continue in demo mode.');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Full name is required.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: redirectTo('/dashboard'),
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setMessage('Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    }

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo('/login?mode=reset'),
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Password reset email sent. Open the link in that email to choose a new password.');
      }
    }

    if (mode === 'reset') {
      if (!recoveryReady) {
        setError('Open the password reset link from your email before setting a new password.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Password updated. You can continue to your dashboard.');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 700);
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
        <div className="p-8 pb-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
            H
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HHS Core 2</h1>
          <p className="text-sm text-slate-500 mt-1">{title}</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mx-8 mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-800">
            <p className="font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Supabase not configured
            </p>
            <p className="mt-1">
              Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="font-mono">.env.local</code>.
            </p>
          </div>
        )}

        <div className="px-8 pb-8">
          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => resetState(m)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                    mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  )}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              onClick={() => resetState('signin')}
              className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className={inputClass}
                />
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {mode === 'reset' ? 'New password' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
            )}

            {mode === 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
            )}

            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => resetState('forgot')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </button>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
            {message && <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signup'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : mode === 'reset'
                    ? 'Update password'
                    : 'Sign in'}
            </button>
          </form>

          {!isSupabaseConfigured && (
            <button
              onClick={handleDemo}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Database className="w-4 h-4" />
              Continue in demo mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
