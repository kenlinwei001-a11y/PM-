import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Users, Settings, Plus, Search, Filter, Edit, Trash2, Zap, DollarSign, Activity,
  Briefcase, Gauge, Package, Factory, Cpu, Scale, Truck, Wrench, Beaker
} from 'lucide-react';
import {
  INDUSTRIAL_RESOURCES, BINDING_RULES, INDUSTRIAL_SKILLS,
  type IndustrialResource, type ResourceCategory
} from '../types';

// 4大类配置
const CATEGORY_CONFIG: { id: ResourceCategory | 'all'; name: string; icon: any; color: string; subTypes: string[] }[] = [
  {
    id: 'all',
    name: '全部资源',
    icon: Activity,
    color: 'text-primary',
    subTypes: []
  },
  {
    id: 'consumable',
    name: '消耗类',
    icon: Package,
    color: 'text-blue-600',
    subTypes: ['原材料', '耗材', '能源', '外包']
  },
  {
    id: 'occupiable',
    name: '占用类',
    icon: Factory,
    color: 'text-purple-600',
    subTypes: ['设备', '生产线', '工位', '空间']
  },
  {
    id: 'labor',
    name: '人工类',
    icon: Users,
    color: 'text-green-600',
    subTypes: ['技工', '管理人员', '外包人工']
  },
  {
    id: 'allocatable',
    name: '摊销类',
    icon: Scale,
    color: 'text-amber-600',
    subTypes: ['折旧', '制造费用', '研发费用', '质量成本']
  },
  {
    id: 'external',
    name: '外部成本',
    icon: Truck,
    color: 'text-rose-600',
    subTypes: ['物流', '安装调试', '差旅', '认证']
  }
];

// 子类型图标映射
const SUBTYPE_ICONS: Record<string, any> = {
  raw_material: Beaker,
  consumable: Package,
  energy: Zap,
  outsource: Briefcase,
  equipment: Cpu,
  production_line: Factory,
  workstation: Settings,
  space: Gauge,
  skilled_labor: Wrench,
  management: Users,
  outsourced_labor: Briefcase,
  depreciation: DollarSign,
  overhead: Scale,
  rnd_cost: Activity,
  quality_cost: Activity,
  logistics: Truck,
  installation: Settings,
  travel: Activity,
  certification: Briefcase
};

// 成本类型标签
const COST_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  fixed: { label: '固定', className: 'bg-blue-50 text-blue-600 border-blue-100' },
  variable: { label: '变动', className: 'bg-green-50 text-green-600 border-green-100' },
  hybrid: { label: '混合', className: 'bg-amber-50 text-amber-600 border-amber-100' }
};

// 子类型中文映射
const SUBTYPE_LABELS: Record<string, string> = {
  raw_material: '原材料', consumable: '耗材', energy: '能源', outsource: '外包',
  equipment: '设备', production_line: '生产线', workstation: '工位', space: '空间',
  skilled_labor: '技工', management: '管理人员', outsourced_labor: '外包人工',
  depreciation: '折旧', overhead: '制造费用', rnd_cost: '研发费用', quality_cost: '质量成本',
  logistics: '物流', installation: '安装调试', travel: '差旅', certification: '认证'
};

