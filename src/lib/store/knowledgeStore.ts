import { create } from 'zustand';
import type { KnowledgeDocRow } from '@/lib/supabase/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type KnowledgeCategory =
  | 'Standard Operating Procedures'
  | 'Training & Onboarding'
  | 'Client Wisdom'
  | 'Internal Wiki';

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: KnowledgeCategory;
  summary: string;
  content: string;
  updatedAt: string;
}

export type KnowledgeDocInput = Omit<KnowledgeDoc, 'id' | 'updatedAt'>;

const seedDocs: KnowledgeDoc[] = [
  {
    id: 'doc-1',
    title: 'New client kickoff checklist',
    category: 'Standard Operating Procedures',
    summary: 'A repeatable intake flow for the first client meeting.',
    content:
      'Confirm stakeholders, collect access needs, document project goals, define the first milestone, and schedule the follow-up before the kickoff ends.',
    updatedAt: '2026-09-01',
  },
  {
    id: 'doc-2',
    title: 'CRM pipeline definitions',
    category: 'Training & Onboarding',
    summary: 'How discovery, proposal, negotiation, and closed stages should be used.',
    content:
      'Discovery means fit is still being qualified. Proposal means a concrete offer has been shared. Negotiation means scope, price, or dates are being finalized. Closed means the relationship has reached an outcome.',
    updatedAt: '2026-09-04',
  },
];

function mapRow(row: KnowledgeDocRow): KnowledgeDoc {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    summary: row.summary ?? '',
    content: row.content,
    updatedAt: row.updated_at.slice(0, 10),
  };
}

interface KnowledgeStore {
  docs: KnowledgeDoc[];
  loading: boolean;
  loadedOrgId: string | null;
  load: (orgId: string) => Promise<void>;
  addDoc: (orgId: string, input: KnowledgeDocInput) => Promise<KnowledgeDoc | null>;
  updateDoc: (orgId: string, id: string, updates: Partial<KnowledgeDocInput>) => Promise<void>;
  deleteDoc: (orgId: string, id: string) => Promise<void>;
  subscribe: (orgId: string) => () => void;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  docs: seedDocs,
  loading: false,
  loadedOrgId: null,

  load: async (orgId) => {
    if (get().loadedOrgId === orgId) return;
    set({ loading: true, loadedOrgId: orgId });
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false });
    if (data) set({ docs: data.map(mapRow) });
    set({ loading: false });
  },

  addDoc: async (orgId, input) => {
    const doc: KnowledgeDoc = {
      id: crypto.randomUUID(),
      ...input,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('knowledge_docs')
        .insert({
          org_id: orgId,
          title: input.title,
          category: input.category,
          summary: input.summary || null,
          content: input.content,
        })
        .select('*')
        .single();
      if (error || !data) {
        console.error('addDoc failed', error);
        return null;
      }
      const saved = mapRow(data);
      set((s) => ({ docs: [saved, ...s.docs] }));
      return saved;
    }
    set((s) => ({ docs: [doc, ...s.docs] }));
    return doc;
  },

  updateDoc: async (orgId, id, updates) => {
    const updatedAt = new Date().toISOString().slice(0, 10);
    set((s) => ({
      docs: s.docs.map((doc) => (doc.id === id ? { ...doc, ...updates, updatedAt } : doc)),
    }));
    if (!isSupabaseConfigured) return;
    const patch: Partial<KnowledgeDocRow> = { updated_at: new Date().toISOString() };
    if ('title' in updates) patch.title = updates.title;
    if ('category' in updates) patch.category = updates.category;
    if ('summary' in updates) patch.summary = updates.summary || null;
    if ('content' in updates) patch.content = updates.content;
    const supabase = createClient();
    const { error } = await supabase
      .from('knowledge_docs')
      .update(patch)
      .eq('org_id', orgId)
      .eq('id', id);
    if (error) console.error('updateDoc failed', error);
  },

  deleteDoc: async (orgId, id) => {
    set((s) => ({ docs: s.docs.filter((doc) => doc.id !== id) }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { error } = await supabase.from('knowledge_docs').delete().eq('org_id', orgId).eq('id', id);
    if (error) console.error('deleteDoc failed', error);
  },

  subscribe: (orgId) => {
    if (!isSupabaseConfigured) return () => {};
    const supabase = createClient();
    const channel = supabase
      .channel(`knowledge-docs-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'knowledge_docs', filter: `org_id=eq.${orgId}` },
        async () => {
          const { data } = await supabase
            .from('knowledge_docs')
            .select('*')
            .eq('org_id', orgId)
            .order('updated_at', { ascending: false });
          if (data) set({ docs: data.map(mapRow) });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
