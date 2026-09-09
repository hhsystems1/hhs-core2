import { create } from 'zustand';
import type { MissionEdgeRow, MissionNodeRow } from '@/lib/supabase/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export type NodeCategory =
  | 'company'
  | 'contact'
  | 'lead'
  | 'project'
  | 'task'
  | 'agent'
  | 'campaign'
  | 'automation'
  | 'knowledge'
  | 'system';

export interface MissionNode {
  [key: string]: unknown;
  id: string;
  type: NodeCategory;
  label: string;
  status: 'active' | 'pending' | 'completed' | 'alert';
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export type MissionNodeInput = {
  type: NodeCategory;
  label: string;
  status: MissionNode['status'];
  data?: Record<string, unknown>;
};

export interface MissionEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export type MissionEdgeInput = Omit<MissionEdge, 'id'>;

const seedNodes: MissionNode[] = [
  { id: 'hhs-core', type: 'system', label: 'HHS Core', status: 'active', data: {}, position: { x: 0, y: 0 } },
  { id: 'agent-1', type: 'agent', label: 'Orchestrator', status: 'active', data: {}, position: { x: 200, y: -100 } },
  { id: 'proj-1', type: 'project', label: 'Storefront Build', status: 'active', data: {}, position: { x: 200, y: 100 } },
  { id: 'comp-1', type: 'company', label: 'Acme Corp', status: 'active', data: {}, position: { x: 400, y: 100 } },
];

const seedEdges: MissionEdge[] = [
  { id: 'e1', source: 'hhs-core', target: 'agent-1', relationship: 'manages' },
  { id: 'e2', source: 'hhs-core', target: 'proj-1', relationship: 'tracks' },
  { id: 'e3', source: 'proj-1', target: 'comp-1', relationship: 'client' },
];

function mapNode(row: MissionNodeRow): MissionNode {
  return {
    id: row.id,
    type: row.type as NodeCategory,
    label: row.label,
    status: row.status,
    data: (row.data ?? {}) as Record<string, unknown>,
    position: { x: row.position_x ?? 0, y: row.position_y ?? 0 },
  };
}

function mapEdge(row: MissionEdgeRow): MissionEdge {
  return {
    id: row.id,
    source: row.source,
    target: row.target,
    relationship: row.relationship ?? 'connects',
  };
}

interface MissionStore {
  nodes: MissionNode[];
  edges: MissionEdge[];
  selectedNodeId: string | null;
  loading: boolean;
  loadedOrgId: string | null;
  setNodes: (nodes: MissionNode[]) => void;
  setEdges: (edges: MissionEdge[]) => void;
  setSelectedNode: (id: string | null) => void;
  load: (orgId: string) => Promise<void>;
  addNode: (
    orgId: string,
    input: MissionNodeInput & { position: { x: number; y: number } }
  ) => Promise<MissionNode | null>;
  updateNode: (orgId: string, id: string, updates: Partial<MissionNode>) => Promise<void>;
  deleteNode: (orgId: string, id: string) => Promise<void>;
  addEdge: (orgId: string, input: MissionEdgeInput) => Promise<MissionEdge | null>;
  deleteEdge: (orgId: string, id: string) => Promise<void>;
  subscribe: (orgId: string) => () => void;
}

export const useMissionStore = create<MissionStore>((set) => ({
  nodes: seedNodes,
  edges: seedEdges,
  selectedNodeId: null,
  loading: false,
  loadedOrgId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),

  load: async (orgId) => {
    if (useMissionStore.getState().loadedOrgId === orgId) return;
    set({ loading: true, loadedOrgId: orgId });
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    const supabase = createClient();
    const [{ data: nodes }, { data: edges }] = await Promise.all([
      supabase.from('mission_nodes').select('*').eq('org_id', orgId),
      supabase.from('mission_edges').select('*').eq('org_id', orgId),
    ]);
    if (nodes) set({ nodes: nodes.map(mapNode) });
    if (edges) set({ edges: edges.map(mapEdge) });
    set({ loading: false });
  },

  addNode: async (orgId, input) => {
    const id = crypto.randomUUID();
    const node: MissionNode = {
      id,
      ...input,
      data: (input.data ?? {}) as Record<string, unknown>,
      position: input.position,
    };
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('mission_nodes')
        .insert({
          org_id: orgId,
          type: node.type,
          label: node.label,
          status: node.status,
          data: node.data,
          position_x: node.position.x,
          position_y: node.position.y,
        })
        .select('*')
        .single();
      if (error || !data) {
        console.error('addNode failed', error);
        return null;
      }
      const saved = mapNode(data);
      set((s) => ({ nodes: [...s.nodes, saved] }));
      return saved;
    }
    set((s) => ({ nodes: [...s.nodes, node] }));
    return node;
  },

  updateNode: async (orgId, id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id) return n;
        const next = { ...n, ...updates };
        return next;
      }),
    }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const patch: Record<string, unknown> = { ...updates };
    if (updates.position) {
      patch.position_x = updates.position.x;
      patch.position_y = updates.position.y;
      delete patch.position;
    }
    const { error } = await supabase
      .from('mission_nodes')
      .update(patch)
      .eq('org_id', orgId)
      .eq('id', id);
    if (error) console.error('updateNode failed', error);
  },

  deleteNode: async (orgId, id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { error } = await supabase.from('mission_nodes').delete().eq('org_id', orgId).eq('id', id);
    if (error) console.error('deleteNode failed', error);
  },

  addEdge: async (orgId, input) => {
    const edge: MissionEdge = { id: crypto.randomUUID(), ...input };
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('mission_edges')
        .insert({ org_id: orgId, source: edge.source, target: edge.target, relationship: edge.relationship })
        .select('*')
        .single();
      if (error || !data) {
        console.error('addEdge failed', error);
        return null;
      }
      const saved = mapEdge(data);
      set((s) => ({ edges: [...s.edges, saved] }));
      return saved;
    }
    set((s) => ({ edges: [...s.edges, edge] }));
    return edge;
  },

  deleteEdge: async (orgId, id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { error } = await supabase.from('mission_edges').delete().eq('org_id', orgId).eq('id', id);
    if (error) console.error('deleteEdge failed', error);
  },

  subscribe: (orgId) => {
    if (!isSupabaseConfigured) return () => {};
    const supabase = createClient();
    const refresh = async () => {
      const [{ data: nodes }, { data: edges }] = await Promise.all([
        supabase.from('mission_nodes').select('*').eq('org_id', orgId),
        supabase.from('mission_edges').select('*').eq('org_id', orgId),
      ]);
      if (nodes) set({ nodes: nodes.map(mapNode) });
      if (edges) set({ edges: edges.map(mapEdge) });
    };
    const nodesChannel = supabase
      .channel(`mission-nodes-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_nodes', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    const edgesChannel = supabase
      .channel(`mission-edges-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_edges', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(nodesChannel);
      supabase.removeChannel(edgesChannel);
    };
  },
}));