import { create } from 'zustand';
import type { MissionEdgeRow, MissionMapRow, MissionNodeRow, MissionRunRow } from '@/lib/supabase/types';
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

export interface MissionMap {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
}

export interface MissionNode {
  [key: string]: unknown;
  id: string;
  mapId: string;
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
  mapId: string;
  source: string;
  target: string;
  relationship: string;
}

export type MissionEdgeInput = Omit<MissionEdge, 'id' | 'mapId'>;

export interface MissionRun {
  id: string;
  mapId: string;
  status: MissionRunRow['status'];
  trigger: MissionRunRow['trigger'];
  createdAt: string;
  error: string | null;
}

const seedMap: MissionMap = {
  id: 'local-default-map',
  orgId: 'local',
  name: 'Mission Control',
  description: 'Default operational workflow map.',
  status: 'active',
};

const seedNodes: MissionNode[] = [
  { id: 'hhs-core', mapId: seedMap.id, type: 'system', label: 'HHS Core', status: 'active', data: {}, position: { x: 0, y: 0 } },
  { id: 'agent-1', mapId: seedMap.id, type: 'agent', label: 'Orchestrator', status: 'active', data: {}, position: { x: 200, y: -100 } },
  { id: 'proj-1', mapId: seedMap.id, type: 'project', label: 'Storefront Build', status: 'active', data: {}, position: { x: 200, y: 100 } },
  { id: 'comp-1', mapId: seedMap.id, type: 'company', label: 'Acme Corp', status: 'active', data: {}, position: { x: 400, y: 100 } },
];

const seedEdges: MissionEdge[] = [
  { id: 'e1', mapId: seedMap.id, source: 'hhs-core', target: 'agent-1', relationship: 'manages' },
  { id: 'e2', mapId: seedMap.id, source: 'hhs-core', target: 'proj-1', relationship: 'tracks' },
  { id: 'e3', mapId: seedMap.id, source: 'proj-1', target: 'comp-1', relationship: 'client' },
];

function mapMissionMap(row: MissionMapRow): MissionMap {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    status: row.status,
  };
}

function mapNode(row: MissionNodeRow): MissionNode {
  return {
    id: row.id,
    mapId: row.map_id,
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
    mapId: row.map_id,
    source: row.source,
    target: row.target,
    relationship: row.relationship ?? 'connects',
  };
}

function mapRun(row: MissionRunRow): MissionRun {
  return {
    id: row.id,
    mapId: row.map_id,
    status: row.status,
    trigger: row.trigger,
    createdAt: row.created_at,
    error: row.error,
  };
}

function savedMapKey(orgId: string) {
  return `hhs-active-mission-map:${orgId}`;
}

interface MissionStore {
  maps: MissionMap[];
  activeMapId: string | null;
  nodes: MissionNode[];
  edges: MissionEdge[];
  runs: MissionRun[];
  selectedNodeId: string | null;
  loading: boolean;
  loadedOrgId: string | null;
  setSelectedNode: (id: string | null) => void;
  setActiveMap: (orgId: string, mapId: string) => Promise<void>;
  load: (orgId: string) => Promise<void>;
  createMap: (orgId: string, name: string) => Promise<MissionMap | null>;
  addNode: (
    orgId: string,
    input: MissionNodeInput & { position: { x: number; y: number } }
  ) => Promise<MissionNode | null>;
  updateNode: (orgId: string, id: string, updates: Partial<MissionNode>) => Promise<void>;
  deleteNode: (orgId: string, id: string) => Promise<void>;
  addEdge: (orgId: string, input: MissionEdgeInput) => Promise<MissionEdge | null>;
  deleteEdge: (orgId: string, id: string) => Promise<void>;
  runActiveMap: (orgId: string, instructions?: string) => Promise<MissionRun | null>;
  subscribe: (orgId: string) => () => void;
}

