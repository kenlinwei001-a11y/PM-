import { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskNodePack, SixMType, SixMNode, mockTaskNodePacks, INDUSTRIAL_RESOURCES, BINDING_RULES, ResourceCategory } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  User, Settings, Package, BookOpen, Cloud, Search, Plus, Save,
  Cpu, Factory, Scale, Truck, Zap, Briefcase, Beaker, Layers,
  Calculator, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { skillExecutionEngine } from '../engine/SkillExecutionEngine';
import { skillCache } from '../engine/SkillCache';
import { useSkillStore } from '../store/skillStore';
import type { ExecutionContext, AggregatedResult, ResourceSkillBinding } from '../engine/types';
import type { IndustrialResource } from '../types';

// 4大类资源配置
const RESOURCE_CATEGORIES: { id: ResourceCategory; label: string; icon: any; color: string }[] = [
  { id: 'consumable', label: '消耗类', icon: Package, color: 'text-blue-600' },
  { id: 'occupiable', label: '占用类', icon: Factory, color: 'text-purple-600' },
  { id: 'labor', label: '人工类', icon: User, color: 'text-green-600' },
  { id: 'allocatable', label: '摊销类', icon: Scale, color: 'text-amber-600' },
  { id: 'external', label: '外部成本', icon: Truck, color: 'text-rose-600' },
];

const SIX_M_CATEGORIES: { id: SixMType; label: string; icon: any; resourceCategory: ResourceCategory }[] = [
  { id: 'man', label: '人', icon: User, resourceCategory: 'labor' },
  { id: 'machine', label: '机', icon: Settings, resourceCategory: 'occupiable' },
  { id: 'material', label: '料', icon: Package, resourceCategory: 'consumable' },
  { id: 'method', label: '法', icon: BookOpen, resourceCategory: 'allocatable' },
  { id: 'environment', label: '环', icon: Cloud, resourceCategory: 'allocatable' },
  { id: 'measurement', label: '测', icon: Search, resourceCategory: 'external' },
];

