import { useState, useMemo, useEffect, useCallback } from 'react';
import { Project, GraphNode, mockRules } from '../types';
import { RuleEngine, ValidationResult } from '../lib/RuleEngine';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Network, ListTree, Settings, Users, FileText, X, AlertTriangle, Calculator, Play, Bot, CheckCircle2, DollarSign, ArrowRight, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { ReactFlow, Background, Controls, Node as FlowNode, Edge as FlowEdge, MarkerType, addEdge, applyNodeChanges, applyEdgeChanges, Connection, NodeChange, EdgeChange, Handle, Position } from 'reactflow';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import 'reactflow/dist/style.css';

const ProjectNodeComponent = ({ data, id }: any) => {
  const { nodeData, expandedLevel, onExpand, hasError, hasWarning, isSelected, showOntology } = data;
  const n = nodeData as GraphNode;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'running': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'delayed': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <div 
      className={`relative bg-card rounded-md transition-all duration-300 ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'shadow-sm'} ${hasError ? 'border-destructive' : hasWarning ? 'border-yellow-500' : n.isCritical ? 'border-destructive' : 'border-border'} border`}
      style={{ width: expandedLevel === 'L1' ? 180 : expandedLevel === 'L2' ? 240 : 320 }}
      onClick={(e) => {
        e.stopPropagation();
        onExpand(id);
      }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-muted-foreground border-none" />
      
      {/* Header (Always visible) */}
      <div className={`px-3 py-2 border-b border-border flex justify-between items-center ${hasError ? 'bg-destructive/10' : hasWarning ? 'bg-yellow-500/10' : 'bg-muted/30'}`}>
        <div className="font-bold text-sm tracking-tight truncate pr-2" title={n.name}>{n.name}</div>
        <div className="flex items-center gap-1">
          {hasError && <span title="规则校验错误"><AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" /></span>}
          {!hasError && hasWarning && <span title="规则校验警告"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" /></span>}
          {n.isCritical && <span title="关键路径"><AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" /></span>}
        </div>
      </div>

      {/* L1: Basic Info */}
      {expandedLevel === 'L1' && (
        <div className="p-3 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">周期:</span>
            <span>{n.duration}天</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">成本:</span>
            <span>¥{n.plannedCost.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-muted-foreground">风险:</span>
            <span className="flex items-center gap-1.5">
              {n.isCritical ? (
                <><span className="text-destructive font-bold">高</span> <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div></>
              ) : (
                <><span className="text-green-500">低</span> <div className="w-2 h-2 rounded-full bg-green-500"></div></>
              )}
            </span>
          </div>
        </div>
      )}

      {/* L2: Sub-nodes */}
      {(expandedLevel === 'L2' || expandedLevel === 'L3') && (
        <div className="p-3 flex flex-col gap-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">子任务</div>
          {n.subTasks && n.subTasks.length > 0 ? (
            <div className="space-y-1.5">
              {n.subTasks.map(st => (
                <div key={st.id} className="flex items-center justify-between text-xs font-mono bg-muted/30 p-1.5 border border-border/50 rounded">
                  <span className="truncate pr-2">{st.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{st.duration}d</span>
                    <span className={`text-[9px] px-1 py-0.5 border uppercase ${getStatusColor(st.status)}`}>{st.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">无子任务</div>
          )}
        </div>
      )}

      {/* L3: Ontology (6M) Star Graph */}
      {expandedLevel === 'L3' && (
        <>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-600 text-[10px] font-mono rounded whitespace-nowrap shadow-sm">
              👤 人: {n.resources.length > 0 ? n.resources.join(', ') : '-'}
            </div>
            <div className="w-px h-4 bg-blue-500/30 border-l border-dashed border-blue-500/50"></div>
          </div>
          
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-px h-4 bg-purple-500/30 border-l border-dashed border-purple-500/50"></div>
            <div className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-600 text-[10px] font-mono rounded whitespace-nowrap shadow-sm">
              📐 法: {n.rules.length > 0 ? n.rules.join(', ') : '-'}
            </div>
          </div>

          <div className="absolute top-1/2 -left-24 -translate-y-1/2 flex items-center gap-1">
            <div className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-600 text-[10px] font-mono rounded whitespace-nowrap shadow-sm max-w-[80px] truncate" title={n.materials.join(', ')}>
              📦 料: {n.materials.length > 0 ? n.materials.join(', ') : '-'}
            </div>
            <div className="h-px w-4 bg-green-500/30 border-t border-dashed border-green-500/50"></div>
          </div>

          <div className="absolute top-1/2 -right-24 -translate-y-1/2 flex items-center gap-1">
            <div className="h-px w-4 bg-orange-500/30 border-t border-dashed border-orange-500/50"></div>
            <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-600 text-[10px] font-mono rounded whitespace-nowrap shadow-sm max-w-[80px] truncate" title={n.machines?.join(', ')}>
              🏭 机: {n.machines && n.machines.length > 0 ? n.machines.join(', ') : '-'}
            </div>
          </div>
        </>
      )}

      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-muted-foreground border-none" />
    </div>
  );
};

const nodeTypes = { projectNode: ProjectNodeComponent };

export function ProjectTree({ project, onUpdateProject }: { project: Project, onUpdateProject: (p: Project) => void }) {
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, 'L1' | 'L2' | 'L3'>>({});
  const [showOntology, setShowOntology] = useState(false);

  const [isApplyingSolution, setIsApplyingSolution] = useState(false);

  const handleApplySolution = () => {
    setIsApplyingSolution(true);
    setTimeout(() => {
      const updatedNodes = project.nodes.map(node => {
        if (node.id === 'N1') {
          return {
            ...node,
            duration: Math.max(1, node.duration - 2),
            resources: [...node.resources, 'R_WELD_02'],
            plannedCost: {
              ...node.plannedCost,
              labor: node.plannedCost.labor + 1500,
              total: node.plannedCost.total + 1500
            }
          };
        }
        return node;
      });
      
      onUpdateProject({
        ...project,
        nodes: updatedNodes
      });
      setIsApplyingSolution(false);
    }, 1000);
  };

  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);

  const ruleEngine = useMemo(() => new RuleEngine(mockRules), []);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  useEffect(() => {
    setValidationResults(ruleEngine.evaluateProject(project));
  }, [project, ruleEngine]);

  const selectedNode = useMemo(() => {
    return project.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, project]);

  // Initialize from project
  useEffect(() => {
    const initialNodes: FlowNode[] = project.nodes.map((node, index) => {
      return {
        id: node.id,
        position: { x: (index % 3) * 280, y: Math.floor(index / 3) * 180 },
        data: { nodeData: node },
        type: 'default',
      };
    });

    const initialEdges: FlowEdge[] = project.edges.map((edge, index) => {
      const sourceNode = project.nodes.find(n => n.id === edge.from);
      const targetNode = project.nodes.find(n => n.id === edge.to);
      const isCriticalEdge = sourceNode?.isCritical && targetNode?.isCritical;

      return {
        id: `e-${edge.from}-${edge.to}-${index}`,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        animated: isCriticalEdge,
        label: edge.type,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCriticalEdge ? 'var(--destructive)' : 'var(--muted-foreground)',
        },
        style: { 
          stroke: isCriticalEdge ? 'var(--destructive)' : 'var(--border)',
          strokeWidth: isCriticalEdge ? 2 : 1,
        },
        labelStyle: { fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' },
        labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.8 }
      };
    });

    setFlowNodes(initialNodes);
    setFlowEdges(initialEdges);
  }, []);

  const handleExpandNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const currentLevel = prev[nodeId] || 'L1';
      let nextLevel: 'L1' | 'L2' | 'L3' = 'L1';
      if (currentLevel === 'L1') nextLevel = 'L2';
      else if (currentLevel === 'L2') nextLevel = 'L3';
      else nextLevel = 'L1'; // cycle back
      
      return { ...prev, [nodeId]: nextLevel };
    });
  }, []);

  // Update node styles based on selection
  const styledNodes = useMemo(() => {
    return flowNodes.map(flowNode => {
      const nodeData = flowNode.data.nodeData as GraphNode;
      const isSelected = selectedNodeId === flowNode.id;
      const nodeValidations = validationResults.filter(v => v.nodeId === nodeData.id && !v.passed);
      const hasError = nodeValidations.some(v => v.severity === 'error');
      const hasWarning = nodeValidations.some(v => v.severity === 'warning');
      const expandedLevel = expandedNodes[flowNode.id] || 'L1';
      
      return {
        ...flowNode,
        type: 'projectNode',
        data: {
          ...flowNode.data,
          nodeData,
          expandedLevel,
          onExpand: handleExpandNode,
          hasError,
          hasWarning,
          isSelected,
          showOntology
        },
        style: {
          ...flowNode.style,
          opacity: selectedNodeId && !isSelected ? 0.4 : 1,
          transition: 'opacity 0.3s ease'
        }
      };
    });
  }, [flowNodes, selectedNodeId, validationResults, expandedNodes, showOntology, handleExpandNode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setFlowNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setFlowEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection | FlowEdge) => setFlowEdges((eds) => addEdge({
      ...params, 
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--muted-foreground)' },
      style: { stroke: 'var(--border)', strokeWidth: 1 }
    }, eds)),
    []
  );

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top KPI Bar */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Card className="p-4 rounded-none border-border shadow-sm flex items-center gap-4 bg-card">
          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center border border-primary/20">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">总成本</div>
            <div className="text-xl font-serif">¥{project.nodes.reduce((sum, n) => sum + n.plannedCost.total, 0).toLocaleString()}</div>
          </div>
        </Card>
        <Card className="p-4 rounded-none border-border shadow-sm flex items-center gap-4 bg-card">
          <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <CalendarDays className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">总周期</div>
            <div className="text-xl font-serif">{Math.max(...project.nodes.map(n => n.ef || 0))} 天</div>
          </div>
        </Card>
        <Card className="p-4 rounded-none border-border shadow-sm flex items-center gap-4 bg-card">
          <div className="w-10 h-10 bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">预期利润</div>
            <div className="text-xl font-serif text-green-600">+15.2%</div>
          </div>
        </Card>
        <Card className="p-4 rounded-none border-border shadow-sm flex items-center gap-4 bg-card">
          <div className="w-10 h-10 bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">风险指数</div>
            <div className="text-xl font-serif text-destructive">
              {Math.max(...project.nodes.map(n => n.riskScore || 0))} / 100
            </div>
          </div>
        </Card>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Node Tree */}
        <Card className="w-64 shrink-0 flex flex-col overflow-hidden rounded-none border-border shadow-none bg-card">
          <div className="p-3 border-b border-border bg-muted/30 font-serif text-sm flex items-center gap-2">
            <ListTree className="w-4 h-4" /> 节点树
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {project.nodes.map(node => (
              <div 
                key={node.id}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors border-l-2 ${selectedNodeId === node.id ? 'bg-primary/10 border-primary font-medium' : 'border-transparent hover:bg-muted/50'}`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2">{node.name}</span>
                  {node.isCritical && <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" title="关键路径"></div>}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{node.id}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Center Graph */}
        <Card className="flex-1 flex flex-col overflow-hidden rounded-none border-border shadow-none relative bg-muted/10">
          {viewMode === 'graph' ? (
            <div className="flex-1 w-full relative">
              <ReactFlow 
                nodes={styledNodes} 
                edges={flowEdges} 
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                attributionPosition="bottom-right"
              >
                <Background color="var(--border)" gap={16} size={1} />
                <Controls className="bg-card border-border rounded-none shadow-sm" />
              </ReactFlow>
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
                <div className="flex items-center gap-2 text-xs font-mono bg-background/90 px-2 py-1 border border-border shadow-sm">
                  <div className="w-3 h-3 border border-destructive bg-destructive/10"></div>
                  <span>关键路径</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-background/90 px-2 py-1 border border-border shadow-sm">
                  <div className="w-3 h-3 border border-border bg-card"></div>
                  <span>普通节点</span>
                </div>
              </div>
            </div>
          ) : (
            <CardContent className="p-0 flex-1 overflow-auto bg-card">
              <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px] gap-4 p-4 border-b border-border bg-muted/50 font-medium text-xs uppercase tracking-wider font-serif italic opacity-70 sticky top-0 z-10">
                <div>ID</div>
                <div>名称</div>
                <div>类型</div>
                <div>关键路径</div>
                <div className="text-right">成本</div>
              </div>
              {project.nodes.map(node => (
                <div 
                  key={node.id} 
                  className={`grid grid-cols-[80px_1.5fr_1fr_1fr_100px] gap-4 p-4 border-b border-border cursor-pointer transition-colors items-center ${selectedNodeId === node.id ? 'bg-primary/5' : 'hover:bg-muted/10'}`}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div className="font-mono text-xs text-muted-foreground">{node.id}</div>
                  <div className="font-sans text-sm font-medium">{node.name}</div>
                  <div>
                    <span className="text-[10px] px-2 py-1 uppercase tracking-wider font-mono border bg-muted text-muted-foreground border-border">
                      {node.type}
                    </span>
                  </div>
                  <div>
                    {node.isCritical ? (
                      <span className="text-[10px] px-2 py-1 uppercase tracking-wider font-mono border bg-destructive/10 text-destructive border-destructive/20">
                        是
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">否</span>
                    )}
                  </div>
                  <div className="font-mono text-sm text-right">¥{node.plannedCost.total.toLocaleString()}</div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Right Inspector */}
        {selectedNode && (
          <Card className="w-[350px] shrink-0 flex flex-col overflow-hidden rounded-none border-border shadow-none bg-card">
            <div className="p-3 border-b border-border bg-muted/30 font-serif text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" /> 节点详情
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs text-muted-foreground tracking-wider">{selectedNode.id}</div>
                  <div className="font-mono text-[10px] uppercase px-2 py-1 bg-muted border border-border">{selectedNode.type}</div>
                </div>
                <div className="font-serif text-xl mb-2">{selectedNode.name}</div>
                {selectedNode.isCritical && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-destructive bg-destructive/10 px-2 py-1 border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> 位于关键路径
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-1">基本信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">工期</div>
                    <div className="font-mono">{selectedNode.duration} 天</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">状态</div>
                    <div className="font-mono capitalize">{selectedNode.status}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">最早开始 (ES)</div>
                    <div className="font-mono">第 {selectedNode.es} 天</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">最晚完成 (LF)</div>
                    <div className="font-mono">第 {selectedNode.lf} 天</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-1">成本结构</h3>
                <div className="text-2xl font-serif mb-2">¥{selectedNode.plannedCost.total.toLocaleString()}</div>
                <div className="h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '材料', value: selectedNode.plannedCost.material },
                          { name: '人工', value: selectedNode.plannedCost.labor },
                          { name: '设备', value: selectedNode.plannedCost.equipment },
                          { name: '制造费用', value: selectedNode.plannedCost.overhead },
                          { name: '能源', value: selectedNode.plannedCost.energy }
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {
                          [
                            { name: '材料', value: selectedNode.plannedCost.material },
                            { name: '人工', value: selectedNode.plannedCost.labor },
                            { name: '设备', value: selectedNode.plannedCost.equipment },
                            { name: '制造费用', value: selectedNode.plannedCost.overhead },
                            { name: '能源', value: selectedNode.plannedCost.energy }
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                          ))
                        }
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-1">资源与材料 (6M)</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">人力:</span>
                    {selectedNode.resources.length > 0 ? selectedNode.resources.join(', ') : '-'}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">机器:</span>
                    {selectedNode.machines && selectedNode.machines.length > 0 ? selectedNode.machines.join(', ') : '-'}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">物料:</span>
                    {selectedNode.materials.length > 0 ? selectedNode.materials.join(', ') : '-'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-1">规则与约束</h3>
                {selectedNode.rules.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.rules.map(rule => (
                      <span key={rule} className="text-[10px] font-mono px-2 py-1 bg-muted border border-border">
                        {rule}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">无特殊规则约束</div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom Simulation & AI */}
      <Card className="h-[280px] shrink-0 flex flex-col overflow-hidden rounded-none border-border shadow-none bg-card">
        <div className="p-3 border-b border-border bg-muted/30 font-serif text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> 推演与AI建议
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* Input Area */}
          <div className="w-1/3 border-r border-border p-4 flex flex-col gap-4 bg-muted/5">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">假设输入</div>
            <div className="flex-1">
              <textarea 
                className="w-full h-full bg-background border border-border p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="例如：如果增加一个焊机会怎样？或者：如果材料M_STEEL延迟2天到货？"
                defaultValue="如果增加一个焊机会怎样？"
              />
            </div>
            <Button
              className="w-full rounded-none font-mono text-xs uppercase tracking-wider"
              onClick={() => {
                toast.success('推演完成：增加焊机可缩短工期2天，成本增加¥1,500');
              }}
            >
              <Play className="w-3 h-3 mr-2" /> 运行推演
            </Button>
          </div>
          
          {/* Output Area */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">推演结果</div>
            <div className="grid grid-cols-3 gap-4 shrink-0">
              <div className="p-3 border border-border bg-background flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">周期影响</span>
                <span className="text-lg font-serif text-green-600">-2 天</span>
              </div>
              <div className="p-3 border border-border bg-background flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">成本影响</span>
                <span className="text-lg font-serif text-destructive">+¥1,500</span>
              </div>
              <div className="p-3 border border-border bg-background flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">利润影响</span>
                <span className="text-lg font-serif text-green-600">+3.2%</span>
              </div>
            </div>
            
            <div className="flex-1 border border-border bg-background p-3 text-sm overflow-auto">
              <div className="font-medium mb-2">AI 建议方案：</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>在节点 <span className="font-mono text-foreground">N1 (焊接工序)</span> 增加资源 <span className="font-mono text-foreground">R_WELD_02</span></li>
                <li>此举将缩短关键路径 2 天，虽然增加人工成本 ¥1,500，但提前交付可避免违约罚金，整体利润率提升。</li>
                <li>注意：需确认 <span className="font-mono text-foreground">R_WELD_02</span> 在第 5-13 天的可用性。</li>
              </ul>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                className="rounded-none font-mono text-xs uppercase tracking-wider border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={handleApplySolution}
                disabled={isApplyingSolution}
              >
                {isApplyingSolution ? (
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 mr-2" />
                )}
                应用方案
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
