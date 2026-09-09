'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X, CheckCircle2, Circle } from 'lucide-react';
import { useTaskStore, type Task } from '@/lib/store/taskStore';
import { useOrgStore } from '@/lib/store/orgStore';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(date: string) {
  const d = new Date(date + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function CalendarPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const todayKey = new Date().toISOString().slice(0, 10);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    });
    return map;
  }, [tasks]);

  const monthLabel = new Date(viewDate.year, viewDate.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const cells = useMemo(() => {
    const first = new Date(viewDate.year, viewDate.month, 1);
    const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
    const lead = first.getDay();
    const items: { key: string; date: string; inMonth: boolean }[] = [];

    const prevYear = viewDate.month === 0 ? viewDate.year - 1 : viewDate.year;
    const prevMonth = viewDate.month === 0 ? 11 : viewDate.month - 1;
    const daysInPrev = new Date(prevYear, prevMonth + 1, 0).getDate();

    for (let i = lead - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      items.push({
        key: `${prevYear}-${prevMonth}-${day}`,
        date: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        inMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      items.push({
        key: `${viewDate.year}-${viewDate.month}-${d}`,
        date: `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        inMonth: true,
      });
    }

    while (items.length % 7 !== 0) {
      const last = items[items.length - 1];
      const next = new Date(last.date + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      items.push({
        key: `next-${items.length}`,
        date: next.toISOString().slice(0, 10),
        inMonth: false,
      });
    }

    return items;
  }, [viewDate]);

  const selectedTasks = selectedDay ? (tasksByDate.get(selectedDay) ?? []) : [];

  const moveMonth = (delta: number) => {
    setViewDate((v) => {
      const m = v.month + delta;
      const year = Math.floor(m / 12);
      return { year: v.year + year, month: ((m % 12) + 12) % 12 };
    });
  };

  const goToday = () => {
    const now = new Date();
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(todayKey);
  };

  const toggleTask = (task: Task) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(activeOrgId ?? '', task.id, { status: next });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Calendar</h1>
          <p className="text-slate-500 text-sm">Milestones and deadlines across your workspace.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => moveMonth(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 capitalize">{monthLabel}</h2>
            <button
              onClick={() => moveMonth(1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayTasks = tasksByDate.get(cell.date) ?? [];
            const isToday = cell.date === todayKey;
            const isSelected = cell.date === selectedDay;
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDay(selectedDay === cell.date ? null : cell.date)}
                className={cn(
                  'min-h-[52px] sm:min-h-[92px] border-t border-l border-slate-50 p-1 sm:p-2 text-left align-top transition-colors first:border-l-0',
                  !cell.inMonth && 'bg-slate-50/60',
                  isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full',
                    isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                  )}
                >
                  {Number(cell.date.slice(8))}
                </span>
                <div className="mt-1 hidden sm:flex flex-col gap-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        'truncate text-[10px] px-1.5 py-0.5 rounded font-medium',
                        t.status === 'completed'
                          ? 'bg-slate-100 text-slate-400 line-through'
                          : t.priority === 'high'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-blue-50 text-blue-600'
                      )}
                    >
                      {t.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-slate-400 pl-1">+{dayTasks.length - 3} more</span>
                  )}
                </div>
                <div className="mt-1 sm:hidden flex gap-0.5">
                  {dayTasks.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        t.status === 'completed' ? 'bg-slate-300' : t.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'
                      )}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              {startOfDay(selectedDay)?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="p-1.5 hover:bg-slate-100 rounded-full" aria-label="Close">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No tasks due on this day.</p>
            ) : (
              <ul className="space-y-2">
                {selectedTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <button onClick={() => toggleTask(t)} className="mt-0.5 text-slate-400 hover:text-blue-500 shrink-0" aria-label="Toggle completion">
                      {t.status === 'completed' ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800')}>
                        {t.title}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock size={11} />
                        {t.assignee || 'Unassigned'} · {t.priority}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}