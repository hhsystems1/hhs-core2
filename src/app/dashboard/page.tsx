'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Users, Target, LayoutDashboard, Clock, ArrowRight, CalendarDays, Database, Wifi } from 'lucide-react';
import { useTaskStore } from '@/lib/store/taskStore';
import { useCrmStore } from '@/lib/store/crmStore';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useTaskStore((s) => s.projects);
  const contacts = useCrmStore((s) => s.contacts);

  const today = new Date().toISOString().slice(0, 10);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);
  const openLeads = useMemo(() => contacts.filter((c) => c.status === 'lead'), [contacts]);
  const activeProjects = useMemo(() => projects.filter((p) => p.status === 'active'), [projects]);

  const critical = useMemo(
    () =>
      activeTasks.filter(
        (t) => t.priority === 'high' || (t.dueDate && t.dueDate < today)
      ).slice(0, 6),
    [activeTasks, today]
  );

  const stats = [
    { label: 'Active Tasks', value: activeTasks.length, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open Leads', value: openLeads.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Critical Alerts', value: critical.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Active Projects', value: activeProjects.length, icon: LayoutDashboard, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Mission Control</h1>
        <p className="text-slate-500 text-sm sm:text-base">Welcome back. Here is your live overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
            <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-3 sm:mb-4', stat.bg)}>
              <stat.icon className={cn('w-4 h-4 sm:w-5 sm:h-5', stat.color)} />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Priority Queue</h3>
            <Link href="/tasks" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {critical.length === 0 ? (
            <p className="text-slate-400 italic text-sm py-6 text-center">No critical tasks. You are all clear.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {critical.map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      task.dueDate && task.dueDate < today ? 'bg-red-500' : task.priority === 'high' ? 'bg-blue-500' : 'bg-slate-300'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {task.dueDate || 'No due date'} · {task.assignee || 'Unassigned'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0',
                      task.priority === 'high'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {task.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Database
                </span>
                <span className={cn('font-medium flex items-center gap-1.5', isSupabaseConfigured ? 'text-green-600' : 'text-amber-600')}>
                  <Wifi className="w-3.5 h-3.5" />
                  {isSupabaseConfigured ? 'Online' : 'Setup required'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Next Milestone
                </span>
                <span className="text-slate-700 font-medium">
                  {activeTasks.filter((t) => t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate ?? '—'}
                </span>
              </div>
            </div>
          </div>

          {activeProjects.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Project Progress</h3>
              <div className="space-y-3">
                {activeProjects.slice(0, 4).map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium truncate">{p.name}</span>
                      <span className="text-slate-400">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
