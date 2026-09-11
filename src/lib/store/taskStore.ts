import { create } from 'zustand';
import type { ProjectRow, TaskRow } from '@/lib/supabase/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  assignee: 'Admin' | 'Steph' | string;
  projectId?: string;
}

export type TaskInput = Omit<Task, 'id'>;

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'on_hold' | 'completed';
  progress: number;
}

export type ProjectInput = Omit<Project, 'id'>;

const seedTasks: Task[] = [
  {
    id: 't1',
    title: 'Finalize Branding',
    description: 'Update logo and colors',
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-09-10',
    assignee: 'Admin',
    projectId: 'p1',
  },
  {
    id: 't2',
    title: 'Client Call: Acme Corp',
    description: 'Discuss Q4 goals',
    priority: 'medium',
    status: 'pending',
    dueDate: '2026-09-12',
    assignee: 'Steph',
    projectId: 'p1',
  },
];

const seedProjects: Project[] = [{ id: 'p1', name: 'Storefront Launch', status: 'active', progress: 65 }];

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date ?? '',
    assignee: row.assignee ?? '',
    projectId: row.project_id ?? undefined,
  };
}

function mapProject(row: ProjectRow): Project {
  return { id: row.id, name: row.name, status: row.status, progress: row.progress ?? 0 };
}

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  loading: boolean;
  loadedOrgId: string | null;
  setTasks: (tasks: Task[]) => void;
  setProjects: (projects: Project[]) => void;
  load: (orgId: string) => Promise<void>;
  addTask: (orgId: string, input: TaskInput) => Promise<Task | null>;
  updateTask: (orgId: string, id: string, updates: Partial<TaskInput>) => Promise<void>;
  deleteTask: (orgId: string, id: string) => Promise<void>;
  addProject: (orgId: string, input: ProjectInput) => Promise<Project | null>;
  subscribe: (orgId: string) => () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: seedTasks,
  projects: seedProjects,
  loading: false,
  loadedOrgId: null,

  setTasks: (tasks) => set({ tasks }),
  setProjects: (projects) => set({ projects }),

  load: async (orgId) => {
    if (get().loadedOrgId === orgId) return;
    set({ loading: true, loadedOrgId: orgId });
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    const supabase = createClient();
    const [{ data: tasks }, { data: projects }] = await Promise.all([
      supabase.from('tasks').select('*').eq('org_id', orgId).order('created_at', { ascending: true }),
      supabase.from('projects').select('*').eq('org_id', orgId).order('created_at', { ascending: true }),
    ]);
    if (tasks) set({ tasks: tasks.map(mapTask) });
    if (projects) set({ projects: projects.map(mapProject) });
    set({ loading: false });
  },

  addTask: async (orgId, input) => {
    const task: Task = { id: crypto.randomUUID(), ...input };
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          org_id: orgId,
          project_id: input.projectId ?? null,
          title: input.title,
          description: input.description || null,
          priority: input.priority,
          status: input.status,
          due_date: input.dueDate || null,
          assignee: input.assignee || null,
        })
        .select('*')
        .single();
      if (error || !data) {
        console.error('addTask failed', error);
        return null;
      }
      const saved = mapTask(data);
      set((s) => ({ tasks: [...s.tasks, saved] }));
      return saved;
    }
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (orgId, id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const patch: Partial<TaskRow> = {};
    if ('title' in updates) patch.title = updates.title;
    if ('description' in updates) patch.description = updates.description || null;
    if ('priority' in updates) patch.priority = updates.priority;
    if ('status' in updates) patch.status = updates.status;
    if ('dueDate' in updates) patch.due_date = updates.dueDate || null;
    if ('assignee' in updates) patch.assignee = updates.assignee || null;
    if ('projectId' in updates) patch.project_id = updates.projectId ?? null;

    const { error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('org_id', orgId)
      .eq('id', id);
    if (error) console.error('updateTask failed', error);
  },

  deleteTask: async (orgId, id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { error } = await supabase.from('tasks').delete().eq('org_id', orgId).eq('id', id);
    if (error) console.error('deleteTask failed', error);
  },

  addProject: async (orgId, input) => {
    const project: Project = { id: crypto.randomUUID(), ...input };
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .insert({
          org_id: orgId,
          name: input.name,
          status: input.status ?? 'active',
          progress: input.progress ?? 0,
        })
        .select('*')
        .single();
      if (error || !data) {
        console.error('addProject failed', error);
        return null;
      }
      const saved = mapProject(data);
      set((s) => ({ projects: [...s.projects, saved] }));
      return saved;
    }
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  subscribe: (orgId) => {
    if (!isSupabaseConfigured) return () => {};
    const supabase = createClient();
    const refresh = async () => {
      const [{ data: tasks }, { data: projects }] = await Promise.all([
        supabase.from('tasks').select('*').eq('org_id', orgId),
        supabase.from('projects').select('*').eq('org_id', orgId),
      ]);
      if (tasks) set({ tasks: tasks.map(mapTask) });
      if (projects) set({ projects: projects.map(mapProject) });
    };
    const tasksChannel = supabase
      .channel(`tasks-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    const projectsChannel = supabase
      .channel(`projects-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(projectsChannel);
    };
  },
}));
