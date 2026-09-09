'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  BookOpen,
  Map as MapIcon,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppData } from '@/lib/data/useAppData';
import { useOrgStore } from '@/lib/store/orgStore';
import { useCrmStore } from '@/lib/store/crmStore';
import { useTaskStore } from '@/lib/store/taskStore';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'CRM', href: '/crm', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Knowledge', href: '/knowledge', icon: BookOpen },
  { name: 'Mission Map', href: '/mission-map', icon: MapIcon },
];

const PRIMARY_TABS = NAVIGATION.filter((n) =>
  ['/dashboard', '/crm', '/tasks', '/calendar', '/mission-map'].includes(n.href)
);

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const contacts = useCrmStore((s) => s.contacts);
  const tasks = useTaskStore((s) => s.tasks);

  const q = query.trim().toLowerCase();
  const contactResults =
    q.length > 0
      ? contacts
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.company.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];
  const taskResults =
    q.length > 0
      ? tasks
          .filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
          .slice(0, 4)
      : [];
  const hasResults = contactResults.length > 0 || taskResults.length > 0;

  const go = (href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  };

  return (
    <div
      className="relative w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search contacts, tasks..."
        className="w-full pl-9 pr-4 py-2 bg-slate-100 focus:bg-white border-transparent focus:ring-2 focus:ring-blue-500 rounded-full text-sm transition-all outline-none"
      />
      {open && q.length > 0 && (
        <div className="absolute top-full right-0 left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {!hasResults && <p className="px-4 py-4 text-sm text-slate-400 italic">No matches found.</p>}
          {contactResults.length > 0 && (
            <div className="py-1">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contacts</p>
              {contactResults.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={() => go(`/crm`)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-left"
                >
                  <span className="text-sm font-medium text-slate-800">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.company}</span>
                </button>
              ))}
            </div>
          )}
          {taskResults.length > 0 && (
            <div className="py-1 border-t border-slate-100">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</p>
              {taskResults.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={() => go('/tasks')}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-left"
                >
                  <span className="text-sm font-medium text-slate-800">{t.title}</span>
                  <span className="text-xs text-slate-400">{t.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const tasks = useTaskStore((s) => s.tasks);
  const today = new Date().toISOString().slice(0, 10);

  const openTask = tasks.filter((t) => t.status !== 'completed');
  const overdue = openTask.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = openTask.filter((t) => t.dueDate === today);
  const count = overdue.length + dueToday.length;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900 text-sm">Notifications</div>
          <div className="max-h-72 overflow-y-auto py-1">
            {count === 0 && <p className="px-4 py-4 text-sm text-slate-400 italic">You are all caught up.</p>}
            {overdue.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  <p className="text-xs text-red-500">Overdue · {t.dueDate}</p>
                </div>
              </div>
            ))}
            {dueToday.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  <p className="text-xs text-amber-600">Due today</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ panelClassName }: { panelClassName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const profile = useOrgStore((s) => s.profile);
  const orgs = useOrgStore((s) => s.orgs);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const signOut = useOrgStore((s) => s.signOut);

  const avatarSeed = profile?.email ?? 'user';

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 shrink-0" aria-label="Account menu">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
          alt="Profile"
          className="w-9 h-9 rounded-full border border-slate-300 bg-white"
        />
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden',
            panelClassName
          )}
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || 'Mission Operator'}</p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
          </div>

          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace</p>
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setActiveOrg(org.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm hover:bg-slate-50',
                  org.id === activeOrgId ? 'text-blue-600 font-semibold' : 'text-slate-700'
                )}
              >
                <span className="truncate">{org.name}</span>
                {org.id === activeOrgId && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>

          <div className="py-1">
            {[
              { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
              { name: 'Settings', href: '/settings', icon: Settings },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 text-left',
                  isActive(item.href) ? 'text-blue-600 font-medium' : 'text-slate-700'
                )}
              >
                <item.icon className="w-4 h-4 text-slate-400" />
                {item.name}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupSplash({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
          H
        </div>
        <h1 className="text-xl font-bold text-slate-900">HHS Core 2</h1>
        <p className="text-sm text-slate-500 mt-2">
          Add your Supabase credentials to <code className="text-blue-600 font-mono">.env.local</code> to unlock the
          full experience.
        </p>
        <code className="block w-full bg-slate-900 text-slate-100 text-xs rounded-xl px-3 py-2 mt-4 text-left font-mono">
          NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
        </code>
        <button
          onClick={onEnable}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Database className="w-4 h-4" />
          Continue in demo mode
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 mt-3">
          Demo mode uses local sample data so you can browse the UI now.
        </p>
      </div>
    </div>
  );
}

function LoadingSplash() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 mx-auto mb-3 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg">
          H
        </div>
        <p className="text-sm font-medium text-slate-600">Loading Mission Control...</p>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authUserId } = useAppData();
  const { profile } = useOrgStore();
  const [demoMode, setDemoMode] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hhs-demo-mode') === '1'
  );

  const enableDemo = () => {
    window.localStorage.setItem('hhs-demo-mode', '1');
    setDemoMode(true);
  };

  // Session handling
  const isPublicRoute = pathname === '/login';

  if (isPublicRoute) return <>{children}</>;

  const authed =
    (isSupabaseConfigured && Boolean(authUserId)) || (!isSupabaseConfigured && demoMode);

  if (!authed) {
    if (!isSupabaseConfigured) return <SetupSplash onEnable={enableDemo} />;
    return <LoadingSplash />;
  }

  const isMissionMap = pathname === '/mission-map';
  const showSearch = !isMissionMap;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 text-slate-300 flex-col border-r border-slate-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">H</div>
          <span className="font-bold text-xl tracking-tight text-white">HHS CORE 2</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                <span className="text-sm font-medium">{item.name}</span>
              </a>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="min-w-0 w-[calc(100%-48px)]">
            <p className="text-xs font-medium text-slate-400 truncate">{profile?.full_name || 'Operator'}</p>
            <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
          </div>
          <ProfileMenu />
        </div>
      </aside>

      {/* ---------- Main column ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 gap-3 relative z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              H
            </div>
            <span className="font-bold text-sm tracking-tight">HHS CORE 2</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsMenu />
            <ProfileMenu />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex h-16 shrink-0 bg-white border-b border-slate-200 items-center justify-between px-8">
          <div className="w-96 max-w-full relative">
            {showSearch && <GlobalSearch />}
          </div>
          <div className="flex items-center gap-4">
            <NotificationsMenu />
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{profile?.full_name || 'Admin User'}</p>
                <p className="text-xs text-slate-500 leading-tight">Mission Control</p>
              </div>
              <ProfileMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-y-auto">
          <div
            className={cn(
              isMissionMap ? 'h-full overflow-hidden p-0 md:p-6' : 'min-h-full p-4 sm:p-6 lg:p-8 pb-24 md:pb-8'
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ---------- Mobile bottom tab bar ---------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 flex items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {PRIMARY_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name.split(' ')[0]}
            </a>
          );
        })}
      </nav>
    </div>
  );
}