// Skill Binding Panel Component
function SkillBindingPanel({
  node,
  selectedResources,
  bindings,
  calculationResult,
  isCalculating,
  onExecute
}: {
  node: SixMNode;
  selectedResources: IndustrialResource[];
  bindings: ResourceSkillBinding[];
  calculationResult: AggregatedResult | null;
  isCalculating: boolean;
  onExecute: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-4">
      {/* Binding Status */}
      <div className="p-3 bg-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-primary flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Skill自动绑定
          </h4>
          {bindings.length > 0 && (
            <Badge variant="outline" className="text-[10px] rounded-none">
              {bindings.length} 个Skill
            </Badge>
          )}
        </div>

        {bindings.length > 0 ? (
          <div className="space-y-1.5">
            {bindings.map((binding, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="font-mono">{binding.skill_id}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{binding.rule_id}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            选择资源后将自动匹配Binding Rule并绑定Skill
          </div>
        )}
      </div>

      {/* Calculation Result */}
      {(calculationResult || isCalculating) && (
        <div className={`p-4 border ${calculationResult?.status === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-green-500/5 border-green-500/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-medium flex items-center gap-2 ${calculationResult?.status === 'error' ? 'text-destructive' : 'text-green-700'}`}>
              {isCalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : calculationResult?.status === 'error' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isCalculating ? '计算中...' : 'Skill计算结果'}
            </h4>
            {calculationResult && (
              <span className="text-[10px] text-muted-foreground">
                {calculationResult.executionTime.toFixed(0)}ms
              </span>
            )}
          </div>

          {calculationResult && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">总成本:</span>
                <span className="text-xl font-mono font-bold text-primary">
                  ¥{calculationResult.totalCost?.toLocaleString()}
                </span>
              </div>

              {calculationResult.breakdown && Object.keys(calculationResult.breakdown).length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mb-2"
                  >
                    {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    成本构成
                  </button>

                  {showDetails && (
                    <div className="space-y-1">
                      {Object.entries(calculationResult.breakdown)
                        .filter(([_, v]) => v && v > 0)
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="capitalize text-muted-foreground">{key}:</span>
                            <span className="font-mono">¥{(value || 0).toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {calculationResult.executionTrace?.skillResults && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-[10px] text-muted-foreground mb-1">执行链路:</div>
                  <div className="space-y-0.5">
                    {calculationResult.executionTrace.skillResults.slice(0, 3).map((sr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="font-mono">{sr.skillCode}</span>
                        <span className={`${sr.status === 'success' ? 'text-green-500' : 'text-destructive'}`}>
                          {sr.executionTime.toFixed(0)}ms
                        </span>
                      </div>
                    ))}
                    {calculationResult.executionTrace.skillResults.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{calculationResult.executionTrace.skillResults.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 h-7 text-xs rounded-none"
            onClick={onExecute}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Calculator className="w-3 h-3 mr-1" />
            )}
            {isCalculating ? '计算中...' : '重新计算'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Resource usage data interface
interface ResourceUsage {
  quantity: number;      // 数量
  hours: number;         // 小时数
  days: number;          // 人天数
  weight: number;        // 吨/重量
  area: number;          // 面积
  volume: number;        // 体积
  trips: number;         // 次数
  shifts: number;        // 班次
}

export function TaskTemplateCenter() {
  const [taskPacks, setTaskPacks] = useState<TaskNodePack[]>(mockTaskNodePacks);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(mockTaskNodePacks[0].task_id);
  const [selectedCategory, setSelectedCategory] = useState<SixMType>('man');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Resource selection state
  const [nodeResources, setNodeResources] = useState<Record<string, IndustrialResource[]>>({});
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<ResourceCategory | null>(null);

  // Resource usage data (quantity, hours, days, tons, etc.)
  const [resourceUsage, setResourceUsage] = useState<Record<string, ResourceUsage>>({});

  // Skill execution state
  const [calculationResults, setCalculationResults] = useState<Record<string, AggregatedResult>>({});
  const [isCalculating, setIsCalculating] = useState<Record<string, boolean>>({});

  const currentTaskPack = taskPacks.find(p => p.task_id === selectedTaskId) || taskPacks[0];
  const currentCategoryNodes = currentTaskPack.node_pack.find(p => p.type === selectedCategory)?.nodes || [];
  const selectedNode = currentCategoryNodes.find(n => n.id === selectedNodeId) || currentCategoryNodes[0];

  // Get resources for current node
  const currentNodeResources = selectedNode ? (nodeResources[selectedNode.id] || []) : [];

  // Auto-bind Skills when resources or usage change
  useEffect(() => {
    if (!selectedNode || currentNodeResources.length === 0) return;

    // Debounce calculation
    const timer = setTimeout(() => {
      executeSkillCalculation(selectedNode);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    selectedNode?.id,
    JSON.stringify(currentNodeResources.map(r => r.id)),
    JSON.stringify(currentNodeResources.map(r => resourceUsage[`${selectedNode?.id}_${r.id}`]))
  ]);

  const executeSkillCalculation = useCallback(async (node: SixMNode) => {
    const resources = nodeResources[node.id] || [];
    if (resources.length === 0) return;

    setIsCalculating(prev => ({ ...prev, [node.id]: true }));

    try {
      // Aggregate usage data from all resources
      const usage = resources.reduce((acc, r) => {
        const u = getResourceUsage(node.id, r.id);
        return {
          totalQuantity: acc.totalQuantity + u.quantity,
          totalHours: acc.totalHours + u.hours,
          totalDays: acc.totalDays + u.days,
          totalWeight: acc.totalWeight + u.weight,
          totalArea: acc.totalArea + u.area,
          totalVolume: acc.totalVolume + u.volume,
          totalTrips: acc.totalTrips + u.trips,
          totalShifts: acc.totalShifts + u.shifts
        };
      }, { totalQuantity: 0, totalHours: 0, totalDays: 0, totalWeight: 0, totalArea: 0, totalVolume: 0, totalTrips: 0, totalShifts: 0 });

      // Build execution context with usage data
      const context: ExecutionContext = {
        nodeId: node.id,
        nodeType: node.type,
        resources,
        bindings: [],
        inputs: {
          // Node base data
          duration: node.duration || node.work_hours || usage.totalHours || 1,
          count: node.count || usage.totalQuantity || 1,
          quantity: node.quantity || usage.totalQuantity || 0,
          // Resource usage aggregated data
          usage_quantity: usage.totalQuantity,
          usage_hours: usage.totalHours,
          usage_days: usage.totalDays,
          usage_weight: usage.totalWeight,
          usage_area: usage.totalArea,
          usage_volume: usage.totalVolume,
          usage_trips: usage.totalTrips,
          usage_shifts: usage.totalShifts,
          // Include full node data
          ...node
        },
        outputs: {},
        metadata: {
          projectId: selectedTaskId,
          startTime: Date.now(),
          version: '1.0',
          resourceUsage: Object.fromEntries(
            resources.map(r => [r.id, getResourceUsage(node.id, r.id)])
          )
        }
      };

      // Create bindings from resources
      const bindings: ResourceSkillBinding[] = [];
      resources.forEach(resource => {
        resource.bound_skill_ids.forEach(skillId => {
          bindings.push({
            id: `binding_${resource.id}_${skillId}_${Date.now()}`,
            resource_id: resource.id,
            skill_id: skillId,
            rule_id: 'auto_binding',
            input_overrides: {},
            status: 'active'
          });
        });
      });

      // Execute Skill DAG
      const dag = skillExecutionEngine.buildDAG(context, bindings);
      const result = await skillExecutionEngine.executeDAG(dag, context);

      setCalculationResults(prev => ({ ...prev, [node.id]: result }));
    } catch (error) {
      console.error('Skill calculation failed:', error);
      toast.error('成本计算失败');
    } finally {
      setIsCalculating(prev => ({ ...prev, [node.id]: false }));
    }
  }, [nodeResources, selectedTaskId, resourceUsage]);

  const handleNodeChange = (field: keyof SixMNode, value: any) => {
    if (!selectedNode) return;

    setTaskPacks(prevPacks => {
      return prevPacks.map(pack => {
        if (pack.task_id !== selectedTaskId) return pack;

        return {
          ...pack,
          node_pack: pack.node_pack.map(category => {
            if (category.type !== selectedCategory) return category;

            return {
              ...category,
              nodes: category.nodes.map(node => {
                if (node.id !== selectedNode.id) return node;
                return { ...node, [field]: value };
              })
            };
          })
        };
      });
    });

    // Trigger recalculation after node change
    setTimeout(() => {
      executeSkillCalculation({ ...selectedNode, [field]: value });
    }, 300);
  };

  // Add resource to node
  const addResourceToNode = (resource: IndustrialResource) => {
    if (!selectedNode) return;

    setNodeResources(prev => {
      const current = prev[selectedNode.id] || [];
      if (current.find(r => r.id === resource.id)) {
        toast.info('该资源已添加');
        return prev;
      }
      return {
        ...prev,
        [selectedNode.id]: [...current, resource]
      };
    });

    // Initialize usage data for this resource
    setResourceUsage(prev => ({
      ...prev,
      [`${selectedNode.id}_${resource.id}`]: {
        quantity: 1,
        hours: resource.category === 'labor' ? 8 : 0,
        days: 1,
        weight: 0,
        area: 0,
        volume: 0,
        trips: 0,
        shifts: 1
      }
    }));

    toast.success(`已添加资源: ${resource.name}`);
  };

  // Remove resource from node
  const removeResourceFromNode = (resourceId: string) => {
    if (!selectedNode) return;

    setNodeResources(prev => ({
      ...prev,
      [selectedNode.id]: (prev[selectedNode.id] || []).filter(r => r.id !== resourceId)
    }));

    // Remove usage data for this resource
    setResourceUsage(prev => {
      const key = `${selectedNode.id}_${resourceId}`;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  // Update resource usage data
  const updateResourceUsage = (resourceId: string, field: keyof ResourceUsage, value: number) => {
    if (!selectedNode) return;
    const key = `${selectedNode.id}_${resourceId}`;
    setResourceUsage(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { quantity: 1, hours: 0, days: 1, weight: 0, area: 0, volume: 0, trips: 0, shifts: 1 }),
        [field]: value
      }
    }));
  };

  // Get usage data for a resource
  const getResourceUsage = (nodeId: string, resourceId: string): ResourceUsage => {
    return resourceUsage[`${nodeId}_${resourceId}`] || { quantity: 1, hours: 0, days: 1, weight: 0, area: 0, volume: 0, trips: 0, shifts: 1 };
  };

  // Calculate total cost using Skill results
  const totalCost = useMemo(() => {
    return Object.values(calculationResults).reduce((sum, result) => {
      return sum + (result.totalCost || 0);
    }, 0);
  }, [calculationResults]);

  // Get filtered resources by category
  const filteredResources = selectedResourceCategory
    ? INDUSTRIAL_RESOURCES.filter(r => r.category === selectedResourceCategory)
    : INDUSTRIAL_RESOURCES;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-xl font-medium">任务节点模板配置中心</h2>
          <select 
            value={selectedTaskId}
            onChange={(e) => {
              setSelectedTaskId(e.target.value);
              setSelectedNodeId(null);
            }}
            className="bg-background border border-border p-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary w-64"
          >
            {mockTaskNodePacks.map(pack => (
              <option key={pack.task_id} value={pack.task_id}>{pack.task_id} - {pack.task_name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-muted-foreground">
            预估总成本: <span className="text-primary font-bold text-lg">¥{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <Button onClick={() => toast.success('模板保存成功')} className="rounded-none font-mono uppercase tracking-wider">
            <Save className="w-4 h-4 mr-2" /> 保存模板
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* Left: 6M Categories */}
        <Card className="w-64 shrink-0 rounded-none border-border shadow-none flex flex-col bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">6M 分类</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {SIX_M_CATEGORIES.map(category => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              const nodeCount = currentTaskPack.node_pack.find(p => p.type === category.id)?.nodes.length || 0;
              
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedNodeId(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 text-sm transition-colors border-l-2 ${
                    isActive 
                      ? 'border-primary bg-primary/10 text-primary font-medium' 
                      : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </div>
                  <span className="text-xs font-mono bg-background px-2 py-0.5 border border-border">{nodeCount}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Middle: Node List */}
        <Card className="w-80 shrink-0 rounded-none border-border shadow-none flex flex-col bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">节点列表</CardTitle>
            <Button variant="outline" size="sm" className="h-7 px-2 rounded-none text-xs">
              <Plus className="w-3 h-3 mr-1" /> 新增
            </Button>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentCategoryNodes.length > 0 ? (
              currentCategoryNodes.map(node => (
                <div 
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3 border cursor-pointer transition-colors ${
                    (selectedNodeId === node.id || (!selectedNodeId && selectedNode?.id === node.id))
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm mb-2">{node.name}</div>
                  <div className="text-xs font-mono text-muted-foreground space-y-1">
                    {node.type === 'man' && (
                      <>
                        <div className="flex justify-between"><span>工时:</span> <span>{node.work_hours}h</span></div>
                        <div className="flex justify-between"><span>单价:</span> <span>¥{node.hourly_rate}/h</span></div>
                      </>
                    )}
                    {node.type === 'machine' && (
                      <>
                        <div className="flex justify-between"><span>时长:</span> <span>{node.duration}h</span></div>
                        <div className="flex justify-between"><span>功率:</span> <span>{node.power_kw}kW</span></div>
                      </>
                    )}
                    {node.type === 'material' && (
                      <>
                        <div className="flex justify-between"><span>用量:</span> <span>{node.quantity}</span></div>
                        <div className="flex justify-between"><span>单价:</span> <span>¥{node.unit_price}</span></div>
                      </>
                    )}
                    {node.type === 'method' && (
                      <>
                        <div className="flex justify-between"><span>标准工时:</span> <span>{node.standard_time}h</span></div>
                      </>
                    )}
                    {node.type === 'environment' && (
                      <>
                        <div className="flex justify-between"><span>温度:</span> <span>{node.temperature}℃</span></div>
                        <div className="flex justify-between"><span>湿度:</span> <span>{node.humidity}%</span></div>
                      </>
                    )}
                    {node.type === 'measurement' && (
                      <>
                        <div className="flex justify-between"><span>成本:</span> <span>¥{node.cost}</span></div>
                        <div className="flex justify-between"><span>强制:</span> <span>{node.mandatory ? '是' : '否'}</span></div>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8 italic">
                暂无节点配置
              </div>
            )}
          </div>
        </Card>

        {/* Right: Node Details */}
        <Card className="flex-1 rounded-none border-border shadow-none flex flex-col bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">节点详情配置</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedNode ? (
              <div className="max-w-2xl space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2">基础信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">节点名称</label>
                      <Input value={selectedNode.name} onChange={(e) => handleNodeChange('name', e.target.value)} className="rounded-none font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">节点类型</label>
                      <Input value={selectedNode.type.toUpperCase()} readOnly className="rounded-none font-mono text-sm bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Specific Parameters */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2">参数配置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedNode.type === 'man' && (
                      <>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">人数</label><Input type="number" value={selectedNode.count} onChange={(e) => handleNodeChange('count', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">工时 (h)</label><Input type="number" value={selectedNode.work_hours} onChange={(e) => handleNodeChange('work_hours', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">单价 (元/h)</label><Input type="number" value={selectedNode.hourly_rate} onChange={(e) => handleNodeChange('hourly_rate', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">效率系数</label><Input type="number" value={selectedNode.efficiency} onChange={(e) => handleNodeChange('efficiency', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                      </>
                    )}
                    {selectedNode.type === 'machine' && (
                      <>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">功率 (kW)</label><Input type="number" value={selectedNode.power_kw} onChange={(e) => handleNodeChange('power_kw', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">使用时间 (h)</label><Input type="number" value={selectedNode.duration} onChange={(e) => handleNodeChange('duration', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">折旧 (元/h)</label><Input type="number" value={selectedNode.depreciation_per_hour} onChange={(e) => handleNodeChange('depreciation_per_hour', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                      </>
                    )}
                    {selectedNode.type === 'material' && (
                      <>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">用量</label><Input type="number" value={selectedNode.quantity} onChange={(e) => handleNodeChange('quantity', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">单价</label><Input type="number" value={selectedNode.unit_price} onChange={(e) => handleNodeChange('unit_price', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">损耗率</label><Input type="number" value={selectedNode.loss_rate} onChange={(e) => handleNodeChange('loss_rate', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                      </>
                    )}
                    {selectedNode.type === 'method' && (
                      <>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">标准工时 (h)</label><Input type="number" value={selectedNode.standard_time} onChange={(e) => handleNodeChange('standard_time', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2 col-span-2">
                          <label className="text-xs font-mono text-muted-foreground">工艺约束</label>
                          <div className="flex gap-2 mt-1">
                            {selectedNode.constraints?.map((c, i) => (
                              <span key={i} className="px-2 py-1 bg-muted border border-border text-xs font-mono">{c}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedNode.type === 'environment' && (
                      <>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">温度 (℃)</label><Input type="number" value={selectedNode.temperature} onChange={(e) => handleNodeChange('temperature', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">湿度 (%)</label><Input type="number" value={selectedNode.humidity} onChange={(e) => handleNodeChange('humidity', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">影响因子</label><Input type="number" value={selectedNode.impact_factor} onChange={(e) => handleNodeChange('impact_factor', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                      </>
                    )}
                    {selectedNode.type === 'measurement' && (
                      <>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">检测成本 (元)</label><Input type="number" value={selectedNode.cost} onChange={(e) => handleNodeChange('cost', Number(e.target.value))} className="rounded-none font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">是否强制</label><Input value={selectedNode.mandatory ? '是' : '否'} readOnly className="rounded-none font-mono text-sm bg-muted" /></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Resource Configuration */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold border-b border-border pb-2 flex items-center justify-between">
                    <span>资源配置 (4大类12子类)</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      已选 {currentNodeResources.length} 个资源
                    </span>
                  </h3>

                  {/* Resource Category Selector */}
                  <div className="flex flex-wrap gap-2">
                    {RESOURCE_CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isActive = selectedResourceCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedResourceCategory(isActive ? null : cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                            isActive
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background hover:border-primary/50'
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${isActive ? '' : cat.color}`} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Available Resources */}
                  <div className="border border-border p-3 bg-muted/20">
                    <div className="text-[10px] text-muted-foreground mb-2 font-mono uppercase">
                      {selectedResourceCategory ? '可添加资源' : '选择资源类别'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filteredResources.map(resource => {
                        const isAdded = currentNodeResources.some(r => r.id === resource.id);
                        return (
                          <button
                            key={resource.id}
                            onClick={() => addResourceToNode(resource)}
                            disabled={isAdded}
                            className={`px-2 py-1 text-[10px] border transition-colors ${
                              isAdded
                                ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-background border-border hover:border-primary'
                            }`}
                          >
                            {resource.name}
                            {isAdded && <CheckCircle2 className="w-2.5 h-2.5 inline ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Resources List */}
                  {currentNodeResources.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-muted-foreground font-mono uppercase">已配置资源 (含计算属性)</div>
                      <div className="space-y-2">
                        {currentNodeResources.map(resource => (
                          <div key={resource.id} className="p-3 bg-background border border-border">
                            {/* Resource Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{resource.name}</span>
                                <Badge variant="outline" className="text-[9px] rounded-none">
                                  {resource.subcategory}
                                </Badge>
                              </div>
                              <button
                                onClick={() => removeResourceFromNode(resource.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ×
                              </button>
                            </div>
                            {/* Resource Attributes - Data Source for Skills */}
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground border-t border-border pt-2">
                              {/* Unit Cost */}
                              <div className="flex justify-between">
                                <span>单价:</span>
                                <span className="font-mono text-foreground">¥{resource.unit_cost}/{resource.unit}</span>
                              </div>
                              {/* Category-specific attributes */}
                              {resource.attributes.power_kw !== undefined && (
                                <div className="flex justify-between">
                                  <span>功率:</span>
                                  <span className="font-mono text-foreground">{resource.attributes.power_kw}kW</span>
                                </div>
                              )}
                              {resource.attributes.hourly_rate !== undefined && (
                                <div className="flex justify-between">
                                  <span>时薪:</span>
                                  <span className="font-mono text-foreground">¥{resource.attributes.hourly_rate}</span>
                                </div>
                              )}
                              {resource.attributes.efficiency !== undefined && (
                                <div className="flex justify-between">
                                  <span>效率:</span>
                                  <span className="font-mono text-foreground">{resource.attributes.efficiency}</span>
                                </div>
                              )}
                              {resource.attributes.loss_rate !== undefined && (
                                <div className="flex justify-between">
                                  <span>损耗:</span>
                                  <span className="font-mono text-foreground">{(resource.attributes.loss_rate * 100).toFixed(0)}%</span>
                                </div>
                              )}
                              {resource.attributes.utilization_rate !== undefined && (
                                <div className="flex justify-between">
                                  <span>利用率:</span>
                                  <span className="font-mono text-foreground">{(resource.attributes.utilization_rate * 100).toFixed(0)}%</span>
                                </div>
                              )}
                              {resource.attributes.skill_level && (
                                <div className="flex justify-between">
                                  <span>等级:</span>
                                  <span className="font-mono text-foreground">{resource.attributes.skill_level}</span>
                                </div>
                              )}
                              {resource.attributes.depreciation_period !== undefined && (
                                <div className="flex justify-between">
                                  <span>折旧期:</span>
                                  <span className="font-mono text-foreground">{resource.attributes.depreciation_period}年</span>
                                </div>
                              )}
                              {/* Bound Skills */}
                              <div className="col-span-3 mt-1 pt-1 border-t border-dashed border-border">
                                <div className="flex gap-1 flex-wrap">
                                  {resource.bound_skill_ids.map(skillId => (
                                    <span key={skillId} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-mono">
                                      {skillId.split('-').slice(-2).join('-')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {/* Usage Inputs - Cost Calculation Parameters */}
                            <div className="mt-2 pt-2 border-t border-border">
                              <div className="text-[10px] text-muted-foreground mb-2 font-mono uppercase">使用量配置</div>
                              <div className="grid grid-cols-4 gap-2">
                                {/* Quantity - for all types */}
                                <div className="space-y-1">
                                  <label className="text-[9px] text-muted-foreground">数量</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={resource.category === 'consumable' ? 0.01 : 1}
                                    value={getResourceUsage(selectedNode?.id || '', resource.id).quantity}
                                    onChange={(e) => updateResourceUsage(resource.id, 'quantity', Number(e.target.value))}
                                    className="h-6 text-xs rounded-none"
                                  />
                                </div>
                                {/* Hours - for labor and equipment */}
                                {(resource.category === 'labor' || resource.category === 'occupiable') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground">小时</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={getResourceUsage(selectedNode?.id || '', resource.id).hours}
                                      onChange={(e) => updateResourceUsage(resource.id, 'hours', Number(e.target.value))}
                                      className="h-6 text-xs rounded-none"
                                    />
                                  </div>
                                )}
                                {/* Days - for labor */}
                                {resource.category === 'labor' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground">人天</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={getResourceUsage(selectedNode?.id || '', resource.id).days}
                                      onChange={(e) => updateResourceUsage(resource.id, 'days', Number(e.target.value))}
                                      className="h-6 text-xs rounded-none"
                                    />
                                  </div>
                                )}
                                {/* Weight - for consumable materials */}
                                {resource.category === 'consumable' && resource.subcategory === 'raw_material' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground">重量(吨)</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.001}
                                      value={getResourceUsage(selectedNode?.id || '', resource.id).weight}
                                      onChange={(e) => updateResourceUsage(resource.id, 'weight', Number(e.target.value))}
                                      className="h-6 text-xs rounded-none"
                                    />
                                  </div>
                                )}
                                {/* Area - for space */}
                                {resource.subcategory === 'space' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground">面积(m²)</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={getResourceUsage(selectedNode?.id || '', resource.id).area}
                                      onChange={(e) => updateResourceUsage(resource.id, 'area', Number(e.target.value))}
                                      className="h-6 text-xs rounded-none"
                                    />
                                  </div>
                                )}
                                {/* Trips - for external logistics */}
                                {resource.subcategory === 'logistics' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground">趟次</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={getResourceUsage(selectedNode?.id || '', resource.id).trips}
                                      onChange={(e) => updateResourceUsage(resource.id, 'trips', Number(e.target.value))}
                                      className="h-6 text-xs rounded-none"
                                    />
                                  </div>
                                )}
                                {/* Shifts - for production lines */}
                                {resource.subcategory === 'production_line' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-muted-foreground">班次</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      value={getResourceUsage(selectedNode?.id || '', resource.id).shifts}
                                      onChange={(e) => updateResourceUsage(resource.id, 'shifts', Number(e.target.value))}
                                      className="h-6 text-xs rounded-none"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Skill Binding & Calculation */}
                <SkillBindingPanel
                  node={selectedNode}
                  selectedResources={currentNodeResources}
                  bindings={currentNodeResources.flatMap(r =>
                    r.bound_skill_ids.map(skillId => ({
                      id: `binding_${r.id}_${skillId}`,
                      resource_id: r.id,
                      skill_id: skillId,
                      rule_id: 'auto_binding',
                      input_overrides: {},
                      status: 'active' as const
                    }))
                  )}
                  calculationResult={selectedNode ? calculationResults[selectedNode.id] : null}
                  isCalculating={selectedNode ? isCalculating[selectedNode.id] : false}
                  onExecute={() => selectedNode && executeSkillCalculation(selectedNode)}
                />

              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-mono italic">
                请在左侧选择一个节点查看详情
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
