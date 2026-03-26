import { useState } from 'react';
import { TaskNodePack, SixMType, SixMNode, mockTaskNodePacks } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { User, Settings, Package, BookOpen, Cloud, Search, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

const SIX_M_CATEGORIES: { id: SixMType; label: string; icon: any }[] = [
  { id: 'man', label: '人 (Man)', icon: User },
  { id: 'machine', label: '机 (Machine)', icon: Settings },
  { id: 'material', label: '料 (Material)', icon: Package },
  { id: 'method', label: '法 (Method)', icon: BookOpen },
  { id: 'environment', label: '环 (Environment)', icon: Cloud },
  { id: 'measurement', label: '测 (Measurement)', icon: Search },
];

export function TaskTemplateCenter() {
  const [taskPacks, setTaskPacks] = useState<TaskNodePack[]>(mockTaskNodePacks);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(mockTaskNodePacks[0].task_id);
  const [selectedCategory, setSelectedCategory] = useState<SixMType>('man');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const currentTaskPack = taskPacks.find(p => p.task_id === selectedTaskId) || taskPacks[0];
  const currentCategoryNodes = currentTaskPack.node_pack.find(p => p.type === selectedCategory)?.nodes || [];
  const selectedNode = currentCategoryNodes.find(n => n.id === selectedNodeId) || currentCategoryNodes[0];

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
  };

  // Calculate costs
  const calculateNodeCost = (node: SixMNode) => {
    if (!node) return 0;
    switch (node.type) {
      case 'man':
        return (node.count || 0) * (node.work_hours || 0) * (node.hourly_rate || 0);
      case 'machine': {
        const depreciation = (node.depreciation_per_hour || 0) * (node.duration || 0);
        const energy = (node.power_kw || 0) * (node.duration || 0) * 0.8; // Assuming 0.8 energy cost factor
        return depreciation + energy;
      }
      case 'material':
        return (node.quantity || 0) * (node.unit_price || 0) * (1 + (node.loss_rate || 0));
      case 'measurement':
        return node.cost || 0;
      default:
        return 0;
    }
  };

  const totalCost = currentTaskPack.node_pack.reduce((total, pack) => {
    return total + pack.nodes.reduce((packTotal, node) => packTotal + calculateNodeCost(node), 0);
  }, 0);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-xl font-medium">Task 节点模板配置中心</h2>
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
          <Button onClick={() => toast.success('模板保存成功 (Template saved successfully)')} className="rounded-none font-mono uppercase tracking-wider">
            <Save className="w-4 h-4 mr-2" /> 保存模板
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* Left: 6M Categories */}
        <Card className="w-64 shrink-0 rounded-none border-border shadow-none flex flex-col bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">6M 分类 (Categories)</CardTitle>
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
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">节点列表 (Nodes)</CardTitle>
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
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">节点详情配置 (Configuration)</CardTitle>
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
                        <div className="space-y-2"><label className="text-xs font-mono text-muted-foreground">是否强制</label><Input value={selectedNode.mandatory ? '是 (Yes)' : '否 (No)'} readOnly className="rounded-none font-mono text-sm bg-muted" /></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cost Calculation (Auto) */}
                {['man', 'machine', 'material', 'measurement'].includes(selectedNode.type) && (
                  <div className="space-y-4 p-4 bg-primary/5 border border-primary/20">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Settings className="w-4 h-4" /> 系统自动计算成本
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-mono text-muted-foreground">节点总成本:</span>
                      <span className="text-xl font-mono font-bold">¥{calculateNodeCost(selectedNode).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    {selectedNode.type === 'man' && <div className="text-xs text-muted-foreground font-mono">计算公式: 人数 × 工时 × 单价</div>}
                    {selectedNode.type === 'machine' && <div className="text-xs text-muted-foreground font-mono">计算公式: (折旧 × 时长) + (功率 × 时长 × 0.8能耗费)</div>}
                    {selectedNode.type === 'material' && <div className="text-xs text-muted-foreground font-mono">计算公式: 用量 × 单价 × (1 + 损耗率)</div>}
                    {selectedNode.type === 'measurement' && <div className="text-xs text-muted-foreground font-mono">直接取固定成本</div>}
                  </div>
                )}

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
