
'use client';
import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Calendar</h1>
          <p className="text-slate-500">Upcoming deadlines and milestones.</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
          <CalendarIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Calendar View Coming Soon</h2>
        <p className="text-slate-500 max-w-md mt-2">We are implementing the full visual calendar grid. For now, please check the Tasks page for upcoming deadlines.</p>
      </div>
    </div>
  );
}
