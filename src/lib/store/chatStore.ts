import { create } from 'zustand';
import type { ChatMessageRow, ChatThreadRow } from '@/lib/supabase/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: StoredChatMessage[];
  loading: boolean;
  loadedOrgId: string | null;
  loadThreads: (orgId: string) => Promise<void>;
  selectThread: (orgId: string, threadId: string) => Promise<void>;
  createThread: (orgId: string, title?: string) => Promise<string | null>;
  addMessage: (orgId: string, threadId: string, role: StoredChatMessage['role'], content: string) => Promise<void>;
  clearMessages: () => void;
}

const LOCAL_KEY = 'hhs-chat-history';

function mapThread(row: ChatThreadRow): ChatThread {
  return { id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapMessage(row: ChatMessageRow): StoredChatMessage {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };
}

function localKey(orgId: string) {
  return `${LOCAL_KEY}:${orgId}`;
}

function readLocal(orgId: string) {
  if (typeof window === 'undefined') return { threads: [] as ChatThread[], messages: {} as Record<string, StoredChatMessage[]> };
  try {
    const value = JSON.parse(window.localStorage.getItem(localKey(orgId)) ?? '{}') as {
      threads?: ChatThread[];
      messages?: Record<string, StoredChatMessage[]>;
    };
    return { threads: value.threads ?? [], messages: value.messages ?? {} };
  } catch {
    return { threads: [], messages: {} as Record<string, StoredChatMessage[]> };
  }
}

function writeLocal(orgId: string, threads: ChatThread[], messages: Record<string, StoredChatMessage[]>) {
  window.localStorage.setItem(localKey(orgId), JSON.stringify({ threads, messages }));
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  loading: false,
  loadedOrgId: null,

  loadThreads: async (orgId) => {
    set({ loading: true, loadedOrgId: orgId });
    if (!isSupabaseConfigured) {
      const local = readLocal(orgId);
      const sorted = [...local.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      set({ threads: sorted, activeThreadId: sorted[0]?.id ?? null, messages: sorted[0] ? local.messages[sorted[0].id] ?? [] : [], loading: false });
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.from('chat_threads').select('*').eq('org_id', orgId).order('updated_at', { ascending: false });
    const threads = data?.map(mapThread) ?? [];
    set({ threads, activeThreadId: threads[0]?.id ?? null, loading: false });
    if (threads[0]) await get().selectThread(orgId, threads[0].id);
  },

  selectThread: async (orgId, threadId) => {
    set({ activeThreadId: threadId, messages: [] });
    if (!isSupabaseConfigured) {
      set({ messages: readLocal(orgId).messages[threadId] ?? [] });
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.from('chat_messages').select('*').eq('org_id', orgId).eq('thread_id', threadId).order('created_at', { ascending: true });
    set({ messages: data?.map(mapMessage) ?? [] });
  },

  createThread: async (orgId, title = 'New conversation') => {
    const now = new Date().toISOString();
    if (!isSupabaseConfigured) {
      const thread = { id: crypto.randomUUID(), title, createdAt: now, updatedAt: now };
      const local = readLocal(orgId);
      writeLocal(orgId, [thread, ...local.threads], { ...local.messages, [thread.id]: [] });
      set({ threads: [thread, ...get().threads], activeThreadId: thread.id, messages: [] });
      return thread.id;
    }
    const supabase = createClient();
    const { data, error } = await supabase.from('chat_threads').insert({ org_id: orgId, title }).select('*').single();
    if (error || !data) return null;
    const thread = mapThread(data);
    set({ threads: [thread, ...get().threads], activeThreadId: thread.id, messages: [] });
    return thread.id;
  },

  addMessage: async (orgId, threadId, role, content) => {
    const now = new Date().toISOString();
    const currentThread = get().threads.find((thread) => thread.id === threadId);
    const nextTitle = role === 'user' && currentThread?.title === 'New conversation'
      ? content.slice(0, 48) || 'New conversation'
      : currentThread?.title ?? 'New conversation';
    if (!isSupabaseConfigured) {
      const local = readLocal(orgId);
      const message = { id: crypto.randomUUID(), role, content, createdAt: now };
      const messages = { ...local.messages, [threadId]: [...(local.messages[threadId] ?? []), message] };
      const threads = local.threads.map((thread) => (thread.id === threadId ? { ...thread, title: nextTitle, updatedAt: now } : thread));
      writeLocal(orgId, threads, messages);
      set({ messages: [...get().messages, message], threads: threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.from('chat_messages').insert({ org_id: orgId, thread_id: threadId, role, content }).select('*').single();
    if (error || !data) return;
    set((state) => ({ messages: [...state.messages, mapMessage(data)] }));
    await supabase.from('chat_threads').update({ title: nextTitle, updated_at: now }).eq('org_id', orgId).eq('id', threadId);
    set((state) => ({ threads: state.threads.map((thread) => (thread.id === threadId ? { ...thread, title: nextTitle, updatedAt: now } : thread)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }));
  },

  clearMessages: () => set({ messages: [] }),
}));
