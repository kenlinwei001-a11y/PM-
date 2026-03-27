import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  Search, Plus, Settings, Play, Save, GitBranch,
  Calculator, Clock, Wrench, Factory, Package,
  Scale, Brain, TrendingUp, ChevronRight, CheckCircle2,
  History, Users, Code, Layers, TestTube, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

// ============ Skill 类型定义 ============

export type SkillType =
  | 'cost' | 'duration' | 'process' | 'resource'
  | 'material' | 'compliance' | 'simulation' | 'decision';

export interface SkillInput {
  id: string;
  name: string;
  type: 'number' | 'string' | 'enum' | 'boolean' | 'object';
  source: 'node' | 'resource' | 'material' | 'system' | 'user';
  defaultValue?: any;
  required: boolean;
}

export interface SkillOutput {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'object';
  formula?: string;
}

export interface SkillLogic {
  id: string;
  type: 'formula' | 'subskill' | 'condition';
  name: string;
  content: string;
  subSkills?: string[];
}

export interface SkillVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'published' | 'deprecated';
  changes: string;
}

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  description: string;
  version: string;
  status: 'draft' | 'published';
  scope: {
    nodeTypes: string[];
    condition?: string;
  };
  inputs: SkillInput[];
  logic: SkillLogic[];
  outputs: SkillOutput[];
  usageCount: number;
  lastModified: string;
  versions: SkillVersion[];
}

// ============ Skill 分类配置 ============

const SKILL_CATEGORIES = [
  { id: 'cost', name: '成本类', icon: Calculator, color: '#22c55e', desc: '成本计算与分摊' },
  { id: 'duration', name: '周期类', icon: Clock, color: '#3b82f6', desc: '工期计算与优化' },
  { id: 'process', name: '工艺类', icon: Wrench, color: '#f97316', desc: '工艺校验与规划' },
  { id: 'resource', name: '资源类', icon: Factory, color: '#8b5cf6', desc: '资源配置与调度' },
  { id: 'material', name: '物料类', icon: Package, color: '#a855f7', desc: '物料计算与管理' },
  { id: 'compliance', name: '合规类', icon: Scale, color: '#ef4444', desc: '合规校验与认证' },
  { id: 'simulation', name: '推演类', icon: Brain, color: '#06b6d4', desc: '推演模拟与预测' },
  { id: 'decision', name: '决策类', icon: TrendingUp, color: '#eab308', desc: '决策支持与优化' },
] as const;

// ============ 示例 Skill 数据 ============

