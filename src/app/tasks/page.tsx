'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, Folder, Plus, Trash2, Search } from 'lucide-react';
import { useTaskStore, type Task, type TaskInput, type Project } from '@/lib/store/taskStore';
import { useOrgStore } from '@/lib/store/orgStore';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

const getPriorityBadge = (priority: Task['priority']) =>
  cn(
    'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-current opacity-80',
    priority === 'high' ? 'text-red-500' : priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
  );

const ASSIGNEES = ['Admin', 'Steph'];

function TaskFormModal({ open, onClose, task }: { open: boolean; onClose: () => void; task?: Task | null }) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const handleSubmit = async (input: TaskInput) => {
    if (task) {
      await updateTask(activeOrgId ?? '', task.id, input);
    } else {
      await addTask(activeOrgId ?? '', input);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(activeOrgId ?? '', task.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit Task' : 'Add Task'}>
      <TaskFields key={task?.id ?? 'new'} task={task} onSubmit={handleSubmit} onDelete={handleDelete} />
    </Modal>
  );
}

function TaskFields({
  task,
  onSubmit,
  onDelete,
}: {
  task?: Task | null;
  onSubmit: (input: TaskInput) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'pending');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [assignee, setAssignee] = useState(task?.assignee ?? 'Admin');
  const [projectId, setProjectId] = useState(task?.projectId ?? '');
  const [error, setError] = useState<string | null>(null);

  const projects = useTaskStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);

  const knownAssignees = useMemo(() => {
    const set = new Set([...ASSIGNEES, ...tasks.map((t) => t.assignee).filter(Boolean)]);
    return Array.from(set);
  }, [tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueDate,
      assignee: assignee.trim() || 'Admin',
      projectId: projectId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finalize branding" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
          <textarea
            className={cn(inputClass, 'resize-none')}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add detail..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priority</label>
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due date</label>
            <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assignee</label>
            <input className={inputClass} list="assignee-list" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            <datalist id="assignee-list">
              {knownAssignees.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Project</label>
          <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {task ? 'Save changes' : 'Add task'}
          </button>
          {task && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              aria-label="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
  );
}

type StatusFilter = 'all' | Task['status'];

export default function TasksPage() {
  const { tasks, projects, updateTask } = useTaskStore();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const addProject = useTaskStore((s) => s.addProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [newProject, setNewProject] = useState('');

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, statusFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, { project?: Project; tasks: Task[] }> = {};
    projects.forEach((project) => {
      groups[project.id] = { project, tasks: [] };
    });
    groups['none'] = { tasks: [] };
    filteredTasks.forEach((task) => {
      const groupId = task.projectId || 'none';
      groups[groupId] = groups[groupId] ?? { tasks: [] };
      groups[groupId].tasks.push(task);
    });
    return groups;
  }, [filteredTasks, projects]);

  const toggleTaskStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask(activeOrgId ?? '', id, { status: nextStatus as Task['status'] });
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setModalOpen(true);
  };

  const handleNewProject = async () => {
    if (!newProject.trim()) return;
    const project = await addProject(activeOrgId ?? '', { name: newProject.trim(), status: 'active', progress: 0 });
    if (project) setNewProject('');
  };

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Done' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm">Manage your todo list and project milestones.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm text-sm shrink-0"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors',
                statusFilter === f.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(groupedTasks).map(([groupId, group]) => {
        const { project, tasks: groupTasks } = group;
        if (groupTasks.length === 0) return null;

        return (
          <section key={groupId} className="space-y-3">
            <div className="flex items-center gap-2">
              <Folder size={18} className="text-slate-400 shrink-0" />
              <h2 className="text-base font-semibold text-slate-700 truncate">{project ? project.name : 'General Tasks'}</h2>
              {project && (
                <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full shrink-0">
                  {project.progress}% Complete
                </span>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <ul className="divide-y divide-slate-100">
                {groupTasks.map((task) => (
                  <li key={task.id} className="p-4 flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className="mt-0.5 text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                      aria-label="Toggle completion"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>

                    <button onClick={() => openEdit(task)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'
                          )}
                        >
                          {task.title}
                        </span>
                        <span className={getPriorityBadge(task.priority)}>{task.priority}</span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {task.dueDate || 'No due date'}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle size={13} />
                          {task.assignee}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      {filteredTasks.length === 0 && (
        <p className="text-center text-slate-400 italic py-10 text-sm bg-white rounded-2xl border border-slate-200">
          No tasks match your filters.
        </p>
      )}

      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNewProject()}
          placeholder="New project name..."
          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
        <button
          onClick={handleNewProject}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Folder size={15} />
          New project
        </button>
      </div>

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} task={editing} />
    </div>
  );
}