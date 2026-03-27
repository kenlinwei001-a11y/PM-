import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { OntologyGraph, OntologyNode, OntologyEdge, mockOntologyGraph, mockProjects, STAGE_ONTOLOGY_LIST, StageOntology, OntologyMan, OntologyMachine, OntologyMaterial, OntologyMethod, OntologyMeasurement, OntologyCost, OntologyRule } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ReactFlow, Background, Controls, Node as FlowNode, Edge as FlowEdge, MarkerType, addEdge, applyNodeChanges, applyEdgeChanges, Connection, NodeChange, EdgeChange, useReactFlow, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Settings, User, Package, BookOpen, Cloud, Search, DollarSign, FileText, Plus, Save, Layers, Table, Code } from 'lucide-react';
import { toast } from 'sonner';

const NODE_COLORS = {
  project: '#3b82f6', // blue
  process: '#f97316', // orange
  man: '#22c55e', // green
  machine: '#10b981', // emerald
  material: '#a855f7', // purple
  method: '#6366f1', // indigo
  environment: '#06b6d4', // cyan
  measurement: '#ec4899', // pink
  cost: '#eab308', // yellow
  rule: '#ef4444', // red
};

const CATEGORIES = [
  { id: 'project', label: '项目', icon: Network, color: NODE_COLORS.project },
  { id: 'process', label: '工艺', icon: Settings, color: NODE_COLORS.process },
  { id: 'man', label: '人', icon: User, color: NODE_COLORS.man },
  { id: 'machine', label: '设备', icon: Settings, color: NODE_COLORS.machine },
  { id: 'material', label: '物料', icon: Package, color: NODE_COLORS.material },
  { id: 'method', label: '方法', icon: BookOpen, color: NODE_COLORS.method },
  { id: 'environment', label: '环境', icon: Cloud, color: NODE_COLORS.environment },
  { id: 'measurement', label: '检测', icon: Search, color: NODE_COLORS.measurement },
  { id: 'cost', label: '成本', icon: DollarSign, color: NODE_COLORS.cost },
  { id: 'rule', label: '规则', icon: FileText, color: NODE_COLORS.rule },
];

// 10个主工序列表
const PROCESS_LIST = [
  { id: 'all', name: '全部工序' },
  { id: 'S01', name: '01 需求对接' },
  { id: 'S02', name: '02 定制化设计' },
  { id: 'S03', name: '03 非标工艺规划' },
  { id: 'S04', name: '04 定制化物料采购' },
  { id: 'S05', name: '05 铆焊组对' },
  { id: 'S06', name: '06 定制化机加工序' },
  { id: 'S07', name: '07 总装试压' },
  { id: 'S08', name: '08 定制化检测认证' },
  { id: 'S09', name: '09 现场安装调试' },
  { id: 'S10', name: '10 回款结算' },
];

// 项目列表
const PROJECT_LIST = mockProjects.map(p => ({ id: p.id, name: p.name }));

