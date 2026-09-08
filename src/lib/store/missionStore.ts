import { create } from 'zustand';

export type NodeCategory = 'company' | 'contact' | 'lead' | 'project' | 'task' | 'agent' | 'campaign' | 'automation' | 'knowledge' | 'system';

export interface MissionNode {
  id: string;
  type: NodeCategory;
  label: string;
  status: 'active' | 'pending' | 'completed' | 'alert';
  data: any;
  position: { x: number; y: number };
}

export interface MissionEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationship: string;
}

interface MissionStore {
  nodes: MissionNode[];
  edges: MissionEdge[];
  selectedNodeId: string | null;
  setNodes: (nodes: MissionNode[]) => void;
  setEdges: (edges: MissionEdge[]) => void;
  setSelectedNode: (id: string | null) => void;
}

export const useMissionStore = create<MissionStore>((set) => ({
  nodes: [
    { id: 'hhs-core', type: 'system', label: 'HHS Core', status: 'active', data: {}, position: { x: 0, y: 0 } },
    { id: 'agent-1', type: 'agent', label: 'Orchestrator', status: 'active', data: {}, position: { x: 200, y: -100 } },
    { id: 'proj-1', type: 'project', label: 'Storefront Build', status: 'active', data: {}, position: { x: 200, y: 100 } },
    { id: 'comp-1', type: 'company', label: 'Acme Corp', status: 'active', data: {}, position: { x: 400, y: 100 } },
  ],
  edges: [
    { id: 'e1', source: 'hhs-core', target: 'agent-1', relationship: 'manages' },
    { id: 'e2', source: 'hhs-core', target: 'proj-1', relationship: 'tracks' },
    { id: 'e3', source: 'proj-1', target: 'comp-1', relationship: 'client' },
  ],
  selectedNodeId: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
}));
