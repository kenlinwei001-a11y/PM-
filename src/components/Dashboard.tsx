import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Project } from "../types";
import { Activity, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

export function Dashboard({ project }: { project: Project }) {
  const totalCost = project.nodes.reduce((acc, node) => acc + node.plannedCost.total, 0);
  
  // Calculate project duration based on CPM (max EF)
  const projectDuration = project.nodes.length > 0 ? Math.max(...project.nodes.map(n => n.ef || 0)) : 0;
  
  const inProgressNodes = project.nodes.filter(n => n.status === 'running').length;
  const criticalNodesCount = project.nodes.filter(n => n.isCritical).length;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="计划总成本" 
          value={`¥${totalCost.toLocaleString()}`} 
          icon={<DollarSign className="w-4 h-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="关键路径工期" 
          value={`${projectDuration} 天`} 
          icon={<Clock className="w-4 h-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="进行中节点" 
          value={inProgressNodes.toString()} 
          icon={<Activity className="w-4 h-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="关键节点数" 
          value={criticalNodesCount.toString()} 
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />} 
        />
      </div>

      <Card className="rounded-none border-border shadow-none">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-serif text-lg font-medium">最近项目节点</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px] gap-4 p-4 border-b border-border bg-muted/50 font-medium text-xs uppercase tracking-wider font-serif italic opacity-70">
            <div>ID</div>
            <div>名称</div>
            <div>状态</div>
            <div>关键路径</div>
            <div className="text-right">成本</div>
          </div>
          {project.nodes.length > 0 ? project.nodes.slice(0, 5).map(node => (
            <div key={node.id} className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px] gap-4 p-4 border-b border-border hover:bg-muted/10 transition-colors items-center">
              <div className="font-mono text-xs text-muted-foreground">{node.id}</div>
              <div className="font-sans text-sm font-medium">{node.name}</div>
              <div>
                <span className={`text-[10px] px-2 py-1 uppercase tracking-wider font-mono border ${
                  node.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                  node.status === 'running' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                  'bg-muted text-muted-foreground border-border'
                }`}>
                  {node.status === 'completed' ? '已完成' : node.status === 'running' ? '进行中' : '未开始'}
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
          )) : (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">暂无节点数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: ReactNode }) {
  return (
    <Card className="rounded-none border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-serif">{value}</div>
      </CardContent>
    </Card>
  );
}
