import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Settings, Plus, Search, Filter, Edit, Trash2, Zap, DollarSign, Activity } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: 'equipment' | 'personnel';
  status: 'active' | 'maintenance' | 'inactive';
  attributes: {
    power?: string;
    depreciation?: string;
    capacity?: string;
    skillLevel?: string;
    efficiency?: string;
  };
}

const mockResources: Resource[] = [
  {
    id: 'R_WELD_01',
    name: '自动焊接机器人 A型',
    type: 'equipment',
    status: 'active',
    attributes: {
      power: '25kW',
      depreciation: '¥50/h',
      capacity: '10m/h'
    }
  },
  {
    id: 'R_CNC_01',
    name: '五轴联动加工中心',
    type: 'equipment',
    status: 'maintenance',
    attributes: {
      power: '45kW',
      depreciation: '¥120/h',
      capacity: '高精度'
    }
  },
  {
    id: 'P_WELD_01',
    name: '张三 (高级焊工)',
    type: 'personnel',
    status: 'active',
    attributes: {
      skillLevel: '三级',
      efficiency: '1.2x'
    }
  }
];

export function ResourceCenter() {
  const [resources] = useState<Resource[]>(mockResources);
  const [activeTab, setActiveTab] = useState<'all' | 'equipment' | 'personnel'>('all');

  const filteredResources = resources.filter(r => activeTab === 'all' || r.type === activeTab);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-2xl">资源中心</h2>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> 新增设备
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors border border-border">
            <Plus className="w-4 h-4" /> 新增人员
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Sidebar Filter */}
        <Card className="w-64 shrink-0 rounded-none border-border shadow-none flex flex-col bg-card/50">
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4" /> 资源分类
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${activeTab === 'all' ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted/50 border-l-2 border-transparent'}`}
            >
              <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> 全部资源</span>
              <span className="font-mono text-xs">{resources.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('equipment')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${activeTab === 'equipment' ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted/50 border-l-2 border-transparent'}`}
            >
              <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> 设备</span>
              <span className="font-mono text-xs">{resources.filter(r => r.type === 'equipment').length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('personnel')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${activeTab === 'personnel' ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted/50 border-l-2 border-transparent'}`}
            >
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 人员</span>
              <span className="font-mono text-xs">{resources.filter(r => r.type === 'personnel').length}</span>
            </button>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="flex-1 rounded-none border-border shadow-none flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border py-4 bg-muted/20 flex flex-row items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="搜索资源 ID 或名称..." 
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium border-b border-border">ID</th>
                  <th className="px-6 py-4 font-medium border-b border-border">名称</th>
                  <th className="px-6 py-4 font-medium border-b border-border">类型</th>
                  <th className="px-6 py-4 font-medium border-b border-border">状态</th>
                  <th className="px-6 py-4 font-medium border-b border-border">核心属性</th>
                  <th className="px-6 py-4 font-medium border-b border-border text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-b border-border hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{resource.id}</td>
                    <td className="px-6 py-4 font-medium">{resource.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-muted border border-border">
                        {resource.type === 'equipment' ? <Settings className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {resource.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border ${
                        resource.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                        resource.status === 'maintenance' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          resource.status === 'active' ? 'bg-green-500' :
                          resource.status === 'maintenance' ? 'bg-amber-500' :
                          'bg-muted-foreground'
                        }`}></div>
                        {resource.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {resource.type === 'equipment' ? (
                          <>
                            {resource.attributes.power && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 border border-border/50">
                                <Zap className="w-3 h-3" /> {resource.attributes.power}
                              </span>
                            )}
                            {resource.attributes.depreciation && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 border border-border/50">
                                <DollarSign className="w-3 h-3" /> {resource.attributes.depreciation}
                              </span>
                            )}
                            {resource.attributes.capacity && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 border border-border/50">
                                <Activity className="w-3 h-3" /> {resource.attributes.capacity}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {resource.attributes.skillLevel && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 border border-border/50">
                                等级: {resource.attributes.skillLevel}
                              </span>
                            )}
                            {resource.attributes.efficiency && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 border border-border/50">
                                效率: {resource.attributes.efficiency}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
