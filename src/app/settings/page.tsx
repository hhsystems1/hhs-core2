'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Building2, Users, Mail, Info, Shield, Bot, KeyRound } from 'lucide-react';
import { useOrgStore } from '@/lib/store/orgStore';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { AgentProviderConfigRow } from '@/lib/supabase/types';

interface Member {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  email: string;
  full_name: string;
}

type AgentProvider = AgentProviderConfigRow['provider'];

const PROVIDER_DEFAULTS: Record<AgentProvider, { name: string; baseUrl: string; model: string; needsKey: boolean }> = {
  openai: { name: 'ChatGPT / OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', needsKey: true },
  openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', needsKey: true },
  'ollama-local': { name: 'Ollama Local', baseUrl: 'http://localhost:11434', model: 'llama3.1', needsKey: false },
  'ollama-cloud': { name: 'Ollama Cloud', baseUrl: 'https://ollama.com/api', model: 'gpt-oss:120b-cloud', needsKey: true },
};

const DEFAULT_SYSTEM_PROMPT =
  'You are the HHS Core 2 mission control agent. Be concise, practical, and execute the workflow step you are assigned.';

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

function WorkspaceNameEditor({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    const ok = await onSave(name);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      <button
        onClick={save}
        disabled={busy}
        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
      >
        {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { profile, orgs, activeOrgId, refreshOrgs } = useOrgStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [agentConfig, setAgentConfig] = useState<AgentProviderConfigRow | null>(null);
  const [agentMsg, setAgentMsg] = useState<string | null>(null);

  const activeOrg = React.useMemo(() => orgs.find((o) => o.id === activeOrgId) ?? null, [orgs, activeOrgId]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!activeOrgId || !isSupabaseConfigured) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('org_members')
        .select('user_id, role, profiles!inner(id, email, full_name)')
        .eq('org_id', activeOrgId);
      if (error || !data || !active) return;
      setMembers(
        data.map((m) => {
          const p = m.profiles as unknown as { id: string; email: string; full_name: string | null };
          return { user_id: m.user_id, role: m.role, email: p.email, full_name: p.full_name ?? '' };
        })
      );
    }
    run();
    return () => {
      active = false;
    };
  }, [activeOrgId]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!activeOrgId || !isSupabaseConfigured) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('agent_provider_configs')
        .select('*')
        .eq('org_id', activeOrgId)
        .eq('is_default', true)
        .maybeSingle();
      if (active) setAgentConfig(data ?? null);
    }
    run();
    return () => {
      active = false;
    };
  }, [activeOrgId]);

  const saveOrgName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (!isSupabaseConfigured || !activeOrgId) return false;
    const supabase = createClient();
    const { error } = await supabase.from('orgs').update({ name: trimmed }).eq('id', activeOrgId);
    if (error) return false;
    refreshOrgs();
    return true;
  };

  const invite = async () => {
    setInviteMsg(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!isSupabaseConfigured) {
      setInviteMsg('Invites work once Supabase is configured.');
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('id, email').eq('email', email).maybeSingle();
    if (data) {
      const { error } = await supabase
        .from('org_members')
        .insert({ org_id: activeOrgId!, user_id: data.id, role: 'member' });
      setInviteMsg(
        error
          ? error.message.includes('duplicate key')
            ? 'That user is already a member.'
            : error.message
          : `Added ${email} to the workspace.`
      );
      if (!error) {
        setInviteEmail('');
        setMembers([]);
        setActiveOrgIdBump((n) => n + 1);
      }
    } else {
      setInviteMsg(`No account found for ${email}. Invite them to the app first, then add them here.`);
    }
  };

  // Re-fetch members after an invite — keyed off a local bump counter.
  const [orgBump, setActiveOrgIdBump] = useState(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-slate-400" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm">Workspace, members and preferences.</p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-slate-900 text-sm">Workspace</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Workspace name</label>
            <WorkspaceNameEditor
              key={`${activeOrgId ?? 'none'}-${activeOrg?.name ?? ''}`}
              initialName={activeOrg?.name ?? ''}
              onSave={saveOrgName}
            />
          </div>
        </div>
      </section>

      <AgentProviderSettings
        key={agentConfig?.id ?? 'new-agent-provider'}
        activeOrgId={activeOrgId}
        config={agentConfig}
        message={agentMsg}
        onMessage={setAgentMsg}
        onSaved={setAgentConfig}
      />

      <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-slate-900 text-sm">Members</h2>
        </div>
        <div className="p-4 sm:p-6">
          {members.length === 0 && !isSupabaseConfigured ? (
            <p className="text-sm text-slate-400 italic">Member management becomes available once Supabase is configured.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.length === 0 && <p className="text-sm text-slate-400 italic py-2">No members yet.</p>}
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                    {(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      <Mail size={11} /> {m.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full',
                      m.role === 'owner'
                        ? 'bg-blue-50 text-blue-600'
                        : m.role === 'admin'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Invite by email
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className={inputClass}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
              <button
                onClick={invite}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
              >
                Add member
              </button>
            </div>
            {inviteMsg && <p className="text-xs text-slate-500">{inviteMsg}</p>}
          </div>

          {/* Remount members list when membership changes */}
          <MembersReloader key={orgBump} activeOrgId={activeOrgId} onLoaded={setMembers} />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-slate-900 text-sm">Profile</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Name</span>
            <span className="text-slate-800 font-medium">{profile?.full_name || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Email</span>
            <span className="text-slate-800 font-medium">{profile?.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Storage
            </span>
            <span className={cn('font-medium', isSupabaseConfigured ? 'text-green-600' : 'text-amber-600')}>
              {isSupabaseConfigured ? 'Supabase' : 'Setup required'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function AgentProviderSettings({
  activeOrgId,
  config,
  message,
  onMessage,
  onSaved,
}: {
  activeOrgId: string | null;
  config: AgentProviderConfigRow | null;
  message: string | null;
  onMessage: (message: string | null) => void;
  onSaved: (config: AgentProviderConfigRow | null) => void;
}) {
  const [provider, setProvider] = useState<AgentProvider>(config?.provider ?? 'openai');
  const [model, setModel] = useState(config?.model ?? PROVIDER_DEFAULTS.openai.model);
  const [baseUrl, setBaseUrl] = useState(config?.base_url ?? PROVIDER_DEFAULTS.openai.baseUrl);
  const [apiKey, setApiKey] = useState(config?.api_key ?? '');
  const [systemPrompt, setSystemPrompt] = useState(config?.system_prompt ?? DEFAULT_SYSTEM_PROMPT);
  const [busy, setBusy] = useState(false);

  const applyProviderDefaults = (nextProvider: AgentProvider) => {
    const defaults = PROVIDER_DEFAULTS[nextProvider];
    setProvider(nextProvider);
    setBaseUrl(defaults.baseUrl);
    setModel(defaults.model);
    if (!defaults.needsKey) setApiKey('');
    onMessage(null);
  };

  const save = async () => {
    onMessage(null);
    if (!activeOrgId || !isSupabaseConfigured) {
      onMessage('Configure Supabase and sign in before saving agent providers.');
      return;
    }

    const defaults = PROVIDER_DEFAULTS[provider];
    if (defaults.needsKey && !apiKey.trim()) {
      onMessage('This provider needs an API key.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const payload = {
      org_id: activeOrgId,
      name: defaults.name,
      provider,
      base_url: baseUrl.trim() || defaults.baseUrl,
      model: model.trim() || defaults.model,
      api_key: defaults.needsKey ? apiKey.trim() : null,
      system_prompt: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
      is_default: true,
    };

    if (config) {
      const { data, error } = await supabase
        .from('agent_provider_configs')
        .update(payload)
        .eq('org_id', activeOrgId)
        .eq('id', config.id)
        .select('*')
        .single();
      onMessage(error ? error.message : 'Agent provider saved.');
      if (data) onSaved(data);
    } else {
      const { data, error } = await supabase.from('agent_provider_configs').insert(payload).select('*').single();
      onMessage(error ? error.message : 'Agent provider saved.');
      if (data) onSaved(data);
    }

    setBusy(false);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <Bot className="w-4 h-4 text-blue-600" />
        <h2 className="font-bold text-slate-900 text-sm">Agent Provider</h2>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Provider</label>
            <select className={inputClass} value={provider} onChange={(e) => applyProviderDefaults(e.target.value as AgentProvider)}>
              {Object.entries(PROVIDER_DEFAULTS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Model</label>
            <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Base URL</label>
          <input className={inputClass} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        {PROVIDER_DEFAULTS[provider].needsKey && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <KeyRound className="w-3.5 h-3.5" /> API key
            </label>
            <input className={inputClass} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Runner system prompt</label>
          <textarea className={cn(inputClass, 'min-h-28 resize-y')} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        </div>
        {message && <p className="text-xs text-slate-500">{message}</p>}
        <button
          onClick={save}
          disabled={busy}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {busy ? 'Saving...' : 'Save agent provider'}
        </button>
      </div>
    </section>
  );
}

function MembersReloader({
  activeOrgId,
  onLoaded,
}: {
  activeOrgId: string | null;
  onLoaded: (members: Member[]) => void;
}) {
  useEffect(() => {
    let active = true;
    async function run() {
      if (!activeOrgId || !isSupabaseConfigured) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('org_members')
        .select('user_id, role, profiles!inner(id, email, full_name)')
        .eq('org_id', activeOrgId);
      if (error || !data || !active) return;
      onLoaded(
        data.map((m) => {
          const p = m.profiles as unknown as { id: string; email: string; full_name: string | null };
          return { user_id: m.user_id, role: m.role, email: p.email, full_name: p.full_name ?? '' };
        })
      );
    }
    run();
    return () => {
      active = false;
    };
  }, [activeOrgId, onLoaded]);
  return null;
}