// 状态标签
const STATUS_LABELS: Record<string, { label: string; className: string; dotClass: string }> = {
  active: { label: '在用', className: 'bg-green-500/10 text-green-600 border-green-500/20', dotClass: 'bg-green-500' },
  maintenance: { label: '维护中', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dotClass: 'bg-amber-500' },
  inactive: { label: '停用', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20', dotClass: 'bg-gray-500' },
  locked: { label: '锁定', className: 'bg-red-500/10 text-red-600 border-red-500/20', dotClass: 'bg-red-500' }
};

export function ResourceCenter() {
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<IndustrialResource | null>(null);

  // 过滤资源
  const filteredResources = INDUSTRIAL_RESOURCES.filter(r => {
    const matchCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchSearch = !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  // 获取资源绑定的Skills
  const getResourceSkills = (resource: IndustrialResource) => {
    return INDUSTRIAL_SKILLS.filter(s => resource.bound_skill_ids.includes(s.id));
  };

  // 获取资源匹配的Binding Rules
  const getResourceRules = (resource: IndustrialResource) => {
    return BINDING_RULES.filter(r =>
      r.actions.some(a => a.type === 'bind_skill' && resource.bound_skill_ids.includes(a.target))
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-2xl">资源中心</h2>
          <p className="text-sm text-muted-foreground mt-1">4大类12子类工业级资源管理 (消耗/占用/人工/摊销)</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> 新增资源
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {CATEGORY_CONFIG.filter(c => c.id !== 'all').map(cat => {
          const count = INDUSTRIAL_RESOURCES.filter(r => r.category === cat.id).length;
          const Icon = cat.icon;
          return (
            <Card key={cat.id} className="rounded-none border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-none ${cat.color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{cat.name}</div>
                  <div className="text-xl font-mono font-semibold">{count}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Sidebar - 4大类筛选 */}
        <Card className="w-64 shrink-0 rounded-none border-border shadow-none flex flex-col bg-card/50">
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4" /> 资源分类 (4大类)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1 overflow-auto">
            {CATEGORY_CONFIG.map(cat => {
              const Icon = cat.icon;
              const count = cat.id === 'all'
                ? INDUSTRIAL_RESOURCES.length
                : INDUSTRIAL_RESOURCES.filter(r => r.category === cat.id).length;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as ResourceCategory | 'all')}
                  className={`w-full flex flex-col px-3 py-2.5 text-sm transition-colors border-l-2 ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="w-4 h-4" />
                      {cat.name}
                    </span>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5">{count}</span>
                  </div>
                  {cat.subTypes.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1 ml-6">
                      {cat.subTypes.join(' / ')}
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Resource List */}
        <Card className="flex-1 rounded-none border-border shadow-none flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border py-3 bg-muted/20 flex flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索资源 ID、名称或标签..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              共 <span className="font-mono text-foreground">{filteredResources.length}</span> 个资源
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-border">资源信息</th>
                  <th className="px-4 py-3 font-medium border-b border-border">分类</th>
                  <th className="px-4 py-3 font-medium border-b border-border">成本</th>
                  <th className="px-4 py-3 font-medium border-b border-border">绑定Skills</th>
                  <th className="px-4 py-3 font-medium border-b border-border">状态</th>
                  <th className="px-4 py-3 font-medium border-b border-border text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map(resource => {
                  const status = STATUS_LABELS[resource.status];
                  const skills = getResourceSkills(resource);
                  const Icon = SUBTYPE_ICONS[resource.sub_type] || Briefcase;

                  return (
                    <tr
                      key={resource.id}
                      className="border-b border-border hover:bg-muted/10 transition-colors group cursor-pointer"
                      onClick={() => setSelectedResource(resource)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-none bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium text-xs">{resource.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{resource.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                            {CATEGORY_CONFIG.find(c => c.id === resource.category)?.name}
                          </span>
                          <div className="text-[10px] text-muted-foreground">
                            {SUBTYPE_LABELS[resource.sub_type] || resource.sub_type}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-mono text-xs">¥{resource.unit_cost}/{resource.unit}</div>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border ${COST_TYPE_LABELS[resource.cost_type]?.className || 'bg-muted'}`}>
                            {COST_TYPE_LABELS[resource.cost_type]?.label || resource.cost_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 2).map(skill => (
                            <span key={skill.id} className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100">
                              {skill.code}
                            </span>
                          ))}
                          {skills.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{skills.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border ${status.className}`}>
                          <div className={`w-1 h-1 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Detail Panel - 显示选中的资源详情 */}
        {selectedResource && (
          <Card className="w-80 shrink-0 rounded-none border-border shadow-none flex flex-col bg-card/50">
            <CardHeader className="border-b border-border py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">资源详情</CardTitle>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 overflow-auto flex-1">
              {/* 基本信息 */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-muted-foreground">{selectedResource.id}</div>
                <div className="font-medium">{selectedResource.name}</div>
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                    {CATEGORY_CONFIG.find(c => c.id === selectedResource.category)?.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-muted border border-border">
                    {SUBTYPE_LABELS[selectedResource.sub_type]}
                  </span>
                </div>
              </div>

              {/* 成本信息 */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="text-xs font-mono uppercase text-muted-foreground">成本信息</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">单价</div>
                  <div className="font-mono text-right">¥{selectedResource.unit_cost}</div>
                  <div className="text-muted-foreground">单位</div>
                  <div className="font-mono text-right">{selectedResource.unit}</div>
                  <div className="text-muted-foreground">成本类型</div>
                  <div className="font-mono text-right">{COST_TYPE_LABELS[selectedResource.cost_type]?.label}</div>
                </div>
              </div>

              {/* 属性 */}
              {Object.keys(selectedResource.attributes).length > 0 && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="text-xs font-mono uppercase text-muted-foreground">属性</div>
                  <div className="space-y-1 text-xs">
                    {selectedResource.attributes.manufacturer && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">制造商</span>
                        <span>{selectedResource.attributes.manufacturer}</span>
                      </div>
                    )}
                    {selectedResource.attributes.model && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">型号</span>
                        <span>{selectedResource.attributes.model}</span>
                      </div>
                    )}
                    {selectedResource.attributes.power_kw && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">功率</span>
                        <span className="font-mono">{selectedResource.attributes.power_kw}kW</span>
                      </div>
                    )}
                    {selectedResource.attributes.skill_level && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">技能等级</span>
                        <span>{selectedResource.attributes.skill_level}</span>
                      </div>
                    )}
                    {selectedResource.attributes.efficiency && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">效率系数</span>
                        <span className="font-mono">{selectedResource.attributes.efficiency}x</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 绑定的Skills */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="text-xs font-mono uppercase text-muted-foreground">自动绑定 Skills</div>
                <div className="space-y-2">
                  {getResourceSkills(selectedResource).map(skill => (
                    <div key={skill.id} className="p-2 bg-muted/50 border border-border text-xs">
                      <div className="font-medium text-primary">{skill.code}</div>
                      <div className="text-muted-foreground mt-0.5">{skill.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{skill.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 标签 */}
              {selectedResource.tags.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="text-xs font-mono uppercase text-muted-foreground">标签</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedResource.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
