import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Play, Activity, AlertTriangle, CheckCircle2, ArrowRight, Zap, TrendingDown, TrendingUp, Info, Plus, X, GitCompare, BarChart3, Clock, DollarSign, RotateCcw, Settings, MessageSquare, Send, Bot, User } from 'lucide-react';
import { Project, GraphNode } from '../types';
import { toast } from 'sonner';
import { useSkillStore, useNodeSkillResult } from '../store/skillStore';
import { simulationEngine } from '../engine/SimulationEngine';
import type { SimulationScenario, SimulationBatch, AggregatedResult } from '../engine/types';
import { INDUSTRIAL_RESOURCES } from '../types';

interface SimulationCenterProps {
  project: Project;
}

interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  resourceChanges: string[]; // Resource IDs to add/remove
  parameterOverrides: Record<string, number>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}

export function SimulationCenter({ project }: SimulationCenterProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'results' | 'chat'>('setup');
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectAllNodes, setSelectAllNodes] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    {
      id: 'base',
      name: '基准方案',
      description: '当前资源配置',
      resourceChanges: [],
      parameterOverrides: {}
    }
  ]);
  const [simulationBatch, setSimulationBatch] = useState<SimulationBatch | null>(null);
  const [comparisonResults, setComparisonResults] = useState<{
    scenario: ScenarioConfig;
    result: AggregatedResult | null;
    nodeCount?: number;
    delta?: {
      cost: number;
      duration: number;
    };
  }[]>([]);

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是推演助手。我可以帮助你：\n1. 分析不同方案的成本和周期影响\n2. 推荐最优资源配置\n3. 解释推演结果\n4. 回答关于项目的问题\n\n请问有什么可以帮助你的？',
      timestamp: Date.now(),
      suggestions: ['分析当前方案', '推荐优化方案', '解释成本构成']
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = generateAIResponse(inputMessage, comparisonResults, scenarios);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        suggestions: response.suggestions
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  // Generate AI response based on context
  const generateAIResponse = (
    userInput: string,
    results: typeof comparisonResults,
    currentScenarios: ScenarioConfig[]
  ): { content: string; suggestions?: string[] } => {
    const input = userInput.toLowerCase();

    // Check for specific intents
    if (input.includes('分析') || input.includes('结果') || input.includes('对比')) {
      if (results.length === 0) {
        return {
          content: '目前还没有推演结果。请先配置方案并运行推演，我就能为你分析结果了。',
          suggestions: ['运行推演', '配置方案', '查看帮助']
        };
      }

      const bestResult = results.filter(r => r.result).sort((a, b) => {
        const aScore = (a.result?.totalCost || 0) + (a.result?.duration || 0) * 1000;
        const bScore = (b.result?.totalCost || 0) + (b.result?.duration || 0) * 1000;
        return aScore - bScore;
      })[0];

      return {
        content: `根据当前的推演结果，我已经分析了 ${results.length} 个方案：\n\n**最优方案：${bestResult?.scenario.name}**\n- 总成本：¥${(bestResult?.result?.totalCost || 0).toLocaleString()}\n- 周期：${bestResult?.result?.duration || 0} 天\n\n与其他方案相比，该方案在成本和周期方面表现最佳。你可以点击"对比结果"标签查看详细对比。`,
        suggestions: ['查看详细对比', '优化方案', '导出报告']
      };
    }

    if (input.includes('推荐') || input.includes('优化') || input.includes('建议')) {
      return {
        content: '基于当前项目数据，我有以下优化建议：\n\n1. **资源配置**：考虑增加自动化设备资源，虽然初期成本增加，但可以显著缩短周期\n2. **并行工序**：识别可以并行执行的工序节点，减少关键路径长度\n3. **风险缓冲**：为高风险的非标工艺节点增加时间缓冲\n\n你可以创建新的方案来验证这些建议的效果。',
        suggestions: ['创建新方案', '分析风险节点', '查看资源利用率']
      };
    }

    if (input.includes('成本') || input.includes('价格') || input.includes('费用')) {
      const totalCost = results.reduce((sum, r) => sum + (r.result?.totalCost || 0), 0);
      return {
        content: `当前推演结果的成本分析：\n\n- 基准方案成本：¥${(results[0]?.result?.totalCost || 0).toLocaleString()}\n- 所有方案平均成本：¥${totalCost > 0 ? Math.round(totalCost / results.length).toLocaleString() : '0'}\n\n成本主要由以下部分构成：\n- 人力资源成本\n- 设备使用成本\n- 物料采购成本\n- 外包加工成本\n\n你可以通过调整资源配置来优化成本结构。`,
        suggestions: ['优化成本', '查看成本构成', '对比方案']
      };
    }

    if (input.includes('周期') || input.includes('时间') || input.includes('工期')) {
      const avgDuration = results.length > 0
        ? results.reduce((sum, r) => sum + (r.result?.duration || 0), 0) / results.length
        : 0;
      return {
        content: `项目周期分析：\n\n- 当前平均周期：${avgDuration.toFixed(1)} 天\n- 最短周期方案：${results.filter(r => r.result).sort((a, b) => (a.result?.duration || 0) - (b.result?.duration || 0))[0]?.scenario.name || '未计算'}\n\n缩短周期的建议：\n1. 增加关键路径上的资源投入\n2. 优化工序间的衔接，减少等待时间\n3. 对非关键路径上的任务适当延后，集中资源保证关键节点`,
        suggestions: ['查看关键路径', '优化工期', '资源调度']
      };
    }

    if (input.includes('帮助') || input.includes('help') || input.includes('能做什么')) {
      return {
        content: '我可以为你提供以下帮助：\n\n**推演分析**\n- 分析多方案对比结果\n- 推荐最优资源配置方案\n- 解释成本和周期的变化原因\n\n**决策支持**\n- 评估不同决策对项目的影响\n- 识别风险和瓶颈\n- 提供优化建议\n\n**数据解读**\n- 解释推演结果的各项指标\n- 对比不同方案的优劣\n- 生成分析报告\n\n你可以直接提问，或者点击下方的建议按钮快速开始。',
        suggestions: ['分析当前方案', '推荐优化方案', '解释推演结果']
      };
    }

    // Default response
    return {
      content: '我理解你的问题。为了更好地帮助你，能否提供更多细节？比如你想了解：\n- 当前推演方案的对比分析\n- 针对特定节点的优化建议\n- 成本和周期的详细构成\n\n或者你可以直接点击下方的建议按钮。',
      suggestions: ['分析推演结果', '推荐优化方案', '查看成本分析']
    };
  };

  // Add new scenario
  const addScenario = () => {
    if (scenarios.length >= 5) {
      toast.error('最多支持5个方案对比');
      return;
    }
    const newScenario: ScenarioConfig = {
      id: `scenario_${Date.now()}`,
      name: `方案 ${String.fromCharCode(65 + scenarios.length)}`,
      description: '',
      resourceChanges: [],
      parameterOverrides: {}
    };
    setScenarios([...scenarios, newScenario]);
  };

  // Remove scenario
  const removeScenario = (id: string) => {
    if (id === 'base') {
      toast.error('不能删除基准方案');
      return;
    }
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  // Update scenario
  const updateScenario = (id: string, updates: Partial<ScenarioConfig>) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Run simulation for a single node
  const simulateNode = async (nodeId: string): Promise<any[]> => {
    const selectedNode = project.nodes.find(n => n.id === nodeId);
    if (!selectedNode) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    // Mock base context
    const baseContext = {
      nodeId: nodeId,
      nodeType: selectedNode.type,
      resources: selectedNode.resources.map(r => ({
        ...INDUSTRIAL_RESOURCES[0],
        id: r
      })),
      bindings: [],
      inputs: {
        duration: selectedNode.duration,
        ...selectedNode.plannedCost
      },
      outputs: {},
      metadata: {
        projectId: project.id,
        startTime: Date.now(),
        version: '1.0'
      }
    };

    // Create simulation scenarios
    const simScenarios = scenarios.map(scenario => ({
      name: scenario.name,
      description: scenario.description,
      resourceOverrides: scenario.resourceChanges.map(id =>
        INDUSTRIAL_RESOURCES.find(r => r.id === id) || INDUSTRIAL_RESOURCES[0]
      ).filter(Boolean),
      contextOverrides: {
        inputs: scenario.parameterOverrides
      }
    }));

    // Run simulation
    const batch = simulationEngine.createBatch(
      nodeId,
      baseContext as any,
      simScenarios
    );

    const completedBatch = await simulationEngine.executeBatch(batch.id);

    // Process results
    return scenarios.map((scenario, index) => {
      const result = completedBatch.results?.[index] || null;
      const baseResult = completedBatch.results?.[0];

      return {
        nodeId,
        nodeName: selectedNode.name,
        scenario,
        result,
        delta: result && baseResult ? {
          cost: (result.totalCost || 0) - (baseResult.totalCost || 0),
          duration: (result.duration || 0) - (baseResult.duration || 0)
        } : undefined
      };
    });
  };

  // Run simulation
  const handleSimulate = async () => {
    if (!selectedNodeId && !selectAllNodes) {
      toast.error('请先选择一个节点');
      return;
    }

    setIsSimulating(true);
    setActiveTab('results');

    try {
      let allResults: any[] = [];

      if (selectAllNodes) {
        // Simulate all nodes
        for (const node of project.nodes) {
          const nodeResults = await simulateNode(node.id);
          allResults = [...allResults, ...nodeResults];
        }
        toast.success(`全部 ${project.nodes.length} 个节点推演完成`);
      } else if (selectedNodeId) {
        // Simulate single node
        const nodeResults = await simulateNode(selectedNodeId);
        allResults = nodeResults;
        toast.success('推演完成');
      }

      // For display, aggregate results by scenario
      const aggregatedByScenario = scenarios.map(scenario => {
        const scenarioResults = allResults.filter(r => r.scenario.id === scenario.id);
        const totalCost = scenarioResults.reduce((sum, r) => sum + (r.result?.totalCost || 0), 0);
        const totalDuration = scenarioResults.reduce((sum, r) => sum + (r.result?.duration || 0), 0);

        return {
          scenario,
          result: {
            totalCost,
            duration: totalDuration,
            status: 'success'
          } as AggregatedResult,
          nodeCount: scenarioResults.length,
          delta: undefined
        };
      });

      setComparisonResults(aggregatedByScenario);
    } catch (error) {
      toast.error('推演失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <div>
          <h2 className="font-serif text-xl font-medium">推演与决策中心</h2>
          <p className="text-sm text-muted-foreground mt-1">
            多方案对比推演 - Skill Runtime引擎驱动
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectAllNodes ? '__ALL__' : (selectedNodeId || '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '__ALL__') {
                setSelectAllNodes(true);
                setSelectedNodeId(null);
              } else {
                setSelectAllNodes(false);
                setSelectedNodeId(value);
              }
            }}
            className="bg-background border border-border px-3 py-2 text-sm font-mono rounded-none"
          >
            <option value="">选择节点...</option>
            <option value="__ALL__">全部节点 ({project.nodes.length})</option>
            {project.nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.id} - {node.name}
              </option>
            ))}
          </select>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="rounded-none">
              <TabsTrigger value="setup" className="rounded-none text-xs font-mono">
                <Settings className="w-3 h-3 mr-1" /> 方案配置
              </TabsTrigger>
              <TabsTrigger value="results" className="rounded-none text-xs font-mono">
                <BarChart3 className="w-3 h-3 mr-1" /> 对比结果
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-none text-xs font-mono">
                <MessageSquare className="w-3 h-3 mr-1" /> 推演助手
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'setup' ? (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left: Scenario List */}
          <div className="w-80 flex flex-col gap-4">
            <Card className="flex-1 rounded-none border-border shadow-none overflow-hidden">
              <CardHeader className="p-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase tracking-wider">
                  推演方案 ({scenarios.length})
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-none" onClick={addScenario}>
                  <Plus className="w-3 h-3 mr-1" /> 添加
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                <div className="divide-y divide-border">
                  {scenarios.map((scenario, index) => (
                    <div
                      key={scenario.id}
                      className={`p-3 ${index === 0 ? 'bg-primary/5' : 'hover:bg-muted/30'} transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? 'default' : 'outline'} className="text-[10px] rounded-none">
                            {index === 0 ? '基准' : `方案 ${String.fromCharCode(64 + index)}`}
                          </Badge>
                          {index > 0 && (
                            <button
                              onClick={() => removeScenario(scenario.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={scenario.name}
                        onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-sm font-medium focus:outline-none focus:ring-0"
                        placeholder="方案名称"
                      />
                      <textarea
                        value={scenario.description}
                        onChange={(e) => updateScenario(scenario.id, { description: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-xs text-muted-foreground resize-none focus:outline-none focus:ring-0 mt-1"
                        placeholder="方案描述..."
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Run Button */}
            <Button
              onClick={handleSimulate}
              disabled={isSimulating || (!selectedNodeId && !selectAllNodes)}
              className="w-full h-12 rounded-none font-mono uppercase tracking-wider"
            >
              {isSimulating ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  推演中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  运行推演 ({scenarios.length}方案)
                </>
              )}
            </Button>
          </div>

          {/* Right: Resource Selection */}
          <Card className="flex-1 rounded-none border-border shadow-none overflow-hidden">
            <CardHeader className="p-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-mono uppercase tracking-wider">
                资源配置差异
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-auto">
              {!selectedNodeId ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">请先选择一个节点进行推演</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scenarios.map((scenario, index) => (
                    <div key={scenario.id} className="border border-border p-3 bg-card">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={index === 0 ? 'default' : 'outline'} className="text-[10px] rounded-none">
                          {index === 0 ? '基准' : `方案 ${String.fromCharCode(64 + index)}`}
                        </Badge>
                        <span className="text-sm font-medium">{scenario.name}</span>
                      </div>

                      {/* Resource Selection */}
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">调整资源:</div>
                        <div className="flex flex-wrap gap-1">
                          {INDUSTRIAL_RESOURCES.slice(0, 10).map(resource => (
                            <button
                              key={resource.id}
                              onClick={() => {
                                const current = scenario.resourceChanges;
                                const updated = current.includes(resource.id)
                                  ? current.filter(id => id !== resource.id)
                                  : [...current, resource.id];
                                updateScenario(scenario.id, { resourceChanges: updated });
                              }}
                              className={`text-[10px] px-2 py-1 border transition-colors ${
                                scenario.resourceChanges.includes(resource.id)
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted border-border hover:border-primary/50'
                              }`}
                            >
                              {resource.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Results Tab */
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Comparison Table */}
          <Card className="flex-1 rounded-none border-border shadow-none overflow-hidden">
            <CardHeader className="p-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase tracking-wider">
                <GitCompare className="w-4 h-4 inline mr-2" />
                方案对比结果
              </CardTitle>
              {isSimulating && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Activity className="w-3 h-3 animate-spin" />
                  计算中...
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              {comparisonResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm">请先运行推演</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-mono uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">方案</th>
                      <th className="px-4 py-3 text-right">总成本</th>
                      <th className="px-4 py-3 text-right">周期</th>
                      <th className="px-4 py-3 text-center">vs 基准</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {comparisonResults.map(({ scenario, result, delta }, index) => (
                      <tr key={scenario.id} className={index === 0 ? 'bg-primary/5' : 'hover:bg-muted/30'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? 'default' : 'outline'} className="text-[10px] rounded-none">
                              {index === 0 ? '基准' : `方案 ${String.fromCharCode(64 + index)}`}
                            </Badge>
                            <div>
                              <div className="font-medium">{scenario.name}</div>
                              <div className="text-xs text-muted-foreground">{scenario.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {result ? (
                            <>
                              <div className="font-semibold">¥{(result.totalCost || 0).toLocaleString()}</div>
                              {result.breakdown && (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  {Object.entries(result.breakdown)
                                    .filter(([_, v]) => v && v > 0)
                                    .slice(0, 2)
                                    .map(([k, v]) => `${k}: ¥${(v || 0).toLocaleString()}`)
                                    .join(', ')}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {result ? `${result.duration || 0} 天` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {delta ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] rounded-none ${
                                  delta.cost > 0 ? 'text-destructive border-destructive' : 'text-green-600 border-green-600'
                                }`}
                              >
                                {delta.cost > 0 ? '+' : ''}¥{delta.cost.toLocaleString()}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] rounded-none ${
                                  delta.duration > 0 ? 'text-destructive border-destructive' : 'text-green-600 border-green-600'
                                }`}
                              >
                                {delta.duration > 0 ? '+' : ''}{delta.duration}天
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">基准</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Right: Impact Analysis */}
          <Card className="w-80 rounded-none border-border shadow-none overflow-hidden">
            <CardHeader className="p-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-mono uppercase tracking-wider">
                影响分析
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-auto space-y-4">
              {comparisonResults.length > 1 ? (
                <>
                  {/* Best Option */}
                  <div className="p-3 bg-green-500/5 border border-green-500/20">
                    <div className="text-[10px] text-green-600 font-mono uppercase mb-1">最优方案</div>
                    {(() => {
                      const validResults = comparisonResults.filter(r => r.result);
                      if (validResults.length === 0) return <div className="text-sm text-muted-foreground">计算中...</div>;

                      const best = validResults.reduce((best, current) => {
                        const bestScore = (best.result?.totalCost || 0) + (best.result?.duration || 0) * 1000;
                        const currentScore = (current.result?.totalCost || 0) + (current.result?.duration || 0) * 1000;
                        return currentScore < bestScore ? current : best;
                      });

                      return (
                        <>
                          <div className="font-medium">{best.scenario.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            成本: ¥{(best.result?.totalCost || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            周期: {best.result?.duration || 0} 天
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Impact Path */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">资源变化影响路径:</div>
                    <div className="space-y-2 text-xs">
                      {comparisonResults.slice(1).map(({ scenario, delta }) => (
                        <div key={scenario.id} className="p-2 bg-muted/30 border border-border">
                          <div className="font-medium mb-1">{scenario.name}</div>
                          {scenario.resourceChanges.length > 0 && (
                            <div className="text-[10px] text-muted-foreground mb-1">
                              资源: {scenario.resourceChanges.length} 个变更
                            </div>
                          )}
                          {delta && (
                            <div className="space-y-0.5">
                              {delta.cost !== 0 && (
                                <div className={`flex justify-between ${delta.cost > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                  <span>成本影响:</span>
                                  <span>{delta.cost > 0 ? '+' : ''}¥{delta.cost.toLocaleString()}</span>
                                </div>
                              )}
                              {delta.duration !== 0 && (
                                <div className={`flex justify-between ${delta.duration > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                  <span>周期影响:</span>
                                  <span>{delta.duration > 0 ? '+' : ''}{delta.duration}天</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-border space-y-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-none text-xs"
                      onClick={() => setActiveTab('setup')}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      重新配置
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  请先运行推演查看影响分析
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'chat' ? (
        /* Chat Tab */
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left: Chat Interface */}
          <Card className="flex-1 rounded-none border-border shadow-none overflow-hidden flex flex-col">
            <CardHeader className="p-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4" />
                推演助手
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] rounded-none">
                  AI Powered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`flex-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] p-3 text-sm whitespace-pre-wrap ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                            : 'bg-muted rounded-2xl rounded-tl-sm'
                        }`}
                      >
                        {message.content}
                      </div>
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setInputMessage(suggestion);
                              }}
                              className="text-xs px-3 py-1.5 bg-background border border-border hover:border-primary hover:text-primary transition-colors rounded-full"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1 px-1">
                        {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-muted/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="输入消息询问推演相关问题..."
                    className="flex-1 bg-background border border-border px-4 py-2 text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="rounded-none px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>快捷提问:</span>
                  {['分析推演结果', '推荐优化方案', '解释成本构成'].map((quick) => (
                    <button
                      key={quick}
                      onClick={() => {
                        setInputMessage(quick);
                      }}
                      className="hover:text-primary transition-colors"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Quick Actions & Context */}
          <Card className="w-80 rounded-none border-border shadow-none overflow-hidden">
            <CardHeader className="p-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-mono uppercase tracking-wider">
                上下文信息
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-auto space-y-4">
              {/* Current Status */}
              <div className="p-3 bg-muted/30 border border-border">
                <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2">当前状态</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>选中节点:</span>
                    <span className="font-medium">
                      {selectAllNodes ? '全部' : (selectedNodeId ? project.nodes.find(n => n.id === selectedNodeId)?.name || selectedNodeId : '未选择')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>方案数量:</span>
                    <span className="font-medium">{scenarios.length} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span>推演状态:</span>
                    <span className={`font-medium ${comparisonResults.length > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {comparisonResults.length > 0 ? '已完成' : '未开始'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2">快捷操作</div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-none text-xs justify-start"
                    onClick={() => {
                      setActiveTab('setup');
                    }}
                    disabled={isSimulating}
                  >
                    <Settings className="w-3 h-3 mr-2" />
                    配置方案
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-none text-xs justify-start"
                    onClick={() => {
                      setActiveTab('results');
                    }}
                    disabled={comparisonResults.length === 0}
                  >
                    <BarChart3 className="w-3 h-3 mr-2" />
                    查看结果
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-none text-xs justify-start"
                    onClick={handleSimulate}
                    disabled={isSimulating || (!selectedNodeId && !selectAllNodes)}
                  >
                    {isSimulating ? (
                      <Activity className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 mr-2" />
                    )}
                    {isSimulating ? '推演中...' : '运行推演'}
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="p-3 bg-blue-50 border border-blue-200">
                <div className="text-[10px] text-blue-600 font-mono uppercase mb-2">使用提示</div>
                <ul className="text-xs text-blue-900 space-y-1">
                  <li>• 可以直接询问推演结果分析</li>
                  <li>• 点击建议按钮快速提问</li>
                  <li>• 助手会根据当前数据给出建议</li>
                  <li>• 运行推演后可以获得详细分析</li>
                </ul>
              </div>

              {/* Clear Chat */}
              {messages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-none text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setMessages([messages[0]]);
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  清空对话
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
