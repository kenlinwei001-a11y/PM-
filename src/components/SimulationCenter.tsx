import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Play, Activity, AlertTriangle, CheckCircle2, ArrowRight, Zap, TrendingDown, TrendingUp, Info, Plus, X, GitCompare, BarChart3, Clock, DollarSign, RotateCcw, Settings } from 'lucide-react';
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

export function SimulationCenter({ project }: SimulationCenterProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'results'>('setup');
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
            >n              {isSimulating ? (
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
      )}
    </div>
  );
}
