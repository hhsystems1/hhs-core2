'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Cpu,
  KeyRound,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatProvider = 'openai' | 'openrouter' | 'ollama-local' | 'ollama-cloud';
type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface ProviderSettings {
  provider: ChatProvider;
  openai: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  openrouter: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  ollamaLocal: {
    baseUrl: string;
    model: string;
  };
  ollamaCloud: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  systemPrompt: string;
}

type ActiveProviderSettings =
  | ProviderSettings['openai']
  | ProviderSettings['openrouter']
  | ProviderSettings['ollamaLocal']
  | ProviderSettings['ollamaCloud'];
type KeyedProviderSettings =
  | ProviderSettings['openai']
  | ProviderSettings['openrouter']
  | ProviderSettings['ollamaCloud'];

interface ActiveProviderUpdates {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const STORAGE_KEY = 'hhs-ai-provider-settings';

const DEFAULT_SETTINGS: ProviderSettings = {
  provider: 'openai',
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
  },
  ollamaLocal: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
  },
  ollamaCloud: {
    apiKey: '',
    baseUrl: 'https://ollama.com/api',
    model: 'gpt-oss:120b-cloud',
  },
  systemPrompt:
    'You are the HHS Core 2 mission control agent. Be concise, practical, and help the user move business operations forward.',
};

