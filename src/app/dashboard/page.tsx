
'use client';
import React from 'react';
import { LayoutDashboard, AlertCircle, Users, Target } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mission Control</h1>
          <p className="text-slate-500">Welcome back. Here is your system overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Tasks', value: '12', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Open Leads', value: '8', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Critical Alerts', value: '2', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Active Projects', value: '3', icon: LayoutDashboard, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Priority Queue</h3>
          <div className="space-y-3">
            <p className="text-slate-500 italic text-sm">Loading critical tasks...</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Database</span>
              <span className="text-green-600 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Agent Core</span>
              <span className="text-green-600 font-medium">Idle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