const MOCK_SKILLS: Skill[] = [
  {
    id: 'WELD_COST',
    name: '焊接成本计算',
    type: 'cost',
    description: '计算焊接工序的总成本，包括人工、材料、能耗、设备折旧',
    version: 'v3.2',
    status: 'published',
    scope: {
      nodeTypes: ['铆焊组对', '返工焊接'],
    },
    inputs: [
      { id: 'duration', name: '工时', type: 'number', source: 'node', required: true },
      { id: 'labor_level', name: '人员等级', type: 'enum', source: 'resource', required: true },
      { id: 'material_qty', name: '材料用量', type: 'number', source: 'material', required: true },
      { id: 'machine_power', name: '设备功率', type: 'number', source: 'resource', required: true },
      { id: 'electricity_price', name: '电价', type: 'number', source: 'system', defaultValue: 0.8, required: true },
    ],
    logic: [
      { id: 'labor_cost', type: 'formula', name: '人工成本', content: 'labor_cost = duration * labor_rate' },
      { id: 'material_cost', type: 'formula', name: '材料成本', content: 'material_cost = qty * price * (1 + loss_rate)' },
      { id: 'energy_cost', type: 'formula', name: '能耗成本', content: 'energy_cost = power * duration * electricity_price' },
      { id: 'depreciation', type: 'formula', name: '设备折旧', content: 'depreciation = equipment_cost / lifecycle_hours * duration' },
    ],
    outputs: [
      { id: 'total_cost', name: '总成本', type: 'number', formula: 'labor_cost + material_cost + energy_cost + depreciation' },
      { id: 'labor_cost', name: '人工成本', type: 'number' },
      { id: 'material_cost', name: '材料成本', type: 'number' },
      { id: 'energy_cost', name: '能耗成本', type: 'number' },
    ],
    usageCount: 128,
    lastModified: '2026-03-20',
    versions: [
      { version: 'v3.2', createdAt: '2026-03-20', createdBy: '工艺工程师', status: 'published', changes: '优化折旧计算逻辑' },
      { version: 'v3.1', createdAt: '2026-02-15', createdBy: '工艺工程师', status: 'deprecated', changes: '新增能耗分项' },
      { version: 'v3.0', createdAt: '2026-01-10', createdBy: '工艺工程师', status: 'deprecated', changes: '初始版本' },
    ],
  },
  {
    id: 'WELD_EFFICIENCY',
    name: '焊接效率计算',
    type: 'duration',
    description: '根据焊工等级计算实际工时',
    version: 'v2.1',
    status: 'published',
    scope: {
      nodeTypes: ['铆焊组对'],
    },
    inputs: [
      { id: 'base_duration', name: '标准工时', type: 'number', source: 'node', required: true },
      { id: 'welder_level', name: '焊工等级', type: 'enum', source: 'resource', required: true },
    ],
    logic: [
      { id: 'efficiency', type: 'condition', name: '效率系数', content: 'IF welder_level == "高级" THEN 1.3 ELSE IF welder_level == "中级" THEN 1.0 ELSE 0.8' },
      { id: 'actual_duration', type: 'formula', name: '实际工时', content: 'actual = base_duration / efficiency_factor' },
    ],
    outputs: [
      { id: 'actual_duration', name: '实际工时', type: 'number' },
      { id: 'efficiency_factor', name: '效率系数', type: 'number' },
    ],
    usageCount: 95,
    lastModified: '2026-03-15',
    versions: [
      { version: 'v2.1', createdAt: '2026-03-15', createdBy: '生产经理', status: 'published', changes: '优化等级判定' },
      { version: 'v2.0', createdAt: '2026-01-20', createdBy: '生产经理', status: 'deprecated', changes: '初始版本' },
    ],
  },
  {
    id: 'PRESSURE_TEST',
    name: '压力容器校验',
    type: 'compliance',
    description: '压力容器试压合规性检查',
    version: 'v1.5',
    status: 'published',
    scope: {
      nodeTypes: ['总装试压'],
      condition: 'IF product_type == "压力容器"',
    },
    inputs: [
      { id: 'design_pressure', name: '设计压力', type: 'number', source: 'node', required: true },
      { id: 'test_pressure', name: '试压压力', type: 'number', source: 'user', required: true },
    ],
    logic: [
      { id: 'pressure_check', type: 'condition', name: '压力校验', content: 'ASSERT test_pressure >= 1.5 * design_pressure' },
      { id: 'duration_check', type: 'condition', name: '保压时间校验', content: 'ASSERT hold_duration >= 30_minutes' },
    ],
    outputs: [
      { id: 'is_compliant', name: '是否合规', type: 'boolean' },
      { id: 'required_pressure', name: '要求压力', type: 'number' },
    ],
    usageCount: 67,
    lastModified: '2026-03-10',
    versions: [
      { version: 'v1.5', createdAt: '2026-03-10', createdBy: '质量工程师', status: 'published', changes: '更新压力系数' },
      { version: 'v1.0', createdAt: '2026-01-05', createdBy: '质量工程师', status: 'deprecated', changes: '初始版本' },
    ],
  },
  {
    id: 'CUSTOM_MATERIAL_ALLOC',
    name: '定制材料成本分摊',
    type: 'cost',
    description: '定制化特殊材料成本分摊计算',
    version: 'v1.0',
    status: 'draft',
    scope: {
      nodeTypes: ['定制化物料采购'],
    },
    inputs: [
      { id: 'base_price', name: '基础价格', type: 'number', source: 'material', required: true },
      { id: 'quantity', name: '数量', type: 'number', source: 'node', required: true },
      { id: 'processing_fee', name: '加工费', type: 'number', source: 'system', required: true },
    ],
    logic: [
      { id: 'allocation', type: 'formula', name: '成本分摊', content: 'material_cost = base_price * quantity * 1.5 + processing_fee' },
    ],
    outputs: [
      { id: 'material_cost', name: '材料成本', type: 'number' },
    ],
    usageCount: 12,
    lastModified: '2026-03-25',
    versions: [
      { version: 'v1.0', createdAt: '2026-03-25', createdBy: '财务专员', status: 'draft', changes: '创建中' },
    ],
  },
  {
    id: 'PROFIT_CALC',
    name: '利润计算',
    type: 'decision',
    description: '项目利润计算与决策支持',
    version: 'v2.0',
    status: 'published',
    scope: {
      nodeTypes: ['回款结算'],
    },
    inputs: [
      { id: 'revenue', name: '收入', type: 'number', source: 'system', required: true },
      { id: 'total_cost', name: '总成本', type: 'number', source: 'node', required: true },
    ],
    logic: [
      { id: 'profit', type: 'formula', name: '利润计算', content: 'profit = revenue - total_cost' },
      { id: 'margin', type: 'formula', name: '利润率', content: 'margin = profit / revenue * 100' },
    ],
    outputs: [
      { id: 'profit', name: '利润', type: 'number' },
      { id: 'margin', name: '利润率', type: 'number' },
    ],
    usageCount: 156,
    lastModified: '2026-03-18',
    versions: [
      { version: 'v2.0', createdAt: '2026-03-18', createdBy: '财务经理', status: 'published', changes: '新增利润率输出' },
      { version: 'v1.0', createdAt: '2026-01-01', createdBy: '财务经理', status: 'deprecated', changes: '初始版本' },
    ],
  },
  {
    id: 'SCHEDULE_CONSTRAINT',
    name: '排产约束检查',
    type: 'simulation',
    description: '工序间排产约束条件校验',
    version: 'v1.2',
    status: 'published',
    scope: {
      nodeTypes: ['铆焊组对', '总装试压'],
    },
    inputs: [
      { id: 'predecessor_end', name: '前置工序结束时间', type: 'string', source: 'node', required: true },
      { id: 'current_start', name: '当前工序开始时间', type: 'string', source: 'node', required: true },
    ],
    logic: [
      { id: 'constraint', type: 'condition', name: '顺序约束', content: 'ASSERT start(当前) >= end(前置)' },
    ],
    outputs: [
      { id: 'is_valid', name: '是否有效', type: 'boolean' },
      { id: 'wait_time', name: '等待时间', type: 'number' },
    ],
    usageCount: 89,
    lastModified: '2026-03-12',
    versions: [
      { version: 'v1.2', createdAt: '2026-03-12', createdBy: '计划员', status: 'published', changes: '优化时间计算' },
      { version: 'v1.0', createdAt: '2026-02-01', createdBy: '计划员', status: 'deprecated', changes: '初始版本' },
    ],
  },
];

