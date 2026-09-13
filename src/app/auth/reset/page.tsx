'use client';

import { useEffect } from 'react';

export default function AuthResetPage() {
  useEffect(() => {
    window.location.replace(`/login?mode=reset${window.location.hash}`);
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-600">Opening password reset...</p>
    </div>
  );
}
