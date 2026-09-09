'use client';

import React from 'react';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Automatically redirect users from the root / to the dashboard
    window.location.href = '/dashboard';
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <h1 className="text-xl font-semibold text-slate-900">Loading Mission Control...</h1>
      </div>
    </div>
  );
}