// ============ 组件实现 ============

export function SkillCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [testInputs, setTestInputs] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);

  // 筛选 Skills
  const filteredSkills = useMemo(() => {
    return MOCK_SKILLS.filter(skill => {
      const matchesCategory = selectedCategory === 'all' || skill.type === selectedCategory;
      const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           skill.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // 统计信息
  const stats = useMemo(() => {
    const total = MOCK_SKILLS.length;
    const published = MOCK_SKILLS.filter(s => s.status === 'published').length;
    const draft = MOCK_SKILLS.filter(s => s.status === 'draft').length;
    const totalUsage = MOCK_SKILLS.reduce((sum, s) => sum + s.usageCount, 0);
    return { total, published, draft, totalUsage };
  }, []);

  // 运行 Skill 测试
  const handleTestSkill = () => {
    if (!selectedSkill) return;

    // 模拟计算
    const result: Record<string, any> = {};
    selectedSkill.outputs.forEach(output => {
      if (output.id === 'total_cost') {
        result[output.id] = Math.round(14420 + Math.random() * 1000);
      } else if (output.id === 'actual_duration') {
        result[output.id] = Math.round(10 / 1.3 * 10) / 10;
      } else if (output.id === 'profit') {
        result[output.id] = Math.round(500000 - 2452300 * 0.8);
      } else if (output.id === 'margin') {
        result[output.id] = Math.round(15.2 * 10) / 10;
      } else if (output.id === 'is_compliant') {
        result[output.id] = true;
      } else {
        result[output.id] = Math.round(Math.random() * 10000);
      }
    });

    setTestResult(result);
    toast.success('Skill 测试完成');
  };

  // 获取类型配置
  const getTypeConfig = (type: SkillType) => {
    return SKILL_CATEGORIES.find(c => c.id === type) || SKILL_CATEGORIES[0];
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 顶部标题栏 */}
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <div>
          <h2 className="font-serif text-xl font-medium">Skill Center（规则与能力中心）</h2>
          <p className="text-sm text-muted-foreground mt-1">
            定义可执行业务能力单元（Skill），支持成本、周期、工艺、推演等多维度计算
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">已发布: {stats.published}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">草稿: {stats.draft}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">总调用: {stats.totalUsage}</span>
          </div>
        </div>
      </div>

      {/* 搜索和工具栏 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索 Skill 名称、描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-none"
          />
        </div>
        <Button className="rounded-none">
          <Plus className="w-4 h-4 mr-2" />
          新建 Skill
        </Button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：分类树 */}
        <Card className="w-56 flex flex-col rounded-none border-border shadow-none">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">Skill 分类</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors border-l-2 ${
                  selectedCategory === 'all'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span>全部</span>
                <span className="text-xs text-muted-foreground">{MOCK_SKILLS.length}</span>
              </button>
              {SKILL_CATEGORIES.map(cat => {
                const count = MOCK_SKILLS.filter(s => s.type === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors border-l-2 ${
                      selectedCategory === cat.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                    <span className="flex-1 text-left">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 中间：Skill 列表 */}
        <Card className="w-80 flex flex-col rounded-none border-border shadow-none">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">
              Skill 列表 ({filteredSkills.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-border">
              {filteredSkills.map(skill => {
                const typeConfig = getTypeConfig(skill.type);
                return (
                  <div
                    key={skill.id}
                    onClick={() => { setSelectedSkill(skill); setIsEditing(false); setTestResult(null); }}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedSkill?.id === skill.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm">{skill.name}</h3>
                      {skill.status === 'published' ? (
                        <Badge variant="default" className="text-[10px]">已发布</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">草稿</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <typeConfig.icon className="w-3 h-3" style={{ color: typeConfig.color }} />
                      <span className="text-xs text-muted-foreground">{typeConfig.name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{skill.version}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {skill.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>使用 {skill.usageCount} 次</span>
                      <span>修改 {skill.lastModified}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 右侧：Skill 编辑器 */}
        <Card className="flex-1 flex flex-col rounded-none border-border shadow-none overflow-hidden">
          {selectedSkill ? (
            <>
              <CardHeader className="p-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-base font-serif">{selectedSkill.name}</CardTitle>
                    <Badge variant={selectedSkill.status === 'published' ? 'default' : 'secondary'}>
                      {selectedSkill.status === 'published' ? '已发布' : '草稿'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-none">
                      <History className="w-3 h-3 mr-1" />
                      版本
                    </Button>
                    <Button size="sm" className="h-8 text-xs rounded-none" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? '取消编辑' : '编辑'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
                <Tabs defaultValue="definition" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/10 p-0 h-10">
                    <TabsTrigger value="definition" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary px-4">
                      <Settings className="w-3 h-3 mr-1" />
                      定义
                    </TabsTrigger>
                    <TabsTrigger value="logic" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary px-4">
                      <Code className="w-3 h-3 mr-1" />
                      逻辑
                    </TabsTrigger>
                    <TabsTrigger value="scope" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary px-4">
                      <Layers className="w-3 h-3 mr-1" />
                      范围
                    </TabsTrigger>
                    <TabsTrigger value="test" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary px-4">
                      <TestTube className="w-3 h-3 mr-1" />
                      测试
                    </TabsTrigger>
                  </TabsList>

                  {/* 定义 Tab */}
                  <TabsContent value="definition" className="flex-1 p-6 space-y-6 m-0">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground">Skill ID</Label>
                        <Input value={selectedSkill.id} readOnly className="rounded-none font-mono text-sm bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground">类型</Label>
                        <div className="flex items-center gap-2 p-2 border border-border bg-muted text-sm">
                          {(() => {
                            const config = getTypeConfig(selectedSkill.type);
                            return <><config.icon className="w-4 h-4" style={{ color: config.color }} /> {config.name}</>;
                          })()}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground">版本</Label>
                        <Input value={selectedSkill.version} readOnly className="rounded-none text-sm bg-muted" />
                      </div>
                    </div>

                    {/* 输入定义 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold border-l-2 border-primary pl-2">输入参数 (Inputs)</h3>
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-none">
                          <Plus className="w-3 h-3 mr-1" />
                          添加输入
                        </Button>
                      </div>
                      <div className="border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-xs font-mono">
                            <tr>
                              <th className="px-3 py-2 text-left">名称</th>
                              <th className="px-3 py-2 text-left">类型</th>
                              <th className="px-3 py-2 text-left">来源</th>
                              <th className="px-3 py-2 text-left">必填</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedSkill.inputs.map(input => (
                              <tr key={input.id} className="hover:bg-muted/30">
                                <td className="px-3 py-2 font-medium">{input.name}</td>
                                <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{input.type}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {input.source === 'node' && '节点'}
                                    {input.source === 'resource' && '资源'}
                                    {input.source === 'material' && '物料'}
                                    {input.source === 'system' && '系统'}
                                    {input.source === 'user' && '用户'}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">
                                  {input.required ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 输出定义 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold border-l-2 border-primary pl-2">输出结果 (Outputs)</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedSkill.outputs.map(output => (
                          <div key={output.id} className="p-3 bg-muted/30 border border-border flex items-center gap-3">
                            <ArrowRight className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium text-sm">{output.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{output.type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* 逻辑 Tab */}
                  <TabsContent value="logic" className="flex-1 p-6 space-y-6 m-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold border-l-2 border-primary pl-2">计算逻辑</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-none">
                            <Calculator className="w-3 h-3 mr-1" />
                            公式
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-none">
                            <GitBranch className="w-3 h-3 mr-1" />
                            条件
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-none">
                            <Layers className="w-3 h-3 mr-1" />
                            子 Skill
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {selectedSkill.logic.map((logic, index) => (
                          <div key={logic.id} className="p-4 border border-border bg-muted/10">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-muted-foreground">步骤 {index + 1}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {logic.type === 'formula' && '公式'}
                                {logic.type === 'condition' && '条件'}
                                {logic.type === 'subskill' && '子 Skill'}
                              </Badge>
                              <span className="font-medium text-sm">{logic.name}</span>
                            </div>
                            <code className="block p-2 bg-[#1e1e1e] text-[#d4d4d4] text-xs font-mono rounded">
                              {logic.content}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DSL 编辑器 */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold border-l-2 border-primary pl-2">DSL 代码（高级）</h3>
                      <div className="p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs rounded-none h-40 overflow-auto">
                        <pre>{`SKILL ${selectedSkill.id} {
  TYPE: ${selectedSkill.type}

  INPUTS:
${selectedSkill.inputs.map(i => `    ${i.name}: ${i.type} FROM ${i.source}`).join('\n')}

  LOGIC:
${selectedSkill.logic.map(l => `    ${l.name}: ${l.content}`).join('\n')}

  OUTPUTS:
${selectedSkill.outputs.map(o => `    ${o.name}: ${o.type}`).join('\n')}
}`}</pre>
                      </div>
                    </div>
                  </TabsContent>

                  {/* 范围 Tab */}
                  <TabsContent value="scope" className="flex-1 p-6 space-y-6 m-0">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold border-l-2 border-primary pl-2">适用节点</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkill.scope.nodeTypes.map(nodeType => (
                          <Badge key={nodeType} variant="secondary" className="px-3 py-1">
                            {nodeType}
                          </Badge>
                        ))}
                      </div>
                      {selectedSkill.scope.condition && (
                        <div className="p-3 bg-muted/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">适用条件</div>
                          <code className="text-xs font-mono">{selectedSkill.scope.condition}</code>
                        </div>
                      )}
                    </div>

                    {/* 版本历史 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold border-l-2 border-primary pl-2">版本历史</h3>
                      <div className="space-y-2">
                        {selectedSkill.versions.map((version, index) => (
                          <div key={version.version} className={`p-3 border ${index === 0 ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">{version.version}</span>
                                {index === 0 && <Badge className="text-[10px]">当前</Badge>}
                                <Badge variant={version.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                                  {version.status === 'published' ? '已发布' : version.status === 'draft' ? '草稿' : '已废弃'}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{version.createdAt}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {version.createdBy} · {version.changes}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* 测试 Tab */}
                  <TabsContent value="test" className="flex-1 p-6 space-y-6 m-0">
                    <div className="grid grid-cols-2 gap-6">
                      {/* 测试输入 */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold border-l-2 border-primary pl-2">测试输入</h3>
                        <div className="space-y-3">
                          {selectedSkill.inputs.map(input => (
                            <div key={input.id} className="space-y-1">
                              <Label className="text-xs">{input.name}</Label>
                              <Input
                                type={input.type === 'number' ? 'number' : 'text'}
                                placeholder={input.defaultValue?.toString() || `输入${input.name}`}
                                value={testInputs[input.id] || ''}
                                onChange={(e) => setTestInputs({ ...testInputs, [input.id]: e.target.value })}
                                className="rounded-none text-sm"
                              />
                              <div className="text-[10px] text-muted-foreground">
                                来源: {input.source} {input.required && '· 必填'}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button onClick={handleTestSkill} className="w-full rounded-none">
                          <Play className="w-4 h-4 mr-2" />
                          运行测试
                        </Button>
                      </div>

                      {/* 测试结果 */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold border-l-2 border-primary pl-2">测试结果</h3>
                        {testResult ? (
                          <div className="space-y-3">
                            {selectedSkill.outputs.map(output => (
                              <div key={output.id} className="p-3 bg-green-500/10 border border-green-500/30">
                                <div className="text-xs text-muted-foreground mb-1">{output.name}</div>
                                <div className="text-lg font-mono font-bold text-green-700">
                                  {typeof testResult[output.id] === 'boolean'
                                    ? (testResult[output.id] ? '✓ 通过' : '✗ 不通过')
                                    : testResult[output.id]?.toLocaleString()
                                  }
                                </div>
                              </div>
                            ))}
                            <div className="p-3 bg-muted/30 border border-border text-xs text-muted-foreground">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-3 h-3" />
                                <span>执行时间: 12ms</span>
                              </div>
                              <div>测试时间: {new Date().toLocaleString()}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border">
                            <TestTube className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-sm">点击运行测试查看结果</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Layers className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">选择一个 Skill 查看详情</p>
              <p className="text-sm mt-2">或点击「新建 Skill」创建新的能力单元</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SkillCenter;
