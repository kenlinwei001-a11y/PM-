import React, { useState, useMemo, useCallback } from 'react';
import { OntologyGraph, OntologyNode, OntologyEdge, mockOntologyGraph } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ReactFlow, Background, Controls, Node as FlowNode, Edge as FlowEdge, MarkerType, addEdge, applyNodeChanges, applyEdgeChanges, Connection, NodeChange, EdgeChange } from 'reactflow';
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
  { id: 'project', label: '项目 (Project)', icon: Network, color: NODE_COLORS.project },
  { id: 'process', label: '工艺 (Process)', icon: Settings, color: NODE_COLORS.process },
  { id: 'man', label: '人 (Man)', icon: User, color: NODE_COLORS.man },
  { id: 'machine', label: '设备 (Machine)', icon: Settings, color: NODE_COLORS.machine },
  { id: 'material', label: '物料 (Material)', icon: Package, color: NODE_COLORS.material },
  { id: 'method', label: '方法 (Method)', icon: BookOpen, color: NODE_COLORS.method },
  { id: 'environment', label: '环境 (Environment)', icon: Cloud, color: NODE_COLORS.environment },
  { id: 'measurement', label: '检测 (Measurement)', icon: Search, color: NODE_COLORS.measurement },
  { id: 'cost', label: '成本 (Cost)', icon: DollarSign, color: NODE_COLORS.cost },
  { id: 'rule', label: '规则 (Rule)', icon: FileText, color: NODE_COLORS.rule },
];

export function OntologyGraphCenter() {
  const [viewMode, setViewMode] = useState<'graph' | 'table' | 'dsl'>('graph');
  const [graphData, setGraphData] = useState<OntologyGraph>(mockOntologyGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Convert OntologyGraph to ReactFlow format
  const initialNodes: FlowNode[] = useMemo(() => {
    // Simple layout logic for demo purposes
    const processNode = graphData.nodes.find(n => n.type === 'process');
    const otherNodes = graphData.nodes.filter(n => n.type !== 'process');
    
    const nodes: FlowNode[] = [];
    if (processNode) {
      nodes.push({
        id: processNode.id,
        position: { x: 400, y: 300 },
        data: { label: processNode.name },
        style: {
          background: NODE_COLORS[processNode.type as keyof typeof NODE_COLORS],
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 'bold',
        }
      });
    }

    otherNodes.forEach((node, index) => {
      const angle = (index / otherNodes.length) * 2 * Math.PI;
      const radius = 250;
      nodes.push({
        id: node.id,
        position: { x: 400 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) },
        data: { label: node.name },
        style: {
          background: NODE_COLORS[node.type as keyof typeof NODE_COLORS],
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
        }
      });
    });

    return nodes;
  }, [graphData]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    return graphData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      labelStyle: { fill: '#64748b', fontWeight: 500 },
    }));
  }, [graphData]);

  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);

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

  const handleNodeClick = (_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleSave = () => {
    toast.success('图谱已保存并发布 (Graph saved and published)');
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-xl font-medium">企业知识图谱中心 (Ontology Graph)</h2>
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
        {/* Left: Ontology Navigator */}
        <Card className="w-64 flex flex-col rounded-none border-border shadow-none">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
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
                    {graphData.nodes.filter(n => n.type === cat.id).length}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Middle: Graph Editor */}
        <Card className="flex-1 flex flex-col rounded-none border-border shadow-none overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">图谱画布 (Graph Editor)</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs font-mono rounded-none">
                <Plus className="w-3 h-3 mr-1" /> 新增实体
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            {viewMode === 'graph' && (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                fitView
                className="bg-muted/10"
              >
                <Background color="#ccc" gap={16} />
                <Controls />
              </ReactFlow>
            )}
            {viewMode === 'dsl' && (
              <div className="p-4 h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm overflow-auto whitespace-pre">
{`PROCESS: WELD_PROCESS
NAME: "焊接工序"
PROPERTIES:
  defaultTime: 10h
  riskLevel: "high"

USES:
  - MACHINE: WELD_MACHINE (焊机A)
  - MAN: WELDER (高级焊工)
    CONSTRAINTS:
      unique: true
      no_parallel: true

CONSUMES:
  - MATERIAL: STEEL (不锈钢)

CONSTRAINED_BY:
  - RULE: WELD_RULE (焊接效率规则)

REQUIRES:
  - MEASUREMENT: UT_TEST (UT检测)`}
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
                    {graphData.nodes.map(node => (
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
            <CardTitle className="text-sm font-mono uppercase tracking-wider">属性面板 (Properties)</CardTitle>
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

                {selectedNode.type === 'process' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold border-b border-border pb-2 text-primary">成本模型配置</h3>
                    <div className="p-3 bg-primary/5 border border-primary/20 space-y-2">
                      <div className="text-xs font-mono text-muted-foreground mb-1">成本公式 (Cost Formula)</div>
                      <div className="font-mono text-xs space-y-1">
                        <div><span className="text-blue-600">人工成本</span> = 工时 × 人员单价</div>
                        <div><span className="text-purple-600">材料成本</span> = 用量 × 单价 × (1+损耗)</div>
                        <div><span className="text-emerald-600">能耗成本</span> = 功率 × 时间 × 电价</div>
                        <div><span className="text-orange-600">折旧</span> = 设备价值 / 生命周期</div>
                      </div>
                      <Button size="sm" className="w-full mt-2 h-7 text-xs rounded-none">编辑公式</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2">关联关系</h3>
                  <div className="space-y-2">
                    {graphData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(edge => {
                      const isSource = edge.source === selectedNode.id;
                      const relatedNodeId = isSource ? edge.target : edge.source;
                      const relatedNode = graphData.nodes.find(n => n.id === relatedNodeId);
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
