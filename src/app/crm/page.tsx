'use client';

import React, { useState, useMemo } from 'react';
import { useCrmStore, Contact } from '@/lib/store/crmStore';
import { 
  Users, 
  Kanban, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  ChevronRight,
  Plus,
  MoreVertical
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STAGES: Contact['stage'][] = ['discovery', 'proposal', 'negotiation', 'closed'];

export default function CrmPage() {
  const [view, setView] = useState<'directory' | 'kanban'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const { contacts, updateContact } = useCrmStore();

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const moveStage = (id: string, currentStage: Contact['stage'], direction: 'next' | 'prev') => {
    const currentIndex = STAGES.indexOf(currentStage);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < STAGES.length) {
      updateContact(id, { stage: STAGES[nextIndex] });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">CRM</h1>
          <p className="text-slate-500">Manage your relationships and sales pipeline.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
              onClick={() => setView('directory')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                view === 'directory' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users size={16} />
              Directory
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                view === 'kanban' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Kanban size={16} />
              Kanban
            </button>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm">
            <Plus size={18} />
            Add Contact
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search contacts, companies or emails..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {view === 'directory' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
                <tr key={contact.id} className="hover:bg-slate-50 transition-colors group">
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
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                      contact.status === 'client' ? "bg-green-50 text-green-700 border-green-200" : 
                      contact.status === 'partner' ? "bg-purple-50 text-purple-700 border-purple-200" : 
                      "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 capitalize">{contact.stage}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-slate-400" />
                      {contact.lastContacted}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreVertical size={16} />
                    </button>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-4 min-w-[280px]">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  {stage}
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                    {filteredContacts.filter(c => c.stage === stage).length}
                  </span>
                </h3>
              </div>
              
              <div className="bg-slate-100 p-3 rounded-xl min-h-[500px] space-y-3">
                {filteredContacts
                  .filter(c => c.stage === stage)
                  .map((contact) => (
                    <div 
                      key={contact.id} 
                      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-blue-300 transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex gap-1">
                          {stage !== 'discovery' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveStage(contact.id, contact.stage, 'prev'); }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400"
                            >
                              <ChevronRight className="rotate-180 w-3 h-3" />
                            </button>
                          )}
                          {stage !== 'closed' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveStage(contact.id, contact.stage, 'next'); }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">{contact.name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Building2 size={12} /> {contact.company}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar size={10} />
                          {contact.lastContacted}
                        </div>
                        <span className={cn(
                          "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                          contact.status === 'client' ? "bg-green-50 text-green-600" : 
                          contact.status === 'partner' ? "bg-purple-50 text-purple-600" : 
                          "bg-blue-50 text-blue-600"
                        )}>
                          {contact.status}
                        </span>
                      </div>
                    </div>
                  ))}
                
                {filteredContacts.filter(c => c.stage === stage).length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
