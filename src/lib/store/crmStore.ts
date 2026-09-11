import { create } from 'zustand';
import type { ContactRow } from '@/lib/supabase/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'lead' | 'client' | 'partner';
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed';
  lastContacted: string;
}

export type ContactInput = Omit<Contact, 'id'>;

const seedContacts: Contact[] = [
  {
    id: 'c1',
    name: 'John Doe',
    email: 'john@acme.com',
    phone: '555-0101',
    company: 'Acme Corp',
    status: 'client',
    stage: 'closed',
    lastContacted: '2026-09-01',
  },
  {
    id: 'c2',
    name: 'Jane Smith',
    email: 'jane@globex.com',
    phone: '555-0102',
    company: 'Globex',
    status: 'lead',
    stage: 'discovery',
    lastContacted: '2026-08-28',
  },
];

function mapRow(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    company: row.company ?? '',
    status: row.status,
    stage: row.stage,
    lastContacted: row.last_contacted ? row.last_contacted.slice(0, 10) : '',
  };
}

interface CrmStore {
  contacts: Contact[];
  selectedContactId: string | null;
  loading: boolean;
  loadedOrgId: string | null;
  setContacts: (contacts: Contact[]) => void;
  setSelectedContact: (id: string | null) => void;
  load: (orgId: string) => Promise<void>;
  addContact: (orgId: string, input: ContactInput) => Promise<Contact | null>;
  updateContact: (orgId: string, id: string, updates: Partial<ContactInput>) => Promise<void>;
  deleteContact: (orgId: string, id: string) => Promise<void>;
  subscribe: (orgId: string) => () => void;
}

export const useCrmStore = create<CrmStore>((set, get) => ({
  contacts: seedContacts,
  selectedContactId: null,
  loading: false,
  loadedOrgId: null,

  setContacts: (contacts) => set({ contacts }),
  setSelectedContact: (id) => set({ selectedContactId: id }),

  load: async (orgId) => {
    if (get().loadedOrgId === orgId) return;
    set({ loading: true, loadedOrgId: orgId });
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });
    if (!error && data) set({ contacts: data.map(mapRow) });
    set({ loading: false });
  },

  addContact: async (orgId, input) => {
    const contact: Contact = { id: crypto.randomUUID(), ...input, lastContacted: input.lastContacted || new Date().toISOString().slice(0, 10) };
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          org_id: orgId,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          company: contact.company || null,
          status: contact.status,
          stage: contact.stage,
          last_contacted: contact.lastContacted,
        })
        .select('*')
        .single();
      if (error || !data) {
        console.error('addContact failed', error);
        return null;
      }
      const saved = mapRow(data);
      set((s) => ({ contacts: [...s.contacts, saved] }));
      return saved;
    }
    set((s) => ({ contacts: [...s.contacts, contact] }));
    return contact;
  },

  updateContact: async (orgId, id, updates) => {
    set((s) => ({
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const patch: Partial<ContactRow> = {};
    if ('name' in updates) patch.name = updates.name;
    if ('email' in updates) patch.email = updates.email || null;
    if ('phone' in updates) patch.phone = updates.phone || null;
    if ('company' in updates) patch.company = updates.company || null;
    if ('status' in updates) patch.status = updates.status;
    if ('stage' in updates) patch.stage = updates.stage;
    if ('lastContacted' in updates) patch.last_contacted = updates.lastContacted || null;

    const { error } = await supabase
      .from('contacts')
      .update(patch)
      .eq('org_id', orgId)
      .eq('id', id);
    if (error) console.error('updateContact failed', error);
  },

  deleteContact: async (orgId, id) => {
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { error } = await supabase.from('contacts').delete().eq('org_id', orgId).eq('id', id);
    if (error) console.error('deleteContact failed', error);
  },

  subscribe: (orgId) => {
    if (!isSupabaseConfigured) return () => {};
    const supabase = createClient();
    const channel = supabase
      .channel(`contacts-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts', filter: `org_id=eq.${orgId}` },
        async () => {
          const { data } = await supabase.from('contacts').select('*').eq('org_id', orgId);
          if (data) set({ contacts: data.map(mapRow) });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
}));
