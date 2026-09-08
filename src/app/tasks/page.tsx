'use client';

import React, { useMemo } from 'react';
import { useTaskStore, Task, Project } from '@/lib/store/taskStore';
import { CheckCircle2, Circle, Clock, AlertCircle, Folder, Plus } from 'lucide-react';

export default function TasksPage() {
  const { tasks, projects, updateTask } = useTaskStore();

  const groupedTasks = useMemo(() => {
    const groups: Record<string, { project?: Project; tasks: Task[] }> = {};

    // Initialize groups for all projects
    projects.forEach((project) => {
      groups[project.id] = { project, tasks: [] };
    });

    // Group for tasks without a project
    groups['none'] = { tasks: [] };

    tasks.forEach((task) => {
      const groupId = task.projectId || 'none';
      if (!groups[groupId]) {
        // Handle case where task has a projectId that isn't in the projects list
        groups[groupId] = { tasks: [] };
      } else {
        groups[groupId].tasks.push(task);
      }
    });

    return groups;
  }, [tasks, projects]);

  const toggleTaskStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask(id, { status: nextStatus });
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tasks</h1>
          <p className="text-slate-500">Manage your todo list and project milestones.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={18} />
          Add Task
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedTasks).map(([groupId, group]) => {
          const { project, tasks: groupTasks } = group;
          if (groupTasks.length === 0) return null;

          return (
            <section key={groupId} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Folder size={20} className="text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-700">
                  {project ? project.name : 'General Tasks'}
                </h2>
                {project && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {project.progress}% Complete
                  </span>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {groupTasks.map((task) => (
                    <li key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 group">
                      <button 
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className="mt-1 text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 size={20} className="text-green-500" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)} bg-slate-50 border border-current opacity-80`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{task.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle size={14} />
                            <span>{task.assignee}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
