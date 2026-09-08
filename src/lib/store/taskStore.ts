import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  assignee: 'Admin' | 'Steph';
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'on_hold' | 'completed';
  progress: number;
}

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  setProjects: (projects: Project[]) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [
    { id: 't1', title: 'Finalize Branding', description: 'Update logo and colors', priority: 'high', status: 'in_progress', dueDate: '2026-09-10', assignee: 'Admin', projectId: 'p1' },
    { id: 't2', title: 'Client Call: Acme Corp', description: 'Discuss Q4 goals', priority: 'medium', status: 'pending', dueDate: '2026-09-12', assignee: 'Steph', projectId: 'p1' },
  ],
  projects: [
    { id: 'p1', name: 'Storefront Launch', status: 'active', progress: 65 },
  ],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  setProjects: (projects) => set({ projects }),
}));
