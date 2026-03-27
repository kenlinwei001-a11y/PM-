import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Play, Activity, AlertTriangle, CheckCircle2, ArrowRight, Zap, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { Project } from '../types';
import { toast } from 'sonner';

interface SimulationCenterProps {
  project: Project;
}

export function SimulationCenter({ project }: SimulationCenterProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSimulate = () => {
    setIsSimulating(true);
    setSimulationResult(null);
    
    // Mock simulation delay
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult({
        originalCost: 1250000,
        optimizedCost: 1180000,
        originalDuration: 45,
        optimizedDuration: 42,
        bottlenecks: [
          { task: 'WELD_001', issue: '焊工资源冲突', impact: '延期2天' },
          { task: 'CNC_002', issue: '材料(不锈钢)库存不足', impact: '成本增加5%' }
        ],
        actions: [
          { id: 'a1', desc: '将 WELD_001 拆分为并行任务', benefit: '缩短2天工期' },
          { id: 'a2', desc: '替换 CNC_002 材料供应商为备用供应商B', benefit: '降低3%材料成本' }
        ]
      });
      toast.success('推演完成');
    }, 1500);
  };

  const handleExecuteAction = (actionId: string) => {
    toast.success('已执行优化策略');
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">推演与决策中心</h2>
          <p className="text-muted-foreground text-sm mt-1">基于当前项目状态进行多维推演，并提供可执行的优化建议。</p>
        </div>
        <Button onClick={handleSimulate} disabled={isSimulating} size="lg" className="font-mono text-base rounded-none">
          {isSimulating ? <Activity className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2 fill-current" />}
          {isSimulating ? '正在推演中...' : '启动全局推演'}
        </Button>
      </div>

      {!simulationResult && !isSimulating && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border bg-muted/5">
          <Zap className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">点击上方按钮开始推演</p>
          <p className="text-sm mt-2">系统将分析 {project.name} 的所有节点、资源和规则</p>
        </div>
      )}

      {isSimulating && (
        <div className="flex-1 flex flex-col items-center justify-center text-primary border-2 border-dashed border-primary/20 bg-primary/5">
          <Activity className="w-12 h-12 mb-4 animate-bounce" />
          <p className="text-lg font-medium">AI 引擎正在进行蒙特卡洛模拟...</p>
          <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-full" />
          </div>
        </div>
      )}

      {simulationResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Explain Engine: Results */}
          <Card className="rounded-none border-border shadow-none flex flex-col">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" /> 解释引擎
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">预计总成本</div>
                  <div className="text-2xl font-mono font-bold flex items-center gap-2">
                    ¥{(simulationResult.optimizedCost / 10000).toFixed(1)}万
                    <span className="text-sm text-green-600 flex items-center bg-green-100 px-1.5 py-0.5 rounded">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {((simulationResult.originalCost - simulationResult.optimizedCost) / simulationResult.originalCost * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 line-through">原方案: ¥{(simulationResult.originalCost / 10000).toFixed(1)}万</div>
                </div>
                <div className="p-4 bg-muted/30 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">预计总工期</div>
                  <div className="text-2xl font-mono font-bold flex items-center gap-2">
                    {simulationResult.optimizedDuration} 天
                    <span className="text-sm text-green-600 flex items-center bg-green-100 px-1.5 py-0.5 rounded">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {simulationResult.originalDuration - simulationResult.optimizedDuration}天
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 line-through">原方案: {simulationResult.originalDuration} 天</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> 识别到的瓶颈
                </h4>
                <div className="space-y-2">
                  {simulationResult.bottlenecks.map((b: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-orange-500/5 border border-orange-500/20 text-sm">
                      <div className="font-mono font-bold text-orange-700">{b.task}</div>
                      <div>
                        <div className="text-foreground">{b.issue}</div>
                        <div className="text-orange-600 text-xs mt-0.5">影响: {b.impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Engine: Recommendations */}
          <Card className="rounded-none border-border shadow-none flex flex-col">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500" /> 决策执行引擎
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">基于推演结果，AI 建议执行以下优化策略：</p>
              
              <div className="space-y-4">
                {simulationResult.actions.map((action: any) => (
                  <div key={action.id} className="p-4 border border-border bg-card flex flex-col gap-3 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{action.desc}</div>
                      <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full whitespace-nowrap">
                        收益: {action.benefit}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleExecuteAction(action.id)} className="rounded-none text-xs font-mono">
                        一键执行 <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted/30 border border-border">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" /> 自动重排
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  执行上述策略后，系统将自动更新甘特图、重新分配资源并更新节点状态。
                </p>
                <Button variant="outline" className="w-full rounded-none text-sm font-mono border-dashed">
                  预览重排结果
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
