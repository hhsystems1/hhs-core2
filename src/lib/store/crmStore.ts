import { create } from 'zustand';

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

interface CrmStore {
  contacts: Contact[];
  selectedContactId: string | null;
  setContacts: (contacts: Contact[]) => void;
  setSelectedContact: (id: string | null) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
}

export const useCrmStore = create<CrmStore>((set) => ({
  contacts: [
    { id: 'c1', name: 'John Doe', email: 'john@acme.com', phone: '555-0101', company: 'Acme Corp', status: 'client', stage: 'closed', lastContacted: '2026-09-01' },
    { id: 'c2', name: 'Jane Smith', email: 'jane@globex.com', phone: '555-0102', company: 'Globex', status: 'lead', stage: 'discovery', lastContacted: '2026-08-28' },
  ],
  selectedContactId: null,
  setContacts: (contacts) => set({ contacts }),
  setSelectedContact: (id) => set({ selectedContactId: id }),
  updateContact: (id, updates) => set((state) => ({
    contacts: state.contacts.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
}));
