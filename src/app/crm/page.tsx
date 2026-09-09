'use client';

import React, { useState, useMemo } from 'react';
import { Users, Kanban as KanbanIcon, Search, Mail, Phone, Building2, Calendar as CalendarIcon, ChevronRight, Plus, MoreVertical, Trash2 } from 'lucide-react';
import { useCrmStore, type Contact, type ContactInput } from '@/lib/store/crmStore';
import { useOrgStore } from '@/lib/store/orgStore';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const STAGES: Contact['stage'][] = ['discovery', 'proposal', 'negotiation', 'closed'];

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

function ContactFormModal({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact?: Contact | null;
}) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const addContact = useCrmStore((s) => s.addContact);
  const updateContact = useCrmStore((s) => s.updateContact);
  const deleteContact = useCrmStore((s) => s.deleteContact);

  const handleSubmit = async (input: ContactInput) => {
    if (contact) {
      await updateContact(activeOrgId ?? '', contact.id, input);
    } else {
      await addContact(activeOrgId ?? '', input);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!contact) return;
    await deleteContact(activeOrgId ?? '', contact.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Edit Contact' : 'Add Contact'}>
      <ContactFields key={contact?.id ?? 'new'} contact={contact} onSubmit={handleSubmit} onDelete={handleDelete} />
    </Modal>
  );
}

function ContactFields({
  contact,
  onSubmit,
  onDelete,
}: {
  contact?: Contact | null;
  onSubmit: (input: ContactInput) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [status, setStatus] = useState<Contact['status']>(contact?.status ?? 'lead');
  const [stage, setStage] = useState<Contact['stage']>(contact?.stage ?? 'discovery');
  const [lastContacted, setLastContacted] = useState(contact?.lastContacted ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      status,
      stage,
      lastContacted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name *</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@co.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0100" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Company</label>
        <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Globex" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Contact['status'])}>
            <option value="lead">Lead</option>
            <option value="client">Client</option>
            <option value="partner">Partner</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stage</label>
          <select className={inputClass} value={stage} onChange={(e) => setStage(e.target.value as Contact['stage'])}>
            {STAGES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last contacted</label>
        <input className={inputClass} type="date" value={lastContacted} onChange={(e) => setLastContacted(e.target.value)} />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {contact ? 'Save changes' : 'Add contact'}
        </button>
        {contact && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            aria-label="Delete contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}

const statusBadge = (status: Contact['status']) =>
  cn(
    'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border',
    status === 'client'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'partner'
        ? 'bg-purple-50 text-purple-700 border-purple-200'
        : 'bg-blue-50 text-blue-700 border-blue-200'
  );

export default function CrmPage() {
  const [view, setView] = useState<'directory' | 'kanban'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const { contacts, updateContact } = useCrmStore();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [contacts, searchQuery]
  );

  const moveStage = (id: string, currentStage: Contact['stage'], direction: 'next' | 'prev') => {
    const currentIndex = STAGES.indexOf(currentStage);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < STAGES.length) {
      updateContact(activeOrgId ?? '', id, { stage: STAGES[nextIndex] });
    }
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">CRM</h1>
          <p className="text-slate-500 text-sm">Manage your relationships and sales pipeline.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm text-sm shrink-0"
        >
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setView('directory')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              view === 'directory' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Users size={16} />
            <span className="hidden sm:inline">Directory</span>
          </button>
          <button
            onClick={() => setView('kanban')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              view === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <KanbanIcon size={16} />
            <span className="hidden sm:inline">Pipeline</span>
          </button>
        </div>

        <div className="relative flex-1 sm:flex-none sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
          />
        </div>
      </div>

      {view === 'directory' ? (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filteredContacts.length === 0 && (
              <p className="text-center text-slate-400 italic py-10 text-sm bg-white rounded-2xl border border-slate-200">No contacts found.</p>
            )}
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => openEdit(contact)}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 transition-colors text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{contact.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <Mail size={11} /> {contact.email}
                      </p>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1 min-w-0">
                    <Building2 size={11} className="shrink-0" /> {contact.company}
                  </span>
                  <span className={statusBadge(contact.status)}>{contact.status}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Contact</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openEdit(contact)}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{contact.name}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={12} /> {contact.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 size={14} className="text-slate-400" />
                        {contact.company}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={statusBadge(contact.status)}>{contact.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 capitalize">{contact.stage}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={14} className="text-slate-400" />
                        {contact.lastContacted || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {contact.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Phone size={12} /> {contact.phone}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                      No contacts found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-3 min-w-[260px] flex-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  {stage}
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                    {filteredContacts.filter((c) => c.stage === stage).length}
                  </span>
                </h3>
              </div>

              <div className="bg-slate-100 p-3 rounded-xl min-h-[400px] space-y-3">
                {filteredContacts
                  .filter((c) => c.stage === stage)
                  .map((contact) => (
                    <div key={contact.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex gap-1">
                          {stage !== 'discovery' && (
                            <button
                              onClick={() => moveStage(contact.id, contact.stage, 'prev')}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400"
                              aria-label="Move to previous stage"
                            >
                              <ChevronRight className="rotate-180 w-3 h-3" />
                            </button>
                          )}
                          {stage !== 'closed' && (
                            <button
                              onClick={() => moveStage(contact.id, contact.stage, 'next')}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400"
                              aria-label="Move to next stage"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <button onClick={() => openEdit(contact)} className="w-full text-left">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900">{contact.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Building2 size={12} /> {contact.company}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <CalendarIcon size={10} />
                            {contact.lastContacted || '—'}
                          </div>
                          <span className={statusBadge(contact.status)}>{contact.status}</span>
                        </div>
                      </button>
                    </div>
                  ))}

                {filteredContacts.filter((c) => c.stage === stage).length === 0 && (
                  <div className="h-28 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContactFormModal open={modalOpen} onClose={() => setModalOpen(false)} contact={editing} />
    </div>
  );
}