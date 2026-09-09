'use client';

import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  Handle, 
  Position 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMissionStore, type MissionNode, type MissionEdge, type NodeCategory } from '@/lib/store/missionStore';
import { 
  Info, 
  Settings, 
  Zap, 
  Building2, 
  User, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  X,
  BookOpen
} from 'lucide-react';

// Local cn helper
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// Custom Node Component
const MissionNodeComponent = ({ data }: { data: MissionNode }) => {
  const categoryColors: Record<NodeCategory, string> = {
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

  const Icon = categoryIcons[data.type] || Info;

  const statusColors = {
    active: 'bg-green-500',
    pending: 'bg-yellow-500',
    completed: 'bg-blue-500',
    alert: 'bg-red-500',
  };

  return (
    <div className={cn(
      'px-4 py-3 rounded-xl border-2 shadow-sm min-w-[150px] transition-all hover:shadow-md',
      categoryColors[data.type]
    )}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400" />
      
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/50 shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-bold truncate">{data.label}</p>
          <p className="text-[10px] opacity-70 uppercase tracking-wider">{data.type}</p>
        </div>
        <div className={cn(
          'w-2 h-2 rounded-full',
          statusColors[data.status]
        )} />
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />
    </div>
  );
};

export default function MissionMapPage() {
  const { nodes: storeNodes, edges: storeEdges, selectedNodeId, setSelectedNode } = useMissionStore();

  // Transform store nodes to ReactFlow nodes
  const nodes = useMemo(() => 
    storeNodes.map(node => ({
      id: node.id,
      position: node.position,
      data: node,
      type: 'missionNode',
    })), 
  [storeNodes]);

  // Transform store edges to ReactFlow edges
  const edges = useMemo(() => 
    storeEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.relationship,
      animated: edge.relationship === 'manages',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      labelStyle: { fontSize: 10, fill: '#64748b', fontWeight: 500 },
    })), 
  [storeEdges]);

  const nodeTypes = useMemo(() => ({
    missionNode: MissionNodeComponent,
  }), []);

  const selectedNode = useMemo(() => 
    storeNodes.find(n => n.id === selectedNodeId), 
  [storeNodes, selectedNodeId]);

  return (
    <div className="flex h-full w-full gap-6 overflow-hidden relative">
      <div className="flex-1 h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => setSelectedNode(null)}
          fitView
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={(n) => {
              const node = storeNodes.find(sn => sn.id === n.id);
              if (!node) return '#ccc';
              if (node.type === 'system') return '#0f172a';
              return '#3b82f6';
            }}
            nodeStrokeWidth={3}
          />
        </ReactFlow>
      </div>

      {/* Inspector Panel */}
      {selectedNode && (
        <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Node Inspector
            </h2>
            <button 
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-auto space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity</p>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                   <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-bold text-slate-800">{selectedNode.label}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Type</p>
                <p className="text-sm font-medium text-slate-700 capitalize">{selectedNode.type}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Status</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    selectedNode.status === 'active' ? 'bg-green-500' : 
                    selectedNode.status === 'pending' ? 'bg-yellow-500' : 
                    selectedNode.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                  )} />
                  <p className="text-sm font-medium text-slate-700 capitalize">{selectedNode.status}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed">
                {Object.keys(selectedNode.data).length > 0 
                  ? JSON.stringify(selectedNode.data, null, 2)
                  : 'No additional metadata available for this node.'
                }
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Settings className="w-4 h-4" />
                Configure Node
              </button>
              <button className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Target className="w-4 h-4" />
                View Dependencies
              </button>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Last updated 2 hours ago</span>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
  );
}