const PROVIDERS: Array<{
  id: ChatProvider;
  name: string;
  label: string;
  description: string;
  models: string[];
}> = [
  {
    id: 'openai',
    name: 'ChatGPT',
    label: 'OpenAI',
    description: 'Use OpenAI chat models with your own API key.',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    label: 'OpenRouter',
    description: 'Route through OpenRouter to use hosted models.',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct'],
  },
  {
    id: 'ollama-local',
    name: 'Ollama Local',
    label: 'Local',
    description: 'Call the Ollama daemon running on this machine.',
    models: ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5-coder'],
  },
  {
    id: 'ollama-cloud',
    name: 'Ollama Cloud',
    label: 'Cloud',
    description: 'Use Ollama cloud models through ollama.com with an API key.',
    models: ['gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'qwen3-coder:480b-cloud', 'deepseek-v3.1:671b-cloud'],
  },
];

function isChatProvider(value: unknown): value is ChatProvider {
  return value === 'openai' || value === 'openrouter' || value === 'ollama-local' || value === 'ollama-cloud';
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

function mergeSettings(value: unknown): ProviderSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const parsed = value as Partial<ProviderSettings>;
  const legacy = parsed as Partial<ProviderSettings> & {
    ollama?: ProviderSettings['ollamaLocal'];
  };
  const savedProvider = (value as { provider?: unknown }).provider;
  const provider = savedProvider === 'ollama' ? 'ollama-local' : isChatProvider(savedProvider) ? savedProvider : DEFAULT_SETTINGS.provider;

  return {
    provider,
    openai: { ...DEFAULT_SETTINGS.openai, ...(parsed.openai ?? {}) },
    openrouter: { ...DEFAULT_SETTINGS.openrouter, ...(parsed.openrouter ?? {}) },
    ollamaLocal: { ...DEFAULT_SETTINGS.ollamaLocal, ...(parsed.ollamaLocal ?? legacy.ollama ?? {}) },
    ollamaCloud: { ...DEFAULT_SETTINGS.ollamaCloud, ...(parsed.ollamaCloud ?? {}) },
    systemPrompt: parsed.systemPrompt ?? DEFAULT_SETTINGS.systemPrompt,
  };
}

function getProviderSettings(settings: ProviderSettings): ActiveProviderSettings {
  if (settings.provider === 'ollama-local') return settings.ollamaLocal;
  if (settings.provider === 'ollama-cloud') return settings.ollamaCloud;
  return settings[settings.provider];
}

function hasApiKeySettings(provider: ActiveProviderSettings): provider is KeyedProviderSettings {
  return 'apiKey' in provider;
}

function loadSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    return mergeSettings(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatPage() {
  const [settings, setSettings] = useState<ProviderSettings>(() => loadSettings());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: newId(),
      role: 'assistant',
      content: 'Agent chat is ready. Choose a provider, save your settings, and send the first mission.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const providerMeta = useMemo(
    () => PROVIDERS.find((provider) => provider.id === settings.provider) ?? PROVIDERS[0],
    [settings.provider]
  );

  const activeProvider = getProviderSettings(settings);
  const hasKey = settings.provider === 'ollama-local' || Boolean(hasApiKeySettings(activeProvider) && activeProvider.apiKey.trim());

  const updateProvider = (provider: ChatProvider) => {
    setSettings((current) => ({ ...current, provider }));
    setSaved(false);
  };

  const updateActiveProvider = (updates: ActiveProviderUpdates) => {
    setSettings((current) => ({
      ...current,
      [current.provider === 'ollama-local' ? 'ollamaLocal' : current.provider === 'ollama-cloud' ? 'ollamaCloud' : current.provider]: {
        ...getProviderSettings(current),
        ...updates,
      },
    }));
    setSaved(false);
  };

  const saveSettings = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const resetSettings = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  };

  const clearChat = () => {
    setMessages([
      {
        id: newId(),
        role: 'assistant',
        content: 'Chat cleared. I am ready for the next thread.',
      },
    ]);
    setError(null);
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || busy) return;

    setError(null);
    const nextMessages = [...messages, { id: newId(), role: 'user' as const, content }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: hasApiKeySettings(activeProvider) ? activeProvider.apiKey : '',
          baseUrl: activeProvider.baseUrl,
          model: activeProvider.model,
          systemPrompt: settings.systemPrompt,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json()) as { content?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'The provider returned an error.');
      }

      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: data.content?.trim() || 'The provider returned an empty response.',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send chat request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-7xl flex-col gap-4 lg:h-[calc(100dvh-8rem)] lg:flex-row">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Agent Chat
            </h1>
            <p className="truncate text-xs text-slate-500">
              {providerMeta.name} · {activeProvider.model}
            </p>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.role === 'assistant' && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
                  message.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-800'
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              Thinking with {providerMeta.name}...
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}

        <form onSubmit={submit} className="flex shrink-0 gap-2 border-t border-slate-100 bg-white p-3 sm:p-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) submit(event);
            }}
            placeholder={hasKey ? 'Ask the agent...' : 'Save a provider key before chatting...'}
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || !hasKey}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
            title="Send"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </section>

      <aside className="w-full shrink-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-96 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Settings2 className="h-4 w-4 text-blue-600" />
              Model Settings
            </h2>
            <p className="text-xs text-slate-500">Saved in this browser.</p>
          </div>
          {saved && (
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => updateProvider(provider.id)}
              className={cn(
                'rounded-xl border px-2 py-2 text-left transition-colors',
                settings.provider === provider.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              <span className="block truncate text-xs font-bold">{provider.name}</span>
              <span className="block truncate text-[10px] text-current opacity-70">{provider.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <p className="font-medium text-slate-700">{providerMeta.description}</p>
        </div>

        {hasApiKeySettings(activeProvider) && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <KeyRound className="h-3.5 w-3.5" />
              API key
            </label>
            <input
              className={inputClass}
              type="password"
              value={activeProvider.apiKey}
              onChange={(event) => updateActiveProvider({ apiKey: event.target.value })}
              placeholder={
                settings.provider === 'openrouter'
                  ? 'sk-or-...'
                  : settings.provider === 'ollama-cloud'
                    ? 'ollama...'
                    : 'sk-...'
              }
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Cpu className="h-3.5 w-3.5" />
            Model
          </label>
          <input
            className={inputClass}
            list="chat-models"
            value={activeProvider.model}
            onChange={(event) => updateActiveProvider({ model: event.target.value })}
          />
          <datalist id="chat-models">
            {providerMeta.models.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Base URL</label>
          <input
            className={inputClass}
            value={activeProvider.baseUrl}
            onChange={(event) => updateActiveProvider({ baseUrl: event.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            System prompt
          </label>
          <textarea
            className={`${inputClass} min-h-28 resize-y leading-5`}
            value={settings.systemPrompt}
            onChange={(event) => {
              setSettings((current) => ({ ...current, systemPrompt: event.target.value }));
              setSaved(false);
            }}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveSettings}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Check className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={resetSettings}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Reset settings"
            title="Reset settings"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}
