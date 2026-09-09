'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  type Node,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  useMissionStore,
  type MissionNode,
  type MissionNodeInput,
  type NodeCategory,
} from '@/lib/store/missionStore';
import { useOrgStore } from '@/lib/store/orgStore';
import Modal from '@/components/ui/Modal';
import {
  Info,
  Settings,
  Zap,
  Building2,
  User,
  Target,
  CheckCircle2,
  Clock,
  X,
  BookOpen,
  Plus,
  Trash2,
  Link2,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES: { value: NodeCategory; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'contact', label: 'Contact' },
  { value: 'lead', label: 'Lead' },
  { value: 'project', label: 'Project' },
  { value: 'task', label: 'Task' },
  { value: 'agent', label: 'Agent' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'automation', label: 'Automation' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'system', label: 'System' },
];

const categoryStyles: Record<NodeCategory, string> = {
  company: 'bg-blue-50 border-blue-200 text-blue-700',
  contact: 'bg-green-50 border-green-200 text-green-700',
  lead: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  project: 'bg-purple-50 border-purple-200 text-purple-700',
  task: 'bg-slate-50 border-slate-200 text-slate-700',
  agent: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  campaign: 'bg-orange-50 border-orange-200 text-orange-700',
  automation: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  knowledge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  system: 'bg-slate-900 border-slate-800 text-white',
};

const categoryIcons: Record<NodeCategory, React.ElementType> = {
  company: Building2,
  contact: User,
  lead: Target,
  project: Zap,
  task: CheckCircle2,
  agent: Settings,
  campaign: Info,
  automation: Zap,
  knowledge: BookOpen,
  system: Settings,
};

const statusColors: Record<MissionNode['status'], string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  completed: 'bg-blue-500',
  alert: 'bg-red-500',
};

const STATUSES: MissionNode['status'][] = ['active', 'pending', 'completed', 'alert'];

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

function MissionNodeCard({ data }: { data: MissionNode }) {
  const Icon = categoryIcons[data.type] ?? Info;

  return (
    <div className={cn('px-4 py-3 rounded-xl border-2 shadow-sm min-w-[150px] transition-all hover:shadow-md', categoryStyles[data.type])}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/50 shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-bold truncate">{data.label}</p>
          <p className="text-[10px] opacity-70 uppercase tracking-wider">{data.type}</p>
        </div>
        <div className={cn('w-2 h-2 rounded-full', statusColors[data.status])} />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />
    </div>
  );
}

export default function MissionMapPage() {
  const nodes = useMissionStore((s) => s.nodes);
  const edges = useMissionStore((s) => s.edges);
  const selectedNodeId = useMissionStore((s) => s.selectedNodeId);
  const setSelectedNode = useMissionStore((s) => s.setSelectedNode);
  const addNode = useMissionStore((s) => s.addNode);
  const updateNode = useMissionStore((s) => s.updateNode);
  const deleteNode = useMissionStore((s) => s.deleteNode);
  const deleteEdge = useMissionStore((s) => s.deleteEdge);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const [rfNodes, setRfNodes] = useState<Node[]>(() =>
    nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: node,
      type: 'missionNode',
    }))
  );
  const [addOpen, setAddOpen] = useState(false);
  const [connectMode, setConnectMode] = useState(false);

  const [prevNodes, setPrevNodes] = useState<MissionNode[]>(nodes);
  if (prevNodes !== nodes) {
    setPrevNodes(nodes);
    setRfNodes(
      nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: node,
        type: 'missionNode',
      }))
    );
  }

  const rfEdges = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.relationship,
        animated: edge.relationship === 'manages',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: '#64748b', fontWeight: 500 },
      })),
    [edges]
  );

  const nodeTypes = useMemo(() => ({ missionNode: MissionNodeCard }), []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_e, node) => {
      if (activeOrgId) updateNode(activeOrgId, node.id, { position: node.position as MissionNode['position'] });
    },
    [activeOrgId, updateNode]
  );

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const cycleStatus = () => {
    if (!selectedNode) return;
    const next = STATUSES[(STATUSES.indexOf(selectedNode.status) + 1) % STATUSES.length];
    if (activeOrgId) updateNode(activeOrgId, selectedNode.id, { status: next });
  };

  const handleAddNode = async (input: MissionNodeInput & { position: { x: number; y: number } }) => {
    if (activeOrgId) await addNode(activeOrgId, input);
    else await addNode('', input);
    setAddOpen(false);
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    if (activeOrgId) await deleteNode(activeOrgId, selectedNode.id);
    else await deleteNode('', selectedNode.id);
    setSelectedNode(null);
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-0 md:gap-6 relative">
      <div className="flex-1 bg-white rounded-none md:rounded-3xl border-0 md:border border-slate-200 shadow-sm overflow-hidden relative">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => {
            setSelectedNode(null);
            setConnectMode(false);
          }}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={(_, edge) => {
            if (connectMode) {
              if (activeOrgId) deleteEdge(activeOrgId, edge.id);
              else deleteEdge('', edge.id);
            }
          }}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
          <div className="hidden md:block">
            <MiniMap
              nodeColor={(n) => {
                const node = nodes.find((sn) => sn.id === n.id);
                if (!node) return '#ccc';
                if (node.type === 'system') return '#0f172a';
                return '#3b82f6';
              }}
              nodeStrokeWidth={3}
            />
          </div>
        </ReactFlow>

        {/* Floating add button */}
        <button
          onClick={() => setAddOpen(true)}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add node
        </button>
      </div>

      {/* Desktop inspector */}
      {selectedNode && (
        <aside className="hidden md:flex w-80 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-xl flex-col overflow-hidden">
          <MissionInspector
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            cycleStatus={cycleStatus}
            onDelete={handleDeleteNode}
          />
        </aside>
      )}

      {/* Mobile bottom sheet */}
      {selectedNode && (
        <div className="md:hidden fixed inset-x-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setSelectedNode(null)} />
          <div
            className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[70dvh] flex flex-col overflow-hidden"
            style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 68px)' }}
          >
            <div className="py-2 flex justify-center shrink-0">
              <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <MissionInspector
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                cycleStatus={cycleStatus}
                onDelete={handleDeleteNode}
              />
            </div>
          </div>
        </div>
      )}

      <AddNodeModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddNode} />
    </div>
  );
}

