import { useState, useMemo, useEffect, useCallback } from 'react';
import { Project, GraphNode, mockRules } from '../types';
import { RuleEngine, ValidationResult } from '../lib/RuleEngine';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Network, ListTree, Settings, Users, FileText, X, AlertTriangle, Calculator, Play, Bot, CheckCircle2, DollarSign, ArrowRight, Loader2 } from 'lucide-react';
import { ReactFlow, Background, Controls, Node as FlowNode, Edge as FlowEdge, MarkerType, addEdge, applyNodeChanges, applyEdgeChanges, Connection, NodeChange, EdgeChange } from 'reactflow';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import 'reactflow/dist/style.css';

export function ProjectTree({ project, onUpdateProject }: { project: Project, onUpdateProject: (p: Project) => void }) {
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'agent'>('agent');
  const [activeAgent, setActiveAgent] = useState<'quotation' | 'simulation' | 'decision'>('quotation');

  // Quotation State
  const [targetMargin, setTargetMargin] = useState(15);
  const [isCalculatingQuotation, setIsCalculatingQuotation] = useState(false);
  const [showQuotationResult, setShowQuotationResult] = useState(false);

  // Simulation State
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>(project.nodes);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulationResult, setShowSimulationResult] = useState(false);

  // Decision State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [decisionResult, setDecisionResult] = useState<string | null>(null);

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

  // --- Agent Logic ---
  const totalCost = project.nodes.reduce((acc, node) => acc + node.plannedCost.total, 0);
  const materialCost = project.nodes.reduce((acc, node) => acc + node.plannedCost.material, 0);
  const laborCost = project.nodes.reduce((acc, node) => acc + node.plannedCost.labor, 0);
  const equipmentCost = project.nodes.reduce((acc, node) => acc + node.plannedCost.equipment, 0);
  const overheadCost = project.nodes.reduce((acc, node) => acc + node.plannedCost.overhead, 0);
  const energyCost = project.nodes.reduce((acc, node) => acc + (node.plannedCost.energy || 0), 0);

  const targetPrice = totalCost / (1 - targetMargin / 100);
  const targetProfit = targetPrice - totalCost;

  const costData = [
    { name: '物料成本', value: materialCost, color: 'var(--chart-1)' },
    { name: '人工成本', value: laborCost, color: 'var(--chart-2)' },
    { name: '设备成本', value: equipmentCost, color: 'var(--chart-3)' },
    { name: '间接成本', value: overheadCost, color: 'var(--chart-4)' },
    { name: '能源成本', value: energyCost, color: 'var(--chart-5)' },
  ];

  const handleRunQuotation = () => {
    setIsCalculatingQuotation(true);
    setTimeout(() => {
      setIsCalculatingQuotation(false);
      setShowQuotationResult(true);
    }, 1000);
  };

  const handleDurationChange = (nodeId: string, delta: number) => {
    setSimulatedNodes(nodes => nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, duration: Math.max(1, n.duration + delta) };
      }
      return n;
    }));
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setShowSimulationResult(true);
    }, 1500);
  };

  const handleRunDecision = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setDecisionResult("基于当前节点网络、成本结构和排产计划，建议：\n1. 关键路径上的【主体焊接】存在资源瓶颈，建议增加焊工投入以缩短2天工期。\n2. 能源成本占比较高，建议在【热处理】环节采用夜间谷电时段作业。\n3. 当前报价利润率15%处于健康区间，但需注意【探伤检测】的合规风险可能导致返工成本。");
    }, 2000);
  };

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

  // Update node styles based on selection
  const styledNodes = useMemo(() => {
    return flowNodes.map(flowNode => {
      const nodeData = flowNode.data.nodeData as GraphNode;
      const isSelected = selectedNodeId === flowNode.id;
      const nodeValidations = validationResults.filter(v => v.nodeId === nodeData.id && !v.passed);
      const hasError = nodeValidations.some(v => v.severity === 'error');
      const hasWarning = nodeValidations.some(v => v.severity === 'warning');
      
      return {
        ...flowNode,
        data: {
          ...flowNode.data,
          label: (
            <div className="flex flex-col h-full text-left relative">
              {/* Header */}
              <div className={`px-3 py-2 border-b border-border flex justify-between items-center ${hasError ? 'bg-destructive/10' : hasWarning ? 'bg-yellow-500/10' : 'bg-muted/30'}`}>
                <div className="font-bold text-sm tracking-tight truncate pr-2" title={nodeData.name}>{nodeData.name}</div>
                <div className="flex items-center gap-1">
                  {hasError && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" title="规则校验错误" />}
                  {!hasError && hasWarning && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" title="规则校验警告" />}
                  {nodeData.isCritical && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" title="关键路径" />}
                </div>
              </div>
              {/* Body */}
              <div className="p-3 flex flex-col gap-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">周期:</span>
                  <span>{nodeData.duration}天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">成本:</span>
                  <span>¥{nodeData.plannedCost.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">风险:</span>
                  <span className="flex items-center gap-1.5">
                    {nodeData.isCritical ? (
                      <><span className="text-destructive font-bold">高</span> <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div></>
                    ) : (
                      <><span className="text-green-500">低</span> <div className="w-2 h-2 rounded-full bg-green-500"></div></>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        },
        style: {
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          border: isSelected ? '2px solid var(--primary)' : hasError ? '1px solid var(--destructive)' : hasWarning ? '1px solid #eab308' : nodeData.isCritical ? '1px solid var(--destructive)' : '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0',
          fontFamily: 'var(--font-sans)',
          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
          width: 180,
          overflow: 'hidden'
        }
      };
    });
  }, [flowNodes, selectedNodeId, validationResults]);

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
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl">项目节点图 (Graph DSL)</h2>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2 rounded-none border border-border bg-background p-0">
            <TabsTrigger value="tree" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ListTree className="w-4 h-4 mr-2" /> 列表
            </TabsTrigger>
            <TabsTrigger value="graph" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Network className="w-4 h-4 mr-2" /> 拓扑图
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <Card className="flex-1 rounded-none border-border shadow-none overflow-hidden flex flex-col">
          {viewMode === 'graph' ? (
            <div className="flex-1 w-full bg-muted/10 relative">
              <ReactFlow 
                nodes={styledNodes} 
                edges={flowEdges} 
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
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-mono bg-background/80 px-2 py-1 border border-border">
                  <div className="w-3 h-3 border border-destructive bg-destructive/10"></div>
                  <span>关键路径 (Critical Path)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-background/80 px-2 py-1 border border-border">
                  <div className="w-3 h-3 border border-border bg-card"></div>
                  <span>普通节点 (Normal Node)</span>
                </div>
              </div>
            </div>
          ) : (
            <CardContent className="p-0 flex-1 overflow-auto">
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
                        是 (Yes)
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">否 (No)</span>
                    )}
                  </div>
                  <div className="font-mono text-sm text-right">¥{node.plannedCost.total.toLocaleString()}</div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Workspace Sidebar */}
        <Card className="w-[450px] shrink-0 rounded-none border-border shadow-none flex flex-col overflow-hidden bg-background">
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-border bg-muted/10 h-12 p-0">
              <TabsTrigger 
                value="inspector" 
                disabled={!selectedNode}
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full px-5 text-xs font-mono uppercase tracking-wider"
              >
                <Settings className="w-4 h-4 mr-2" /> 节点属性
              </TabsTrigger>
              <TabsTrigger 
                value="agent" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full px-5 text-xs font-mono uppercase tracking-wider"
              >
                <Bot className="w-4 h-4 mr-2" /> 智能决策
              </TabsTrigger>
            </TabsList>

            {/* Node Inspector Content */}
            <TabsContent value="inspector" className="flex-1 m-0 overflow-hidden flex flex-col">
              {selectedNode ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-border bg-card shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-mono text-xs text-muted-foreground tracking-wider">{selectedNode.id}</div>
                      <div className="font-mono text-[10px] uppercase px-2 py-1 bg-muted border border-border">{selectedNode.type}</div>
                    </div>
                    <div className="font-serif text-2xl mb-2">{selectedNode.name}</div>
                    {selectedNode.isCritical && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-destructive bg-destructive/10 px-2 py-1 border border-destructive/20">
                        <AlertTriangle className="w-3 h-3" /> 关键路径节点
                      </div>
                    )}
                  </div>
                  
                  <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/10 h-10 p-0 shrink-0">
                      <TabsTrigger value="basic" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full px-4 text-[10px] font-mono uppercase tracking-wider">基础</TabsTrigger>
                      <TabsTrigger value="cost" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full px-4 text-[10px] font-mono uppercase tracking-wider">成本</TabsTrigger>
                      <TabsTrigger value="resources" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full px-4 text-[10px] font-mono uppercase tracking-wider">资源</TabsTrigger>
                      <TabsTrigger value="rules" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full px-4 text-[10px] font-mono uppercase tracking-wider">规则</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 overflow-auto p-5">
                      <TabsContent value="basic" className="m-0 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">工期 (Duration)</div>
                            <div className="font-mono text-lg">{selectedNode.duration} <span className="text-sm text-muted-foreground">days</span></div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">状态 (Status)</div>
                            <div className="font-mono text-sm uppercase px-2 py-1 bg-muted inline-block border border-border">{selectedNode.status}</div>
                          </div>
                        </div>
                        
                        <div className="pt-6 border-t border-border">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-xs font-serif italic text-muted-foreground">CPM 计算结果 (CPM Results)</div>
                            <button className="text-[10px] font-mono uppercase bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 transition-colors border border-primary/20">
                              重新计算 (Recalculate)
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">ES (最早开始)</div>
                              <div className="font-mono text-base">{selectedNode.es ?? '-'}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">EF (最早完成)</div>
                              <div className="font-mono text-base">{selectedNode.ef ?? '-'}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">LS (最晚开始)</div>
                              <div className="font-mono text-base">{selectedNode.ls ?? '-'}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">LF (最晚完成)</div>
                              <div className="font-mono text-base">{selectedNode.lf ?? '-'}</div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="cost" className="m-0 space-y-6">
                        <div className="flex flex-col pb-4 border-b border-border">
                          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mb-1">总成本 (Total Cost)</div>
                          <div className="font-mono text-2xl">¥{selectedNode.plannedCost.total.toLocaleString()}</div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2"><div className="w-2 h-2 bg-chart-1 rounded-full"></div>物料 (Material)</span>
                            <span className="font-mono">¥{selectedNode.plannedCost.material.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2"><div className="w-2 h-2 bg-chart-2 rounded-full"></div>人工 (Labor)</span>
                            <span className="font-mono">¥{selectedNode.plannedCost.labor.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2"><div className="w-2 h-2 bg-chart-3 rounded-full"></div>设备 (Equipment)</span>
                            <span className="font-mono">¥{selectedNode.plannedCost.equipment.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2"><div className="w-2 h-2 bg-chart-4 rounded-full"></div>间接 (Overhead)</span>
                            <span className="font-mono">¥{selectedNode.plannedCost.overhead.toLocaleString()}</span>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="resources" className="m-0 space-y-6">
                        <div className="space-y-3">
                          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2"><Users className="w-3 h-3" /> 资源 (Resources)</div>
                          {selectedNode.resources.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedNode.resources.map(r => (
                                <div key={r} className="px-3 py-1.5 bg-muted border border-border text-xs font-mono">{r}</div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 border border-border/50">无资源分配</div>
                          )}
                        </div>
                        <div className="space-y-3 pt-6 border-t border-border">
                          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2"><FileText className="w-3 h-3" /> 物料 (Materials)</div>
                          {selectedNode.materials.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedNode.materials.map(m => (
                                <div key={m} className="px-3 py-1.5 bg-muted border border-border text-xs font-mono">{m}</div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 border border-border/50">无物料分配</div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="rules" className="m-0 space-y-4">
                        <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mb-3">绑定规则 (Bound Rules)</div>
                        {selectedNode.rules.length > 0 ? (
                          <div className="space-y-3">
                            {selectedNode.rules.map(r => {
                              const ruleValidation = validationResults.find(v => v.nodeId === selectedNode.id && (v.ruleId === r || v.ruleName === r));
                              return (
                              <div key={r} className={`p-3 border text-xs font-mono flex flex-col gap-2 ${ruleValidation && !ruleValidation.passed ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/30'}`}>
                                <div className="flex items-center gap-2">
                                  {ruleValidation && !ruleValidation.passed ? <AlertTriangle className="w-3 h-3 text-destructive" /> : <Settings className="w-3 h-3 text-muted-foreground" />}
                                  <span className="font-bold">{r}</span>
                                </div>
                                {ruleValidation && !ruleValidation.passed && (
                                  <div className="text-destructive text-[10px] mt-1 break-words">
                                    {ruleValidation.message}
                                  </div>
                                )}
                              </div>
                            )})}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 border border-border/50">无绑定规则</div>
                        )}
                        
                        {/* Global Rules affecting this node */}
                        {validationResults.filter(v => v.nodeId === selectedNode.id && !selectedNode.rules.includes(v.ruleId) && !selectedNode.rules.includes(v.ruleName)).length > 0 && (
                          <div className="mt-6">
                            <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mb-3">全局规则 (Global Rules)</div>
                            <div className="space-y-3">
                              {validationResults.filter(v => v.nodeId === selectedNode.id && !selectedNode.rules.includes(v.ruleId) && !selectedNode.rules.includes(v.ruleName)).map(v => (
                                <div key={v.ruleId} className={`p-3 border text-xs font-mono flex flex-col gap-2 ${!v.passed ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/30'}`}>
                                  <div className="flex items-center gap-2">
                                    {!v.passed ? <AlertTriangle className="w-3 h-3 text-destructive" /> : <Settings className="w-3 h-3 text-muted-foreground" />}
                                    <span className="font-bold">{v.ruleName}</span>
                                  </div>
                                  {!v.passed && (
                                    <div className="text-destructive text-[10px] mt-1 break-words">
                                      {v.message}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-mono">
                  请在左侧选择一个节点
                </div>
              )}
            </TabsContent>

            {/* Agent Console Content */}
            <TabsContent value="agent" className="flex-1 m-0 overflow-hidden flex flex-col bg-muted/5">
              <div className="p-4 border-b border-border bg-card shrink-0">
                <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mb-2">选择 Agent (Select Agent)</div>
                <div className="flex gap-2">
                  <Button 
                    variant={activeAgent === 'quotation' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 rounded-none text-xs font-mono"
                    onClick={() => setActiveAgent('quotation')}
                  >
                    <Calculator className="w-3 h-3 mr-1.5" /> 报价
                  </Button>
                  <Button 
                    variant={activeAgent === 'simulation' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 rounded-none text-xs font-mono"
                    onClick={() => setActiveAgent('simulation')}
                  >
                    <Play className="w-3 h-3 mr-1.5" /> 排产
                  </Button>
                  <Button 
                    variant={activeAgent === 'decision' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 rounded-none text-xs font-mono"
                    onClick={() => setActiveAgent('decision')}
                  >
                    <Bot className="w-3 h-3 mr-1.5" /> 决策
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-5">
                {activeAgent === 'quotation' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-muted-foreground">目标利润率 (%):</span>
                        <Input 
                          type="number" 
                          value={targetMargin} 
                          onChange={(e) => setTargetMargin(Number(e.target.value))}
                          className="w-24 h-8 rounded-none border-border font-mono text-right"
                        />
                      </div>
                      <Button 
                        onClick={handleRunQuotation} 
                        disabled={isCalculatingQuotation}
                        className="w-full rounded-none font-mono uppercase tracking-wider"
                      >
                        {isCalculatingQuotation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                        {isCalculatingQuotation ? '计算中...' : '运行报价 Agent'}
                      </Button>
                    </div>

                    {showQuotationResult && (
                      <div className="space-y-6 pt-6 border-t border-border animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-muted/30 border border-border flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mb-1">总成本</div>
                            <div className="font-mono text-lg">¥{totalCost.toLocaleString()}</div>
                          </div>
                          <div className="p-4 bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-primary uppercase font-mono tracking-wider mb-1">建议报价</div>
                            <div className="font-mono text-lg text-primary font-bold">¥{Math.round(targetPrice).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">成本结构分析</div>
                          <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={costData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={70}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {costData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value: number) => `¥${value.toLocaleString()}`}
                                  contentStyle={{ borderRadius: '0', border: '1px solid var(--border)', background: 'var(--background)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeAgent === 'simulation' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">调整节点工期 (Adjust Durations)</div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {simulatedNodes.map(node => (
                          <div key={node.id} className="flex items-center justify-between p-2 border border-border bg-card text-sm">
                            <div className="truncate pr-2 font-sans">{node.name}</div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleDurationChange(node.id, -1)} className="w-6 h-6 flex items-center justify-center bg-muted hover:bg-muted/80 border border-border">-</button>
                              <span className="font-mono w-6 text-center">{node.duration}</span>
                              <button onClick={() => handleDurationChange(node.id, 1)} className="w-6 h-6 flex items-center justify-center bg-muted hover:bg-muted/80 border border-border">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button 
                        onClick={handleRunSimulation} 
                        disabled={isSimulating}
                        className="w-full rounded-none font-mono uppercase tracking-wider"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {isSimulating ? '推演中...' : '运行排产 Agent'}
                      </Button>
                    </div>

                    {showSimulationResult && (
                      <div className="space-y-4 pt-6 border-t border-border animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-sm text-green-600 dark:text-green-400 mb-1">排产推演完成</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              新关键路径已生成。总工期预计缩短 3 天。资源冲突已解决。
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeAgent === 'decision' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        决策 Agent 将综合分析当前项目的所有节点、成本、资源和规则校验结果，提供全局优化建议。
                      </div>
                      <Button 
                        onClick={handleRunDecision} 
                        disabled={isAnalyzing}
                        className="w-full rounded-none font-mono uppercase tracking-wider"
                      >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                        {isAnalyzing ? '分析中...' : '运行决策 Agent'}
                      </Button>
                    </div>

                    {decisionResult && (
                      <div className="space-y-4 pt-6 border-t border-border animate-in slide-in-from-bottom-4 duration-500">
                        <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">分析报告 (Analysis Report)</div>
                        <div className="p-4 bg-primary/5 border border-primary/20 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                          {decisionResult}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
