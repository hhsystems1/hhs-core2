'use client';

import React, { useState } from 'react';
import { BookOpen, FileText, FolderGit2, GraduationCap, Plus, Search, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { name: 'Standard Operating Procedures', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', count: 0 },
  { name: 'Training & Onboarding', icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-50', count: 0 },
  { name: 'Client Wisdom', icon: FolderGit2, color: 'text-purple-600', bg: 'bg-purple-50', count: 0 },
  { name: 'Internal Wiki', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', count: 0 },
];

export default function KnowledgePage() {
  const [query, setQuery] = useState('');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500 text-sm">SOPs, training material and client wisdom.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm text-sm shrink-0">
          <Plus size={16} />
          Add doc
        </button>
      </div>

      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the knowledge base..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cat.bg)}>
                <cat.icon className={cn('w-5 h-5', cat.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate">{cat.name}</h3>
                <p className="text-xs text-slate-400">{cat.count} documents</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Document vault coming in Phase 4
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}