function MissionInspector({
  node,
  onClose,
  cycleStatus,
  onDelete,
}: {
  node: MissionNode;
  onClose: () => void;
  cycleStatus: () => void;
  onDelete: () => void;
}) {
  const nodes = useMissionStore((s) => s.nodes);
  const addEdge = useMissionStore((s) => s.addEdge);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const [source, setSource] = useState(node.id);
  const [target, setTarget] = useState('');
  const [relationship, setRelationship] = useState('connects');

  const others = nodes.filter((n) => n.id !== node.id);

  const handleConnect = async () => {
    if (!target || source === target) return;
    if (activeOrgId) await addEdge(activeOrgId, { source, target, relationship });
    else await addEdge('', { source, target, relationship });
    setTarget('');
  };

  const Icon = categoryIcons[node.type] ?? Info;

  return (
    <>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Node Inspector
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity</p>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-bold text-slate-800">{node.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Type</p>
            <p className="text-sm font-medium text-slate-700 capitalize">{node.type}</p>
          </div>
          <button onClick={cycleStatus} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-left hover:bg-slate-100 transition-colors">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Status · tap to cycle</p>
            <div className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', statusColors[node.status])} />
              <p className="text-sm font-medium text-slate-700 capitalize">{node.status}</p>
            </div>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</p>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed font-mono break-all">
            {node.data && Object.keys(node.data).length > 0
              ? JSON.stringify(node.data, null, 2)
              : 'No additional metadata for this node.'}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Connect nodes
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Source</label>
              <select className={inputClass} value={source} onChange={(e) => setSource(e.target.value)}>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Target</label>
              <select className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Select...</option>
                {others.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input
            className={inputClass}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Relationship (e.g. manages)"
          />
          <button
            onClick={handleConnect}
            className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Add connection
          </button>
        </div>

        <div className="pt-2 space-y-2">
          <button className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Palette className="w-4 h-4" />
            Configure Node
          </button>
          <button
            onClick={onDelete}
            className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete node
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/30 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          Drag nodes to reposition — changes are saved automatically.
        </div>
      </div>
    </>
  );
}

function AddNodeModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: MissionNodeInput & { position: { x: number; y: number } }) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Add mission node">
      <AddNodeFields onAdd={onAdd} />
    </Modal>
  );
}

function AddNodeFields({
  onAdd,
}: {
  onAdd: (input: MissionNodeInput & { position: { x: number; y: number } }) => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<NodeCategory>('task');
  const [status, setStatus] = useState<MissionNode['status']>('active');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required.');
      return;
    }
    const jitter = () => Math.round((Math.random() - 0.5) * 240);
    onAdd({
      type,
      label: label.trim(),
      status,
      data: {},
      position: { x: jitter(), y: jitter() },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Label *</label>
        <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New storefront" autoFocus />
      </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as NodeCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as MissionNode['status'])}>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <div className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border-2', categoryStyles[type])}>
            {CATEGORIES.find((c) => c.value === type)?.label}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100">
            <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
            {status}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Add node
        </button>
      </form>
  );
}