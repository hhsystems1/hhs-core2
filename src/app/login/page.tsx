'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Loader2 } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemo = () => {
    window.localStorage.setItem('hhs-demo-mode', '1');
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add your keys to .env.local, or continue in demo mode.');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
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
        setError(
          'Check your email to confirm your account. If there is no confirmation requirement, try signing in.'
        );
        setMode('signin');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
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
          <p className="text-sm text-slate-500 mt-1">Sign in to your Mission Control</p>
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
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
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