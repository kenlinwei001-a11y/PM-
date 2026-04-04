import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Play, Activity, AlertTriangle, CheckCircle2, ArrowRight, Zap,
  TrendingDown, TrendingUp, Info, Plus, X, GitCompare, BarChart3,
  Clock, DollarSign, RotateCcw, Settings, MessageSquare, Send,
  Bot, User, Download, Save, Undo2, FileText, ChevronDown,
  ChevronRight, Calculator, LineChart, Layers, Target, Shield,
  Sparkles, GitBranch, Calendar, Coins, AlertCircle
} from 'lucide-react';
import { Project, GraphNode } from '../types';
import { toast } from 'sonner';
import { simulationEngine } from '../engine/SimulationEngine';
import type { AggregatedResult } from '../engine/types';
import {
  ReactFlow, Background, Controls, Node as FlowNode, Edge as FlowEdge,
  useNodesState, useEdgesState, MarkerType, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, LineChart as ReLineChart, Line
} from 'recharts';

interface SimulationCenterProps {
  project: Project;
}

// ==================== 类型定义 ====================

type Scenario = {
  id: string;
  name: string;
  isBaseline: boolean;
  overrides: {
    resources?: Record<string, any>;
    costs?: Record<string, number>;
    schedule?: any;
    risks?: Record<string, number>;
  };
};

type KPI = {
  cost: number;
  duration: number;
  profit: number;
  risk: '低' | '中' | '高';
};

type ViewMode = 'graph' | 'gantt' | 'costflow';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}

// ==================== 主组件 ====================