// Inner component that uses useReactFlow
function OntologyGraphCenterInner() {
  const [viewMode, setViewMode] = useState<'graph' | 'table' | 'dsl'>('graph');
  const [graphData, setGraphData] = useState<OntologyGraph>(mockOntologyGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>(PROJECT_LIST[0]?.id || '');
  const [expandedProcessId, setExpandedProcessId] = useState<string | null>(null);
  const { setCenter, fitView } = useReactFlow();

  // Debug: log node count
  useEffect(() => {
    console.log('OntologyGraphCenter - nodes count:', graphData.nodes.length);
    console.log('OntologyGraphCenter - edges count:', graphData.edges.length);
    console.log('OntologyGraphCenter - first node:', graphData.nodes[0]);
    console.log('OntologyGraphCenter - process nodes:', graphData.nodes.filter(n => n.type === 'process').length);
  }, [graphData]);

  // Filter nodes and edges based on selected process
  const filteredData = useMemo(() => {
    console.log('filteredData - selectedProcess:', selectedProcess);
    console.log('filteredData - graphData.nodes count:', graphData.nodes.length);
    if (selectedProcess === 'all') {
      return graphData;
    }

    // Find the selected process node
    const processNode = graphData.nodes.find(n => n.id === selectedProcess);
    if (!processNode) return graphData;

    // Find all edges connected to this process
    const connectedEdges = graphData.edges.filter(
      e => e.source === selectedProcess || e.target === selectedProcess
    );

    // Find all connected node IDs
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(selectedProcess);
    connectedEdges.forEach(e => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    // Filter nodes
    const filteredNodes = graphData.nodes.filter(n => connectedNodeIds.has(n.id));

    return {
      nodes: filteredNodes,
      edges: connectedEdges
    };
  }, [graphData, selectedProcess]);

  // Convert OntologyGraph to ReactFlow format
  const initialNodes: FlowNode[] = useMemo(() => {
    const isAllView = selectedProcess === 'all';
    // Get all process nodes from the full graph data, not just filtered
    const allProcessNodes = graphData.nodes.filter(n => n.type === 'process');
    const otherNodes = graphData.nodes.filter(n => n.type !== 'process');

    console.log('initialNodes - allProcessNodes:', allProcessNodes.length);
    console.log('initialNodes - expandedProcessId:', expandedProcessId);

    const nodes: FlowNode[] = [];

    if (isAllView) {
      // Layout: process nodes in a horizontal line
      const processSpacing = 280;
      const startX = 150;
      const centerY = 300;

      allProcessNodes.forEach((process, index) => {
        const x = startX + index * processSpacing;
        const y = centerY;

        const isSelected = selectedNodeId === process.id;
        const isExpanded = expandedProcessId === process.id;

        nodes.push({
          id: process.id,
          type: 'default',
          position: { x, y },
          data: {
            label: process.name,
            isExpanded,
            isProcess: true,
          },
          style: {
            background: NODE_COLORS[process.type as keyof typeof NODE_COLORS] || '#666',
            color: 'white',
            border: isSelected ? '4px solid #fff' : isExpanded ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.5)',
            borderRadius: '10px',
            padding: isSelected ? '20px 36px' : '14px 28px',
            fontWeight: 'bold',
            fontSize: isSelected ? '16px' : '14px',
            zIndex: isSelected ? 1000 : 20,
            boxShadow: isSelected ? '0 0 30px rgba(59, 130, 246, 0.8)' : isExpanded ? '0 0 20px rgba(59, 130, 246, 0.5)' : '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '160px',
            maxWidth: '220px',
            textAlign: 'center',
            cursor: 'pointer',
            opacity: 1,
          }
        });

        // Only show connected nodes if this process is expanded
        if (isExpanded) {
          // Find 6M elements connected to this process
          const connectedEdges = graphData.edges.filter(e => e.source === process.id);
          const connectedNodeIds = connectedEdges.map(e => e.target);
          const connectedNodes = otherNodes.filter(n => connectedNodeIds.includes(n.id));

          console.log(`Process ${process.id} has ${connectedNodes.length} connected nodes`);

          connectedNodes.forEach((node, nodeIndex) => {
            // Position in a semi-circle above the process node
            const totalConnected = connectedNodes.length;
            const angleStep = Math.PI / (totalConnected + 1);
            const angle = Math.PI + (nodeIndex + 1) * angleStep;
            const radius = 160;
            const nodeX = x + radius * Math.cos(angle);
            const nodeY = y - 60 + radius * Math.sin(angle) * 0.7;

            const isNodeSelected = selectedNodeId === node.id;
            nodes.push({
              id: node.id,
              type: 'default',
              position: { x: nodeX, y: nodeY },
              data: { label: node.name },
              style: {
                background: NODE_COLORS[node.type as keyof typeof NODE_COLORS] || '#888',
                color: 'white',
                border: isNodeSelected ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: isNodeSelected ? '10px 18px' : '6px 12px',
                fontSize: isNodeSelected ? '13px' : '11px',
                fontWeight: isNodeSelected ? 'bold' : 'normal',
                zIndex: isNodeSelected ? 1000 : 10,
                boxShadow: isNodeSelected ? '0 0 15px rgba(59, 130, 246, 0.6)' : '0 2px 6px rgba(0,0,0,0.2)',
                minWidth: '80px',
                maxWidth: '130px',
                textAlign: 'center',
                cursor: 'pointer',
                opacity: 0.95,
              }
            });
          });
        }
      });
    } else {
      // Single process view: Star layout with process in center
      const centerX = 400;
      const centerY = 300;
      const radius = 180;

      const processNodes = filteredData.nodes.filter(n => n.type === 'process');
      const filteredOtherNodes = filteredData.nodes.filter(n => n.type !== 'process');

      processNodes.forEach(process => {
        const isSelected = selectedNodeId === process.id;
        nodes.push({
          id: process.id,
          type: 'default',
          position: { x: centerX, y: centerY },
          data: { label: process.name },
          style: {
            background: NODE_COLORS[process.type as keyof typeof NODE_COLORS] || '#666',
            color: 'white',
            border: isSelected ? '4px solid #fff' : '2px solid rgba(255,255,255,0.5)',
            borderRadius: '12px',
            padding: isSelected ? '32px 64px' : '16px 32px',
            fontWeight: 'bold',
            fontSize: isSelected ? '24px' : '16px',
            zIndex: isSelected ? 1000 : 10,
            boxShadow: isSelected ? '0 0 40px rgba(59, 130, 246, 0.9)' : '0 6px 20px rgba(0,0,0,0.3)',
            minWidth: '180px',
            maxWidth: '280px',
            textAlign: 'center',
            cursor: 'pointer',
            opacity: 1,
          }
        });

        // Position 6M elements in a circle around the process
        filteredOtherNodes.forEach((node, index) => {
          const angle = (index / Math.max(filteredOtherNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
          const nodeX = centerX + radius * Math.cos(angle);
          const nodeY = centerY + radius * Math.sin(angle);

          const isNodeSelected = selectedNodeId === node.id;
          nodes.push({
            id: node.id,
            type: 'default',
            position: { x: nodeX, y: nodeY },
            data: { label: node.name },
            style: {
              background: NODE_COLORS[node.type as keyof typeof NODE_COLORS] || '#888',
              color: 'white',
              border: isNodeSelected ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: isNodeSelected ? '16px 32px' : '8px 16px',
              fontSize: isNodeSelected ? '16px' : '12px',
              fontWeight: isNodeSelected ? 'bold' : 'normal',
              zIndex: isNodeSelected ? 1000 : 5,
              boxShadow: isNodeSelected ? '0 0 25px rgba(59, 130, 246, 0.7)' : '0 3px 10px rgba(0,0,0,0.25)',
              minWidth: '110px',
              maxWidth: '180px',
              textAlign: 'center',
              cursor: 'pointer',
              opacity: 0.95,
            }
          });
        });
      });
    }

    console.log('Total nodes created:', nodes.length);
    return nodes;
  }, [graphData, filteredData, selectedProcess, selectedNodeId, expandedProcessId]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    // Only show edges for the expanded process in all view
    if (selectedProcess === 'all') {
      const allProcessNodes = graphData.nodes.filter(n => n.type === 'process');
      const processIds = allProcessNodes.map(p => p.id).sort();

      // Create sequential edges between main process nodes (S01 -> S02 -> S03 ...)
      const processSequenceEdges: FlowEdge[] = [];
      for (let i = 0; i < processIds.length - 1; i++) {
        processSequenceEdges.push({
          id: `seq-${processIds[i]}-${processIds[i+1]}`,
          source: processIds[i],
          target: processIds[i+1],
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#3b82f6', strokeWidth: 3 },
          animated: false,
        });
      }

      // If a process is expanded, also show its connected nodes
      let expandedEdges: FlowEdge[] = [];
      if (expandedProcessId) {
        expandedEdges = graphData.edges
          .filter(e => e.source === expandedProcessId)
          .map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.type,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            labelStyle: { fill: '#64748b', fontWeight: 500 },
          }));
      }

      return [...processSequenceEdges, ...expandedEdges];
    }
    // Single process view - show all edges
    return filteredData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      labelStyle: { fill: '#64748b', fontWeight: 500 },
    }));
  }, [filteredData, graphData, selectedProcess, expandedProcessId]);

  // Use memoized values directly instead of useState to avoid initialization issues
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);

  // Debug: Add test node if no nodes
  useEffect(() => {
    if (nodes.length === 0 && initialNodes.length > 0) {
      console.warn('Nodes array is empty but initialNodes has', initialNodes.length, 'items');
      // Force set nodes
      setNodes(initialNodes);
    }
  }, [nodes.length, initialNodes]);

  // Update nodes and edges when filter changes
  useEffect(() => {
    console.log('Setting nodes:', initialNodes.length, 'edges:', initialEdges.length);
    if (initialNodes.length > 0) {
      console.log('Sample node:', JSON.stringify(initialNodes[0], null, 2));
    }
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  // Center view when selected process changes or nodes update
  useEffect(() => {
    if (viewMode !== 'graph') return;
    if (nodes.length === 0) {
      console.log('No nodes to fit view');
      return;
    }

    console.log('Fitting view for', nodes.length, 'nodes');

    // Delay to ensure nodes are rendered in DOM
    const timer = setTimeout(() => {
      if (selectedProcess === 'all') {
        // If a process is expanded, center on it with some padding for its children
        if (expandedProcessId) {
          const processNode = nodes.find(n => n.id === expandedProcessId);
          if (processNode) {
            const x = processNode.position.x;
            const y = processNode.position.y;
            setCenter(x, y - 50, { zoom: 1.0, duration: 600 });
          }
        } else {
          // Fit all main process nodes
          fitView({
            padding: 0.1,
            duration: 600,
            minZoom: 0.4,
            maxZoom: 1.0
          });
        }
      } else {
        // Find the selected process node and center on it
        const processNode = nodes.find(n => n.id === selectedProcess);
        if (processNode) {
          const x = processNode.position.x;
          const y = processNode.position.y;
          setCenter(x, y, { zoom: 1.2, duration: 600 });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedProcess, nodes, viewMode, fitView, setCenter, expandedProcessId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    []
  );

  const selectedNode = useMemo(() => {
    return graphData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData]);

  // Get ontology data for selected process node
  const selectedOntology = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'process') return null;
    const stageData = STAGE_ONTOLOGY_LIST.find(s => s.stage === selectedNode.id);
    return stageData?.node.ontology || null;
  }, [selectedNode]);

  const handleNodeClick = (_: React.MouseEvent, node: FlowNode) => {
    const clickedNodeData = node.data;
    // Check if clicked node is a process node
    const isProcessNode = graphData.nodes.find(n => n.id === node.id)?.type === 'process';

    if (isProcessNode) {
      // Toggle expand/collapse for process nodes
      setExpandedProcessId(prev => prev === node.id ? null : node.id);
    }
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
    setExpandedProcessId(null);
  };

  const handleSave = () => {
    toast.success('图谱已保存并发布');
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-xl font-medium">企业项目图谱中心</h2>
          <div className="flex bg-muted p-1 rounded-md">
            <button 
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 text-sm font-mono rounded-sm flex items-center gap-2 ${viewMode === 'graph' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <Network className="w-4 h-4" /> Graph
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm font-mono rounded-sm flex items-center gap-2 ${viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <Table className="w-4 h-4" /> Table
            </button>
            <button 
              onClick={() => setViewMode('dsl')}
              className={`px-3 py-1 text-sm font-mono rounded-sm flex items-center gap-2 ${viewMode === 'dsl' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <Code className="w-4 h-4" /> DSL
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <span>当前版本: <strong className="text-foreground">v2.1.0</strong></span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">已生效</span>
          </div>
          <Button onClick={handleSave} className="rounded-none font-mono uppercase tracking-wider">
            <Save className="w-4 h-4 mr-2" /> 保存并发布
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Project Select + Process Filter + Ontology Navigator */}
        <Card className="w-64 flex flex-col rounded-none border-border shadow-none">
          {/* Project Selection */}
          <div className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider mb-3">项目选择</CardTitle>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-background border border-border p-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
            >
              {PROJECT_LIST.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
            {selectedProject && (
              <div className="mt-2 text-xs text-muted-foreground">
                当前项目: <span className="text-primary font-medium">{PROJECT_LIST.find(p => p.id === selectedProject)?.name}</span>
              </div>
            )}
          </div>

          {/* Process Filter */}
          <div className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-mono uppercase tracking-wider mb-3">工序筛选</CardTitle>
            <div className="space-y-1 max-h-[180px] overflow-y-auto">
              {PROCESS_LIST.map(proc => (
                <button
                  key={proc.id}
                  onClick={() => {
                    setSelectedProcess(proc.id);
                    setExpandedProcessId(null); // Clear expanded when switching filter
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors border-l-2 ${
                    selectedProcess === proc.id
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <span>{proc.name}</span>
                  {proc.id !== 'all' && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {graphData.edges.filter(e => e.source === proc.id).length} 关联
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">本体分类树</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {CATEGORIES.map(cat => (
                <div key={cat.id} className="group flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer rounded-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <cat.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {filteredData.nodes.filter(n => n.type === cat.id).length}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Middle: Graph Editor */}
        <Card className="flex-1 flex flex-col rounded-none border-border shadow-none overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row justify-between items-center">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-mono uppercase tracking-wider">项目图谱画布</CardTitle>
              <span className="text-xs text-muted-foreground">
                💡 点击主干节点展开/收起关联节点
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs font-mono rounded-none">
                <Plus className="w-3 h-3 mr-1" /> 新增实体
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            {viewMode === 'graph' && (
              <div className="w-full h-full absolute inset-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={handleNodeClick}
                  onPaneClick={handlePaneClick}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                  minZoom={0.2}
                  maxZoom={2}
                  className="bg-slate-50"
                  style={{ width: '100%', height: '100%' }}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  elementsSelectable={true}
                  zoomOnScroll={true}
                  panOnScroll={false}
                  panOnDrag={true}
                  attributionPosition="bottom-right"
                  defaultEdgeOptions={{
                    type: 'default',
                    animated: false,
                  }}
                  proOptions={{ hideAttribution: false }}
                >
                  <Background color="#94a3b8" gap={20} size={1} />
                  <Controls />
                </ReactFlow>
              </div>
            )}
            {viewMode === 'dsl' && (
              <div className="p-4 h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm overflow-auto whitespace-pre">
                {selectedProcess === 'all' ? (
                  <pre>{`// 全部工序 DSL 定义
${filteredData.nodes.filter(n => n.type === 'process').map(p => {
  const pEdges = filteredData.edges.filter(e => e.source === p.id);
  const uses = pEdges.filter(e => e.type === 'uses').map(e => {
    const target = filteredData.nodes.find(n => n.id === e.target);
    return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
  }).join('\n');
  const consumes = pEdges.filter(e => e.type === 'consumes').map(e => {
    const target = filteredData.nodes.find(n => n.id === e.target);
    return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
  }).join('\n');
  const constrained = pEdges.filter(e => e.type === 'constrained_by').map(e => {
    const target = filteredData.nodes.find(n => n.id === e.target);
    return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
  }).join('\n');
  const requires = pEdges.filter(e => e.type === 'requires').map(e => {
    const target = filteredData.nodes.find(n => n.id === e.target);
    return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
  }).join('\n');
  return `PROCESS: ${p.id}
NAME: "${p.name}"
PROPERTIES:
  defaultTime: ${p.properties.defaultTime}h
  riskLevel: "${p.properties.riskLevel}"

USES:
${uses || '  (无)'}

CONSUMES:
${consumes || '  (无)'}

CONSTRAINED_BY:
${constrained || '  (无)'}

REQUIRES:
${requires || '  (无)'}

${'='.repeat(50)}
`;
}).join('\n')}`}</pre>
                ) : (
                  <pre>{(() => {
                    const p = filteredData.nodes.find(n => n.type === 'process');
                    if (!p) return '未选择工序';
                    const pEdges = filteredData.edges.filter(e => e.source === p.id);
                    const uses = pEdges.filter(e => e.type === 'uses').map(e => {
                      const target = filteredData.nodes.find(n => n.id === e.target);
                      return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
                    }).join('\n');
                    const consumes = pEdges.filter(e => e.type === 'consumes').map(e => {
                      const target = filteredData.nodes.find(n => n.id === e.target);
                      return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
                    }).join('\n');
                    const constrained = pEdges.filter(e => e.type === 'constrained_by').map(e => {
                      const target = filteredData.nodes.find(n => n.id === e.target);
                      return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
                    }).join('\n');
                    const requires = pEdges.filter(e => e.type === 'requires').map(e => {
                      const target = filteredData.nodes.find(n => n.id === e.target);
                      return `  - ${target?.type?.toUpperCase()}: ${e.target} (${target?.name})`;
                    }).join('\n');
                    return `PROCESS: ${p.id}
NAME: "${p.name}"
PROPERTIES:
  defaultTime: ${p.properties.defaultTime}h
  riskLevel: "${p.properties.riskLevel}"

USES:
${uses || '  (无)'}

CONSUMES:
${consumes || '  (无)'}

CONSTRAINED_BY:
${constrained || '  (无)'}

REQUIRES:
${requires || '  (无)'}
`;
                  })()}</pre>
                )}
              </div>
            )}
            {viewMode === 'table' && (
              <div className="p-4 h-full overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">类型</th>
                      <th className="px-4 py-2">名称</th>
                      <th className="px-4 py-2">属性</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.nodes.map(node => (
                      <tr key={node.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono">{node.id}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: NODE_COLORS[node.type as keyof typeof NODE_COLORS] }}>
                            {node.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-medium">{node.name}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {JSON.stringify(node.properties)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Attribute Panel */}
        <Card className="w-80 flex flex-col rounded-none border-border shadow-none">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">属性面板</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto space-y-6">
            {selectedNode ? (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2 flex items-center justify-between">
                    基本信息
                    <span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: NODE_COLORS[selectedNode.type as keyof typeof NODE_COLORS] }}>
                      {selectedNode.type}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-mono text-muted-foreground">ID</Label>
                      <Input value={selectedNode.id} readOnly className="h-8 text-sm font-mono rounded-none bg-muted" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-mono text-muted-foreground">名称</Label>
                      <Input value={selectedNode.name} className="h-8 text-sm rounded-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2">节点属性</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-mono text-muted-foreground">{key}</Label>
                        <Input defaultValue={value} className="h-8 text-sm font-mono rounded-none" />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed rounded-none">
                      <Plus className="w-3 h-3 mr-1" /> 添加属性
                    </Button>
                  </div>
                </div>

                {selectedNode.type === 'process' && selectedOntology && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold border-b border-border pb-2 text-primary">📦 10大本体结构</h3>

                    {/* Project */}
                    {selectedOntology.project && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm">
                        <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span> 项目 Project
                        </div>
                        <div className="text-xs space-y-1 text-blue-900">
                          <div>类型: {selectedOntology.project.type}</div>
                          <div>复杂度: {selectedOntology.project.complexity}</div>
                        </div>
                      </div>
                    )}

                    {/* Process */}
                    {selectedOntology.process && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-sm">
                        <div className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span> 工艺 Process
                        </div>
                        <div className="text-xs space-y-1 text-orange-900">
                          <div>名称: {selectedOntology.process.name}</div>
                          <div>工期: {selectedOntology.process.duration}天</div>
                          <div>标准: {selectedOntology.process.standard}</div>
                        </div>
                      </div>
                    )}

                    {/* Man */}
                    {selectedOntology.man && selectedOntology.man.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-sm">
                        <div className="text-xs font-bold text-green-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> 人 Man ({selectedOntology.man.length})
                        </div>
                        <div className="text-xs space-y-1 text-green-900">
                          {selectedOntology.man.map((m, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{m.role} {m.level && `(${m.level})`}</span>
                              <span className="text-muted-foreground">{m.count}人 × ¥{m.rate}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Machine */}
                    {selectedOntology.machine && selectedOntology.machine.length > 0 && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm">
                        <div className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 设备 Machine ({selectedOntology.machine.length})
                        </div>
                        <div className="text-xs space-y-1 text-emerald-900">
                          {selectedOntology.machine.map((m, i) => (
                            <div key={i}>{m.name} {m.type && `(${m.type})`}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Material */}
                    {selectedOntology.material && selectedOntology.material.length > 0 && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-sm">
                        <div className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span> 物料 Material ({selectedOntology.material.length})
                        </div>
                        <div className="text-xs space-y-1 text-purple-900">
                          {selectedOntology.material.map((m, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{m.name}</span>
                              <span className="text-muted-foreground">{m.quantity} {m.unitPrice && `× ¥${m.unitPrice}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Method */}
                    {selectedOntology.method && selectedOntology.method.length > 0 && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-sm">
                        <div className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span> 方法 Method
                        </div>
                        <div className="text-xs space-y-1 text-indigo-900">
                          {selectedOntology.method.map((m, i) => (
                            <div key={i}>
                              <div className="font-medium">{m.name}</div>
                              {m.standard && <div className="text-muted-foreground">标准: {m.standard}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Environment */}
                    {selectedOntology.environment && selectedOntology.environment.length > 0 && (
                      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-sm">
                        <div className="text-xs font-bold text-cyan-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-500"></span> 环境 Environment
                        </div>
                        <div className="text-xs space-y-1 text-cyan-900">
                          {selectedOntology.environment.map((e, i) => (
                            <div key={i}>
                              {e.type && <div>类型: {e.type}</div>}
                              <div className="text-muted-foreground">{e.temperature}°C / {e.humidity}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Measurement */}
                    {selectedOntology.measurement && selectedOntology.measurement.length > 0 && (
                      <div className="p-3 bg-pink-50 border border-pink-200 rounded-sm">
                        <div className="text-xs font-bold text-pink-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500"></span> 检测 Measurement ({selectedOntology.measurement.length})
                        </div>
                        <div className="text-xs space-y-1 text-pink-900">
                          {selectedOntology.measurement.map((m, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{m.name} {m.mandatory && <span className="text-red-500">*</span>}</span>
                              <span className="text-muted-foreground">¥{m.cost}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cost */}
                    {selectedOntology.cost && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-sm">
                        <div className="text-xs font-bold text-yellow-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 成本 Cost
                        </div>
                        <div className="text-xs space-y-1 text-yellow-900">
                          <div className="font-mono">总计: ¥{selectedOntology.cost.total?.toLocaleString()}</div>
                          {selectedOntology.cost.formula && (
                            <div className="text-muted-foreground text-[10px]">公式: {selectedOntology.cost.formula}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rules */}
                    {selectedOntology.rules && selectedOntology.rules.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-sm">
                        <div className="text-xs font-bold text-red-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span> 规则 Rule ({selectedOntology.rules.length})
                        </div>
                        <div className="text-xs space-y-1 text-red-900">
                          {selectedOntology.rules.map((r, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <span>{r.mandatory ? '🔴' : '⚪'}</span>
                              <span>{r.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2">关联关系</h3>
                  <div className="space-y-2">
                    {filteredData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(edge => {
                      const isSource = edge.source === selectedNode.id;
                      const relatedNodeId = isSource ? edge.target : edge.source;
                      const relatedNode = filteredData.nodes.find(n => n.id === relatedNodeId);
                      return (
                        <div key={edge.id} className="p-2 border border-border bg-muted/30 text-xs font-mono">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-primary">{edge.type}</span>
                            <span className="text-muted-foreground">{isSource ? '→' : '←'} {relatedNode?.name}</span>
                          </div>
                          {edge.constraints && (
                            <div className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border/50">
                              约束: {JSON.stringify(edge.constraints)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed rounded-none">
                      <Plus className="w-3 h-3 mr-1" /> 添加关系
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <Layers className="w-8 h-8 opacity-20" />
                <p className="text-sm">在画布中选择节点以查看属性</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function OntologyGraphCenter() {
  return (
    <ReactFlowProvider>
      <OntologyGraphCenterInner />
    </ReactFlowProvider>
  );
}
