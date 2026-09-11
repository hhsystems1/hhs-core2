'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, FileText, FolderGit2, GraduationCap, Plus, Search, Trash2, Pencil } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  useKnowledgeStore,
  type KnowledgeCategory,
  type KnowledgeDoc,
  type KnowledgeDocInput,
} from '@/lib/store/knowledgeStore';
import { useOrgStore } from '@/lib/store/orgStore';

const CATEGORY_META: Record<KnowledgeCategory, { icon: React.ElementType; color: string; bg: string }> = {
  'Standard Operating Procedures': { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  'Training & Onboarding': { icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-50' },
  'Client Wisdom': { icon: FolderGit2, color: 'text-purple-600', bg: 'bg-purple-50' },
  'Internal Wiki': { icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const CATEGORIES = Object.keys(CATEGORY_META) as KnowledgeCategory[];

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

function DocFormModal({
  open,
  onClose,
  doc,
}: {
  open: boolean;
  onClose: () => void;
  doc?: KnowledgeDoc | null;
}) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const addDoc = useKnowledgeStore((s) => s.addDoc);
  const updateDoc = useKnowledgeStore((s) => s.updateDoc);
  const deleteDoc = useKnowledgeStore((s) => s.deleteDoc);

  const handleSubmit = async (input: KnowledgeDocInput) => {
    if (doc) {
      await updateDoc(activeOrgId ?? '', doc.id, input);
    } else {
      await addDoc(activeOrgId ?? '', input);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!doc) return;
    await deleteDoc(activeOrgId ?? '', doc.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={doc ? 'Edit document' : 'Add document'}>
      <DocFields key={doc?.id ?? 'new'} doc={doc} onSubmit={handleSubmit} onDelete={handleDelete} />
    </Modal>
  );
}

function DocFields({
  doc,
  onSubmit,
  onDelete,
}: {
  doc?: KnowledgeDoc | null;
  onSubmit: (input: KnowledgeDocInput) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState<KnowledgeCategory>(doc?.category ?? 'Internal Wiki');
  const [summary, setSummary] = useState(doc?.summary ?? '');
  const [content, setContent] = useState(doc?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    onSubmit({
      title: title.trim(),
      category,
      summary: summary.trim(),
      content: content.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Summary</label>
        <textarea className={cn(inputClass, 'resize-none')} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Content</label>
        <textarea className={cn(inputClass, 'resize-y min-h-40')} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {doc ? 'Save changes' : 'Add document'}
        </button>
        {doc && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            aria-label="Delete document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}

export default function KnowledgePage() {
  const docs = useKnowledgeStore((s) => s.docs);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(docs[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDoc | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((doc) => {
      if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
      if (!q) return true;
      return [doc.title, doc.summary, doc.content, doc.category].some((value) => value.toLowerCase().includes(q));
    });
  }, [docs, query, activeCategory]);

  const selected = docs.find((doc) => doc.id === selectedId) ?? filtered[0] ?? null;

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (doc: KnowledgeDoc) => {
    setEditing(doc);
    setModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500 text-sm">SOPs, training material and client wisdom.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm text-sm shrink-0"
        >
          <Plus size={16} />
          Add doc
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category];
          const count = docs.filter((doc) => doc.category === category).length;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(activeCategory === category ? 'all' : category)}
              className={cn(
                'bg-white border rounded-2xl p-4 shadow-sm text-left transition-colors',
                activeCategory === category ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', meta.bg)}>
                  <meta.icon className={cn('w-5 h-5', meta.color)} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">{category}</h3>
                  <p className="text-xs text-slate-400">{count} documents</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the knowledge base..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Documents
          </div>
          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {filtered.length === 0 && <p className="p-4 text-sm text-slate-400 italic">No documents found.</p>}
            {filtered.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={cn(
                  'w-full p-4 text-left hover:bg-slate-50 transition-colors',
                  selected?.id === doc.id && 'bg-blue-50/70'
                )}
              >
                <p className="text-sm font-bold text-slate-900 line-clamp-1">{doc.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {doc.category} · {doc.updatedAt}
                </p>
                {doc.summary && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{doc.summary}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[360px]">
          {selected ? (
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-blue-600">{selected.category}</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{selected.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">Updated {selected.updatedAt}</p>
                </div>
                <button
                  onClick={() => openEdit(selected)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
              {selected.summary && (
                <p className="mt-5 text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  {selected.summary}
                </p>
              )}
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {selected.content || <span className="text-slate-400 italic">No content yet.</span>}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[360px] flex items-center justify-center text-sm text-slate-400 italic">
              Select or add a document.
            </div>
          )}
        </div>
      </div>

      <DocFormModal open={modalOpen} onClose={() => setModalOpen(false)} doc={editing} />
    </div>
  );
}