export function SimulationCenter({ project }: SimulationCenterProps) {
  // ===== 状态管理 =====
  const [activeScenario, setActiveScenario] = useState<string>('baseline');
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: 'baseline',
      name: 'Baseline',
      isBaseline: true,
      overrides: {}
    },
    {
      id: 'scenario-a',
      name: '方案A - 增加焊机',
      isBaseline: false,
      overrides: {
        resources: { welders: 5, machines: 3 },
        costs: { materialPrice: 1.1 }
      }
    },
    {
      id: 'scenario-b',
      name: '方案B - 外协加工',
      isBaseline: false,
      overrides: {
        resources: { welders: 3 },
        costs: { outsourcingRate: 1.3 }
      }
    }
  ]);

  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // 参数覆盖状态
  const [paramOverrides, setParamOverrides] = useState({
    welders: 4,
    machines: 2,
    materialPrice: 1.0,
    electricityPrice: 0.8,
    outsourcingRate: 1.0,
    reworkRate: 0.05,
    delayProbability: 0.1
  });

  // KPI数据（模拟）
  const [kpiData, setKpiData] = useState<Record<string, KPI>>({
    baseline: { cost: 1200000, duration: 32, profit: 18, risk: '中' },
    'scenario-a': { cost: 1350000, duration: 28, profit: 16, risk: '中' },
    'scenario-b': { cost: 1500000, duration: 25, profit: 15, risk: '低' }
  });

  // 推演结果
  const [simulationResults, setSimulationResults] = useState<Record<string, any>>({});

  // 聊天状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '💡 我是你的推演助手\n\n我可以帮你：\n• 分析不同方案的成本和周期影响\n• 识别项目瓶颈节点\n• 推荐最优资源配置\n• 解释推演结果数据\n\n你可以直接提问，或点击下方快捷按钮。',
      timestamp: Date.now(),
      suggestions: ['分析当前方案', '识别瓶颈节点', '推荐优化方案']
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // ===== 计算属性 =====
  const currentKPI = kpiData[activeScenario] || kpiData.baseline;
  const baselineKPI = kpiData.baseline;
  const allScenarios = Object.keys(kpiData);

  // ===== 推演图节点/边 =====
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 初始化推演图
  useEffect(() => {
    const processNodes: FlowNode[] = project.nodes.map((node, index) => ({
      id: node.id,
      type: 'default',
      position: { x: 100 + index * 200, y: 200 },
      data: {
        label: node.name,
        type: node.type,
        baseline: { cost: node.plannedCost.total, duration: node.duration },
        current: { cost: node.plannedCost.total * (1 + Math.random() * 0.2), duration: Math.max(1, node.duration + Math.floor(Math.random() * 4) - 2) }
      },
      style: {
        background: selectedNodeId === node.id ? '#3b82f6' : getNodeColor(node.type),
        color: 'white',
        borderRadius: '8px',
        padding: '12px 20px',
        fontSize: '12px',
        fontWeight: 'bold',
        minWidth: '140px',
        border: selectedNodeId === node.id ? '3px solid #fff' : 'none',
        boxShadow: selectedNodeId === node.id ? '0 0 20px rgba(59,130,246,0.5)' : '0 4px 12px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }
    }));

    const processEdges: FlowEdge[] = project.nodes.slice(1).map((node, index) => ({
      id: `e${project.nodes[index].id}-${node.id}`,
      source: project.nodes[index].id,
      target: node.id,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: selectedNodeId === project.nodes[index].id || selectedNodeId === node.id,
      style: selectedNodeId && (selectedNodeId === project.nodes[index].id || selectedNodeId === node.id)
        ? { stroke: '#ef4444', strokeWidth: 3 }
        : { stroke: '#94a3b8', strokeWidth: 2 }
    }));

    setNodes(processNodes);
    setEdges(processEdges);
  }, [project.nodes, selectedNodeId]);

  // ===== 辅助函数 =====
  function getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      project: '#3b82f6',
      process: '#f97316',
      man: '#22c55e',
      machine: '#10b981',
      material: '#a855f7',
      method: '#6366f1',
      environment: '#06b6d4',
      measurement: '#ec4899'
    };
    return colors[type] || '#64748b';
  }

  function getRiskColor(risk: string): string {
    switch (risk) {
      case '低': return 'text-green-600 bg-green-50';
      case '中': return 'text-yellow-600 bg-yellow-50';
      case '高': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  // ===== 推演执行 =====
  const runSimulation = useCallback(async () => {
    setIsSimulating(true);
    toast.info(`正在推演 ${scenarios.find(s => s.id === activeScenario)?.name}...`);

    // 模拟推演延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 更新KPI数据
    const newKPI: KPI = {
      cost: baselineKPI.cost * (1 + (Math.random() * 0.3 - 0.1)),
      duration: Math.max(20, Math.floor(baselineKPI.duration * (1 + (Math.random() * 0.2 - 0.1)))),
      profit: Math.max(10, Math.floor(baselineKPI.profit + (Math.random() * 6 - 3))),
      risk: Math.random() > 0.6 ? '高' : Math.random() > 0.3 ? '中' : '低'
    };

    setKpiData(prev => ({ ...prev, [activeScenario]: newKPI }));
    setIsSimulating(false);
    toast.success('推演完成！');
  }, [activeScenario, baselineKPI, scenarios]);

  // ===== 聊天功能 =====
  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // 模拟AI回复
    setTimeout(() => {
      const responses: Record<string, string> = {
        '分析': `基于当前推演结果分析：\n\n**${scenarios.find(s => s.id === activeScenario)?.name}**\n• 成本：¥${currentKPI.cost.toLocaleString()}\n• 周期：${currentKPI.duration}天\n• 利润：${currentKPI.profit}%\n• 风险：${currentKPI.risk}\n\n与Baseline相比：\n• 成本变化：${((currentKPI.cost - baselineKPI.cost) / baselineKPI.cost * 100).toFixed(1)}%\n• 周期变化：${currentKPI.duration - baselineKPI.duration}天`,
        '瓶颈': '通过分析推演数据，识别出以下瓶颈节点：\n\n1. **焊接节点** - 关键路径\n   - 当前配置下周期较长\n   - 建议增加1台焊机\n\n2. **机加工序** - 资源受限\n   - 设备利用率过高\n   - 建议考虑部分外协',
        '优化': '推荐以下优化方案：\n\n**方案A - 增加资源**\n• 增加1台焊机\n• 预期：周期-2天，成本+10万\n\n**方案B - 并行优化**\n• 调整工序并行策略\n• 预期：周期-4天，风险+10%\n\n**方案C - 混合策略**\n• 部分外协+资源增加\n• 预期：周期-6天，成本+15万'
      };

      let replyContent = '我理解你的问题。请尝试询问：\n• "分析当前方案"\n• "识别瓶颈节点"\n• "推荐优化方案"';

      for (const [key, value] of Object.entries(responses)) {
        if (chatInput.includes(key)) {
          replyContent = value;
          break;
        }
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: Date.now(),
        suggestions: ['查看详细对比', '应用推荐方案', '导出分析报告']
      };

      setChatMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  // ===== 应用方案 =====
  const applyScenario = () => {
    toast.success(`已应用 ${scenarios.find(s => s.id === activeScenario)?.name}`);
    // TODO: 写回项目节点数据
  };

  // ===== 渲染 =====
  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* ==================== 顶部：项目选择 + 场景切换 + KPI总览 ==================== */}
      <div className="bg-card border border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* 项目选择 */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">脱硫塔项目</span>
          </div>

          {/* 场景切换 */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => setActiveScenario(scenario.id)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeScenario === scenario.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {scenario.isBaseline ? 'Baseline' : scenario.name.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* KPI总览 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">成本</span>
            <span className="text-sm font-mono font-bold">¥{(currentKPI.cost / 10000).toFixed(0)}万</span>
            {currentKPI.cost !== baselineKPI.cost && (
              <Badge variant="outline" className={`text-[10px] ${currentKPI.cost > baselineKPI.cost ? 'text-red-600' : 'text-green-600'}`}>
                {currentKPI.cost > baselineKPI.cost ? '+' : ''}{((currentKPI.cost - baselineKPI.cost) / baselineKPI.cost * 100).toFixed(1)}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">周期</span>
            <span className="text-sm font-mono font-bold">{currentKPI.duration}天</span>
            {currentKPI.duration !== baselineKPI.duration && (
              <Badge variant="outline" className={`text-[10px] ${currentKPI.duration < baselineKPI.duration ? 'text-green-600' : 'text-red-600'}`}>
                {currentKPI.duration > baselineKPI.duration ? '+' : ''}{currentKPI.duration - baselineKPI.duration}天
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">利润</span>
            <span className="text-sm font-mono font-bold">{currentKPI.profit}%</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">风险</span>
            <span className={`text-xs px-2 py-0.5 rounded ${getRiskColor(currentKPI.risk)}`}>
              {currentKPI.risk}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 主体：左-中-右三栏布局 ==================== */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* ===== 左侧：参数与场景构建器 ===== */}
        <Card className="w-72 flex flex-col rounded-none border-border shadow-none overflow-hidden">
          <CardHeader className="p-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4" />
              参数配置
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 overflow-auto space-y-4 flex-1">
            {/* 资源类 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" /> 资源类
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>焊工数量</span>
                    <span className="font-mono">{paramOverrides.welders}人</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={paramOverrides.welders}
                    onChange={(e) => setParamOverrides(prev => ({ ...prev, welders: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>焊机数量</span>
                    <span className="font-mono">{paramOverrides.machines}台</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={paramOverrides.machines}
                    onChange={(e) => setParamOverrides(prev => ({ ...prev, machines: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 成本类 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> 成本类
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>材料价格系数</span>
                    <span className="font-mono">{paramOverrides.materialPrice.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={paramOverrides.materialPrice}
                    onChange={(e) => setParamOverrides(prev => ({ ...prev, materialPrice: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>外协价格系数</span>
                    <span className="font-mono">{paramOverrides.outsourcingRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={2}
                    step={0.1}
                    value={paramOverrides.outsourcingRate}
                    onChange={(e) => setParamOverrides(prev => ({ ...prev, outsourcingRate: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 风险类 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" /> 风险类
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>返工率</span>
                    <span className="font-mono">{(paramOverrides.reworkRate * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.3}
                    step={0.01}
                    value={paramOverrides.reworkRate}
                    onChange={(e) => setParamOverrides(prev => ({ ...prev, reworkRate: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>延误概率</span>
                    <span className="font-mono">{(paramOverrides.delayProbability * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.05}
                    value={paramOverrides.delayProbability}
                    onChange={(e) => setParamOverrides(prev => ({ ...prev, delayProbability: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 场景操作 */}
            <div className="pt-4 border-t border-border space-y-2">
              <Button
                size="sm"
                className="w-full rounded-none text-xs"
                onClick={runSimulation}
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <Activity className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                {isSimulating ? '推演中...' : '运行推演'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-none text-xs"
                  onClick={() => {
                    const newId = `scenario-${Date.now()}`;
                    setScenarios(prev => [...prev, {
                      id: newId,
                      name: `方案${String.fromCharCode(65 + prev.length)}`,
                      isBaseline: false,
                      overrides: { ...paramOverrides }
                    }]);
                    toast.success('已复制为新方案');
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-none text-xs"
                  disabled={scenarios.find(s => s.id === activeScenario)?.isBaseline}
                  onClick={() => {
                    setScenarios(prev => prev.filter(s => s.id !== activeScenario));
                    setActiveScenario('baseline');
                    toast.success('已删除方案');
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  删除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== 中间：推演执行图 ===== */}
        <Card className="flex-1 flex flex-col rounded-none border-border shadow-none overflow-hidden">
          <CardHeader className="p-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              推演执行图
            </CardTitle>
            <div className="flex bg-muted p-1 rounded">
              {(['graph', 'gantt', 'costflow'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                    viewMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'graph' && 'Graph'}
                  {mode === 'gantt' && 'Gantt'}
                  {mode === 'costflow' && 'Cost Flow'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <div className="w-full h-full absolute inset-0">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                minZoom={0.3}
                maxZoom={2}
                className="bg-slate-50"
                style={{ width: '100%', height: '100%' }}
                nodesDraggable={true}
                elementsSelectable={true}
                zoomOnScroll={true}
                panOnDrag={true}
                attributionPosition="bottom-right"
              >
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls />
              </ReactFlow>
            </div>

            {/* 选中节点详情浮窗 */}
            {selectedNodeId && (
              <div className="absolute bottom-4 left-4 right-4 bg-card border border-border p-4 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-bold">
                      {project.nodes.find(n => n.id === selectedNodeId)?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {selectedNodeId}
                    </div>
                  </div>
                  <button onClick={() => setSelectedNodeId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="p-2 bg-muted/30">
                    <div className="text-muted-foreground mb-1">Baseline</div>
                    <div className="font-mono">
                      <div>¥{(project.nodes.find(n => n.id === selectedNodeId)?.plannedCost.total || 0).toLocaleString()}</div>
                      <div>{project.nodes.find(n => n.id === selectedNodeId)?.duration || 0}天</div>
                    </div>
                  </div>
                  <div className="p-2 bg-blue-50 border border-blue-200">
                    <div className="text-blue-600 mb-1">当前方案</div>
                    <div className="font-mono text-blue-900">
                      <div>¥{Math.floor((project.nodes.find(n => n.id === selectedNodeId)?.plannedCost.total || 0) * 1.1).toLocaleString()}</div>
                      <div>{Math.max(1, (project.nodes.find(n => n.id === selectedNodeId)?.duration || 0) - 2)}天</div>
                    </div>
                  </div>
                  <div className="p-2 bg-green-50 border border-green-200">
                    <div className="text-green-600 mb-1">变化</div>
                    <div className="font-mono text-green-900">
                      <div>+10%</div>
                      <div>-2天</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 右侧：结果对比面板 ===== */}
        <Card className="w-80 flex flex-col rounded-none border-border shadow-none overflow-hidden">
          <CardHeader className="p-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              方案对比
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 overflow-auto flex-1 space-y-4">
            {/* KPI对比表格 */}
            <div className="border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 text-left font-mono">指标</th>
                    {scenarios.slice(0, 3).map(s => (
                      <th key={s.id} className="px-2 py-2 text-center font-mono">
                        {s.isBaseline ? 'Baseline' : s.name.split(' - ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-2 py-2 text-muted-foreground">成本</td>
                    {scenarios.slice(0, 3).map(s => (
                      <td key={s.id} className="px-2 py-2 text-center font-mono">
                        ¥{(kpiData[s.id]?.cost / 10000 || 120).toFixed(0)}万
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-muted-foreground">周期</td>
                    {scenarios.slice(0, 3).map(s => (
                      <td key={s.id} className="px-2 py-2 text-center font-mono">
                        {kpiData[s.id]?.duration || 32}天
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-muted-foreground">利润</td>
                    {scenarios.slice(0, 3).map(s => (
                      <td key={s.id} className="px-2 py-2 text-center font-mono">
                        {kpiData[s.id]?.profit || 18}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-muted-foreground">风险</td>
                    {scenarios.slice(0, 3).map(s => (
                      <td key={s.id} className="px-2 py-2 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRiskColor(kpiData[s.id]?.risk || '中')}`}>
                          {kpiData[s.id]?.risk || '中'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 变化来源 */}
            <div className="p-3 bg-muted/20 border border-border">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">变化来源</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">焊机折旧</span>
                  <span className="text-red-600 font-mono">+¥2万</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">能耗增加</span>
                  <span className="text-red-600 font-mono">+¥0.5万</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">人工节约</span>
                  <span className="text-green-600 font-mono">-¥1万</span>
                </div>
                <div className="border-t border-border pt-1 mt-1 flex justify-between font-bold">
                  <span>净变化</span>
                  <span className="text-red-600 font-mono">+¥1.5万</span>
                </div>
              </div>
            </div>

            {/* 图表 */}
            <div className="h-32">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">成本对比</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarios.slice(0, 3).map(s => ({
                  name: s.isBaseline ? 'Baseline' : s.name.split(' - ')[0],
                  cost: (kpiData[s.id]?.cost || 1200000) / 10000
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(value: number) => [`¥${value}万`, '成本']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 周期对比图 */}
            <div className="h-32">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">周期对比</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarios.slice(0, 3).map(s => ({
                  name: s.isBaseline ? 'Baseline' : s.name.split(' - ')[0],
                  duration: kpiData[s.id]?.duration || 32
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value}天`, '周期']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="duration" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== 底部：AI建议 + 决策操作区 ==================== */}
      <div className="flex gap-3">
        {/* AI建议 */}
        <Card className="flex-1 rounded-none border-border shadow-none">
          <CardHeader className="p-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              AI推演助手
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex gap-3">
              {/* 风险节点 */}
              <div className="flex-1 p-3 bg-red-50 border border-red-200">
                <div className="text-[10px] text-red-600 font-mono uppercase mb-1">⚠️ 风险节点</div>
                <div className="text-sm font-medium text-red-900">焊接工序</div>
                <div className="text-xs text-red-700 mt-1">设备利用率98%，存在延误风险</div>
              </div>
              {/* 推荐方案 */}
              <div className="flex-1 p-3 bg-blue-50 border border-blue-200">
                <div className="text-[10px] text-blue-600 font-mono uppercase mb-1">💡 推荐方案</div>
                <div className="text-sm font-medium text-blue-900">增加1台焊机</div>
                <div className="text-xs text-blue-700 mt-1">预期：周期-2天，成本+10万</div>
              </div>
              {/* 影响预测 */}
              <div className="flex-1 p-3 bg-green-50 border border-green-200">
                <div className="text-[10px] text-green-600 font-mono uppercase mb-1">📈 影响预测</div>
                <div className="text-sm font-medium text-green-900">利润提升2%</div>
                <div className="text-xs text-green-700 mt-1">综合成本收益比1:1.5</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 决策按钮 */}
        <Card className="w-96 rounded-none border-border shadow-none">
          <CardHeader className="p-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">
              决策操作
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 rounded-none text-xs"
                onClick={applyScenario}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                应用方案
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-none text-xs"
                onClick={() => toast.info('写回项目功能开发中...')}
              >
                <Save className="w-3 h-3 mr-1" />
                写回项目
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-none text-xs"
                onClick={() => toast.info('生成排产功能开发中...')}
              >
                <Calendar className="w-3 h-3 mr-1" />
                生成排产
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs px-2"
                onClick={() => toast.info('导出报告功能开发中...')}
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