async function loadMapData(orgId: string, mapId: string) {
  const supabase = createClient();
  const [{ data: nodes }, { data: edges }, { data: runs }] = await Promise.all([
    supabase.from('mission_nodes').select('*').eq('org_id', orgId).eq('map_id', mapId),
    supabase.from('mission_edges').select('*').eq('org_id', orgId).eq('map_id', mapId),
    supabase.from('mission_runs').select('*').eq('org_id', orgId).eq('map_id', mapId).order('created_at', { ascending: false }).limit(8),
  ]);

  return {
    nodes: nodes?.map(mapNode) ?? [],
    edges: edges?.map(mapEdge) ?? [],
    runs: runs?.map(mapRun) ?? [],
  };
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  maps: [seedMap],
  activeMapId: seedMap.id,
  nodes: seedNodes,
  edges: seedEdges,
  runs: [],
  selectedNodeId: null,
  loading: false,
  loadedOrgId: null,

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  setActiveMap: async (orgId, mapId) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(savedMapKey(orgId), mapId);
    set({ activeMapId: mapId, selectedNodeId: null, loading: true });

    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }

    const data = await loadMapData(orgId, mapId);
    set({ ...data, loading: false });
  },

  load: async (orgId) => {
    if (get().loadedOrgId === orgId) return;
    set({ loading: true, loadedOrgId: orgId });

    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }

    const supabase = createClient();
    const { data: mapRows } = await supabase
      .from('mission_maps')
      .select('*')
      .eq('org_id', orgId)
      .neq('status', 'archived')
      .order('created_at', { ascending: true });

    let maps = mapRows?.map(mapMissionMap) ?? [];

    if (maps.length === 0) {
      const { data: created } = await supabase
        .from('mission_maps')
        .insert({ org_id: orgId, name: 'Mission Control', description: 'Default operational workflow map.' })
        .select('*')
        .single();
      if (created) maps = [mapMissionMap(created)];
    }

    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(savedMapKey(orgId)) : null;
    const activeMapId = maps.find((map) => map.id === saved)?.id ?? maps[0]?.id ?? null;

    if (!activeMapId) {
      set({ maps, activeMapId: null, nodes: [], edges: [], runs: [], loading: false });
      return;
    }

    const data = await loadMapData(orgId, activeMapId);
    set({ maps, activeMapId, ...data, loading: false });
  },

  createMap: async (orgId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    if (!isSupabaseConfigured) {
      const map: MissionMap = {
        id: crypto.randomUUID(),
        orgId,
        name: trimmed,
        description: null,
        status: 'active',
      };
      set((s) => ({ maps: [...s.maps, map] }));
      await get().setActiveMap(orgId, map.id);
      return map;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('mission_maps')
      .insert({ org_id: orgId, name: trimmed, status: 'active' })
      .select('*')
      .single();

    if (error || !data) {
      console.error('createMap failed', error);
      return null;
    }

    const map = mapMissionMap(data);
    set((s) => ({ maps: [...s.maps, map] }));
    await get().setActiveMap(orgId, map.id);
    return map;
  },

  addNode: async (orgId, input) => {
    const mapId = get().activeMapId;
    if (!mapId) return null;

    const id = crypto.randomUUID();
    const node: MissionNode = {
      id,
      mapId,
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
          map_id: mapId,
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
    const mapId = get().activeMapId;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
    if (!isSupabaseConfigured || !mapId) return;

    const supabase = createClient();
    const patch: Record<string, unknown> = { ...updates };
    delete patch.id;
    delete patch.mapId;
    if (updates.position) {
      patch.position_x = updates.position.x;
      patch.position_y = updates.position.y;
      delete patch.position;
    }
    const { error } = await supabase
      .from('mission_nodes')
      .update(patch)
      .eq('org_id', orgId)
      .eq('map_id', mapId)
      .eq('id', id);
    if (error) console.error('updateNode failed', error);
  },

  deleteNode: async (orgId, id) => {
    const mapId = get().activeMapId;
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    if (!isSupabaseConfigured || !mapId) return;
    const supabase = createClient();
    const { error } = await supabase.from('mission_nodes').delete().eq('org_id', orgId).eq('map_id', mapId).eq('id', id);
    if (error) console.error('deleteNode failed', error);
  },

  addEdge: async (orgId, input) => {
    const mapId = get().activeMapId;
    if (!mapId) return null;
    const edge: MissionEdge = { id: crypto.randomUUID(), mapId, ...input };

    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('mission_edges')
        .insert({ org_id: orgId, map_id: mapId, source: edge.source, target: edge.target, relationship: edge.relationship })
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
    const mapId = get().activeMapId;
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
    if (!isSupabaseConfigured || !mapId) return;
    const supabase = createClient();
    const { error } = await supabase.from('mission_edges').delete().eq('org_id', orgId).eq('map_id', mapId).eq('id', id);
    if (error) console.error('deleteEdge failed', error);
  },

  runActiveMap: async (orgId, instructions) => {
    const mapId = get().activeMapId;
    if (!mapId) return null;

    if (!isSupabaseConfigured) {
      const run: MissionRun = {
        id: crypto.randomUUID(),
        mapId,
        status: 'queued',
        trigger: 'manual',
        createdAt: new Date().toISOString(),
        error: null,
      };
      set((s) => ({ runs: [run, ...s.runs].slice(0, 8) }));
      return run;
    }

    const response = await fetch('/api/mission/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, mapId, instructions }),
    });
    const payload = (await response.json()) as { run?: MissionRun; error?: string };
    if (!response.ok || !payload.run) {
      console.error('runActiveMap failed', payload.error);
      return null;
    }
    set((s) => ({ runs: [payload.run!, ...s.runs].slice(0, 8) }));
    return payload.run;
  },

  subscribe: (orgId) => {
    if (!isSupabaseConfigured) return () => {};
    const supabase = createClient();
    const refresh = async () => {
      const { activeMapId } = get();
      const { data: maps } = await supabase
        .from('mission_maps')
        .select('*')
        .eq('org_id', orgId)
        .neq('status', 'archived')
        .order('created_at', { ascending: true });
      const mappedMaps = maps?.map(mapMissionMap) ?? [];
      const nextMapId = activeMapId && mappedMaps.some((map) => map.id === activeMapId) ? activeMapId : mappedMaps[0]?.id ?? null;

      if (!nextMapId) {
        set({ maps: mappedMaps, activeMapId: null, nodes: [], edges: [], runs: [] });
        return;
      }

      const data = await loadMapData(orgId, nextMapId);
      set({ maps: mappedMaps, activeMapId: nextMapId, ...data });
    };

    const mapsChannel = supabase
      .channel(`mission-maps-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_maps', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    const nodesChannel = supabase
      .channel(`mission-nodes-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_nodes', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    const edgesChannel = supabase
      .channel(`mission-edges-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_edges', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();
    const runsChannel = supabase
      .channel(`mission-runs-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_runs', filter: `org_id=eq.${orgId}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(mapsChannel);
      supabase.removeChannel(nodesChannel);
      supabase.removeChannel(edgesChannel);
      supabase.removeChannel(runsChannel);
    };
  },
}));
