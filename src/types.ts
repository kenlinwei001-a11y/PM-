// 新的数据结构定义 - 10个主工序节点
// 需求对接 → 定制化设计 → 非标工艺规划 → 定制化物料采购 → 铆焊组对 → 定制化机加工序 → 总装试压 → 定制化检测认证 → 现场安装调试 → 回款结算

export type NodeType = 'project' | 'phase' | 'process' | 'task' | 'material' | 'resource';

// ============ 4大类12子类资源模型 (工业级资源管理) ============

/** 资源大类 */
export type ResourceCategory =
  | 'consumable'      // 1. 消耗类 (原材料、耗材、能源、外包)
  | 'occupiable'      // 2. 占用类 (设备、生产线、工位、空间)
  | 'labor'           // 3. 人工类 (技工、管理人员、外包人工)
  | 'allocatable'     // 4. 摊销类 (折旧、制造费用、研发费用、质量成本)
  | 'external';       // 5. 外部成本 (物流、安装调试、差旅、认证)

/** 资源子类型 - 12子类 */
export type ResourceSubType =
  // 1. 消耗类 (1.1-1.4)
  | 'raw_material' | 'consumable' | 'energy' | 'outsource'
  // 2. 占用类 (2.1-2.4)
  | 'equipment' | 'production_line' | 'workstation' | 'space'
  // 3. 人工类 (3.1-3.3)
  | 'skilled_labor' | 'management' | 'outsourced_labor'
  // 4. 摊销类 (4.1-4.4)
  | 'depreciation' | 'overhead' | 'rnd_cost' | 'quality_cost'
  // 5. 外部成本 (5.1-5.4)
  | 'logistics' | 'installation' | 'travel' | 'certification';

/** 成本类型 */
export type CostType = 'fixed' | 'variable' | 'hybrid';

/** 资源状态 */
export type ResourceStatus = 'active' | 'maintenance' | 'inactive' | 'locked';

/** 工业级资源定义 */
export interface IndustrialResource {
  id: string;
  name: string;
  category: ResourceCategory;
  sub_type: ResourceSubType;
  // 资源分类标签 (用于Binding Rule匹配)
  tags: string[];
  // 基础属性
  attributes: ResourceAttributes;
  // 成本相关
  cost_type: CostType;
  unit: string;
  unit_cost: number;
  currency: string;
  // 时间维度
  time_unit?: 'hour' | 'day' | 'week' | 'month' | 'piece';
  // 状态
  status: ResourceStatus;
  department?: string;
  location?: string;
  // 关联的Binding Rule IDs
  bound_skill_ids: string[];
  // 元数据
  metadata: {
    created_at: string;
    updated_at: string;
    version: string;
    source: 'system' | 'user' | 'import';
  };
}

/** 资源属性 (根据类型不同而变化) */
export interface ResourceAttributes {
  // 通用属性
  description?: string;
  manufacturer?: string;
  model?: string;
  // 消耗类属性
  loss_rate?: number;
  min_order_quantity?: number;
  supplier?: string;
  // 占用类属性
  capacity?: string;
  power_kw?: number;
  max_load?: number;
  utilization_rate?: number;
  maintenance_cycle?: number;
  // 人工类属性
  skill_level?: '初级' | '中级' | '高级' | '专家';
  efficiency?: number;
  hourly_rate?: number;
  certification?: string[];
  // 摊销类属性
  depreciation_period?: number;
  salvage_value?: number;
  allocation_base?: string;
  // 外部成本属性
  service_provider?: string;
  contract_terms?: string;
}

// ============ Binding Rule (绑定规则) ============

/** 规则条件 */
export interface BindingCondition {
  field: string;           // 字段名: resource.category, resource.sub_type, resource.tags, task.node_type, project.type 等
  operator: 'equals' | 'contains' | 'in' | 'regex' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
}

/** Binding Rule 定义 */
export interface BindingRule {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  priority: number;        // 优先级，数字越小优先级越高
  // 匹配条件 (AND关系)
  conditions: BindingCondition[];
  // 绑定操作
  actions: BindingAction[];
  // 元数据
  metadata: {
    created_by: string;
    created_at: string;
    updated_at: string;
    category: string;
  };
}

/** 绑定操作 */
export interface BindingAction {
  type: 'bind_skill' | 'set_attribute' | 'add_tag';
  target: string;          // Skill ID 或属性名
  params?: Record<string, any>;  // 额外参数
}

/** 资源与Skill的绑定关系 */
export interface ResourceSkillBinding {
  id: string;
  resource_id: string;
  skill_id: string;
  rule_id: string;         // 由哪个Rule创建的绑定
  project_id?: string;     // 可选：特定项目
  node_id?: string;        // 可选：特定节点
  // 绑定参数 (覆盖Skill默认输入)
  input_overrides: Record<string, any>;
  // 状态
  status: 'active' | 'inactive' | 'error';
  // 计算结果缓存
  last_calculation?: {
    timestamp: string;
    result: number;
    inputs: Record<string, any>;
  };
}

// ============ Skill 扩展定义 ============

/** Skill 输入参数定义 */
export interface SkillInput {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'resource_ref' | 'skill_ref';
  required: boolean;
  default_value?: any;
  // 数据源
  source: 'node' | 'resource' | 'material' | 'system' | 'user' | 'skill_output';
  // 如果是resource_ref，指定资源筛选条件
  resource_filter?: {
    category?: ResourceCategory;
    sub_type?: ResourceSubType;
    tags?: string[];
  };
}

/** Skill 输出定义 */
export interface SkillOutput {
  name: string;
  type: 'cost' | 'time' | 'quantity' | 'quality' | 'efficiency' | 'boolean';
  unit?: string;
  description: string;
}

/** Skill 逻辑类型 */
export type SkillLogicType = 'formula' | 'subskill' | 'condition' | 'api' | 'script';

/** Skill 定义 (增强版) */
export interface Skill {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  version: string;
  // 输入输出定义
  inputs: SkillInput[];
  outputs: SkillOutput[];
  // 执行逻辑
  logic: {
    type: SkillLogicType;
    // 公式类型: 数学表达式字符串
    // 子Skill类型: 子Skill执行链
    // 条件类型: 条件分支
    // API类型: 外部服务调用配置
    // 脚本类型: JavaScript/Python代码
    content: any;
  };
  // 关联的Binding Rules
  binding_rules: string[];
  // 元数据
  metadata: {
    author: string;
    created_at: string;
    updated_at: string;
    tags: string[];
  };
}

/** Skill 执行结果 */
export interface SkillExecutionResult {
  skill_id: string;
  binding_id: string;
  status: 'success' | 'error' | 'partial';
  outputs: Record<string, any>;
  cost_breakdown: CostTraceabilityItem[];
  execution_time: number;
  error_message?: string;
}

/** 成本可追溯项 */
export interface CostTraceabilityItem {
  cost_type: string;
  amount: number;
  unit: string;
  // 追溯链
  trace: {
    resource_id: string;
    resource_name: string;
    binding_rule_id: string;
    binding_rule_name: string;
    skill_id: string;
    skill_name: string;
    skill_code: string;
  };
  // 计算详情
  calculation_details: {
    formula: string;
    inputs: Record<string, any>;
    intermediate_results?: Record<string, number>;
  };
}

export interface CostBreakdown {
  material: number;
  labor: number;
  equipment: number;
  overhead: number;
  energy?: number;
  total: number;
}

// ============ 10大本体结构定义 ============

export interface OntologyProject {
  type: string;
  complexity: 'low' | 'medium' | 'high';
  customLevel?: string;
}

export interface OntologyProcess {
  name: string;
  duration: number;
  standard?: string;
  description?: string;
}

export interface OntologyMan {
  role: string;
  level?: string;
  count?: number;
  rate?: number;
  efficiency?: number;
}

export interface OntologyMachine {
  name: string;
  type?: string;
  power?: number;
  depreciation?: number;
  quantity?: number;
}

export interface OntologyMaterial {
  name: string;
  quantity?: number;
  unitPrice?: number;
  lossRate?: number;
  type?: string;
}

export interface OntologyMethod {
  name: string;
  standard?: string;
  steps?: string[];
  constraints?: string[];
}

export interface OntologyEnvironment {
  type?: string;
  temperature?: number;
  humidity?: number;
  ventilation?: string;
  cleanliness?: string;
}

export interface OntologyMeasurement {
  name: string;
  method?: string;
  cost?: number;
  mandatory?: boolean;
  standard?: string;
}

export interface OntologyCost {
  type?: string;
  formula?: string;
  labor?: number;
  material?: number;
  equipment?: number;
  overhead?: number;
  energy?: number;
  total?: number;
}

export interface OntologyRule {
  id?: string;
  name: string;
  expression?: string;
  mandatory?: boolean;
  type?: 'cost' | 'time' | 'quality' | 'compliance' | 'logic';
}

export interface StageOntology {
  project?: OntologyProject;
  process?: OntologyProcess;
  man?: OntologyMan[];
  machine?: OntologyMachine[];
  material?: OntologyMaterial[];
  method?: OntologyMethod[];
  environment?: OntologyEnvironment[];
  measurement?: OntologyMeasurement[];
  cost?: OntologyCost;
  rules?: OntologyRule[];
}

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  duration: number;
  resources: string[];
  machines?: string[];
  materials: string[];
  rules: string[];
  plannedCost: CostBreakdown;
  actualCost?: CostBreakdown;
  status: 'not_started' | 'running' | 'completed' | 'delayed';
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  progress?: number;
  subTasks?: {
    id: string;
    name: string;
    duration: number;
    status: string;
    cost?: CostBreakdown;
  }[];
  sixM?: {
    man?: { name: string; count: number; rate: number }[];
    machine?: { name: string; power: number; depreciation: number }[];
    material?: { name: string; quantity: number; price: number }[];
    method?: { name: string; standard: string };
    environment?: { temp: number; humidity: number };
    measurement?: { name: string; cost: number; mandatory: boolean }[];
  };
  // 完整10大本体结构
  ontology?: StageOntology;
  es?: number;
  ef?: number;
  ls?: number;
  lf?: number;
  isCritical?: boolean;
}

export type EdgeType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'lag' | 'parallel';

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  lag?: number;
}

export interface ProjectGraph {
  project_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Rule {
  id: string;
  name: string;
  expression: string;
  ruleType: 'cost' | 'time' | 'resource' | 'quality' | 'compliance' | 'logic';
  scope: string;
  isActive: boolean;
}

export interface SimulationChange {
  type: 'resource_add' | 'resource_remove' | 'duration_change' | 'rule_toggle' | 'cost_adjust';
  targetId: string;
  value?: any;
  description?: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  changes: SimulationChange[];
  results?: {
    totalCost: number;
    totalDuration: number;
    profit: number;
    profitImpact: number;
    durationImpact: number;
    costImpact: number;
  };
  aiRecommendation?: string;
}

export interface AgentResponse {
  analysis: string;
  recommendations: string[];
  expected_impact: {
    profit: string;
    duration: string;
    cost: string;
  };
  risk_alerts?: string[];
}

export interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  resource: string;
  progress: number;
  dependencies: string[];
  status?: 'completed' | 'running' | 'not_started' | 'delayed';
  cost?: number;
  duration?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

// ============ 10个主工序节点定义 ============

// 1. 需求对接
export const STAGE_01_REQUIREMENT: GraphNode = {
  id: "S01",
  type: "phase",
  name: "需求对接",
  duration: 5,
  resources: ["R_SALES_01", "R_ENG_01"],
  machines: [],
  materials: [],
  rules: ["RULE_REQUIREMENT_DOC"],
  plannedCost: { material: 0, labor: 15000, equipment: 0, overhead: 2000, energy: 100, total: 17100 },
  status: "completed",
  riskScore: 10,
  riskLevel: "low",
  progress: 100,
  subTasks: [
    { id: "S01-1", name: "客户访谈", duration: 2, status: "completed" },
    { id: "S01-2", name: "需求分析", duration: 2, status: "completed" },
    { id: "S01-3", name: "技术可行性评估", duration: 1, status: "completed" }
  ],
  sixM: {
    man: [{ name: "销售工程师", count: 2, rate: 400 }],
    machine: [],
    material: [],
    method: { name: "需求调研流程", standard: "SOP-001" },
    environment: { temp: 22, humidity: 50 },
    measurement: [{ name: "需求确认书", cost: 0, mandatory: true }]
  },
  // 完整10大本体结构
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "需求分析", duration: 5, standard: "SOP-001", description: "客户需求调研与技术可行性评估" },
    man: [
      { role: "销售工程师", count: 2, rate: 400, efficiency: 1.2 },
      { role: "技术支持工程师", count: 1, rate: 500, efficiency: 1.0 }
    ],
    machine: [
      { name: "CRM系统", type: "软件系统", quantity: 1 }
    ],
    material: [
      { name: "客户需求文档", quantity: 1, type: "文档" }
    ],
    method: [
      { name: "需求澄清流程", standard: "SOP-001", steps: ["客户访谈", "需求分析", "技术可行性评估"], constraints: ["必须书面确认"] }
    ],
    environment: [
      { type: "会议/远程沟通", temperature: 22, humidity: 50 }
    ],
    measurement: [
      { name: "需求评审确认", method: "文档评审", cost: 0, mandatory: true }
    ],
    cost: {
      type: "人工成本",
      labor: 15000,
      equipment: 0,
      overhead: 2000,
      total: 17100,
      formula: "销售工时×单价 + 支持工时×单价 + 管理费用"
    },
    rules: [
      { id: "R1-1", name: "需求必须评审通过", mandatory: true, type: "compliance" },
      { id: "R1-2", name: "技术可行性必须评估", mandatory: true, type: "logic" }
    ]
  },
  es: 0, ef: 5, ls: 0, lf: 5, isCritical: true
};

// 2. 定制化设计
export const STAGE_02_DESIGN: GraphNode = {
  id: "S02",
  type: "phase",
  name: "定制化设计",
  duration: 15,
  resources: ["R_DESIGN_01", "R_DESIGN_02"],
  machines: ["CAD_WORKSTATION_01", "CAD_WORKSTATION_02"],
  materials: ["DESIGN_STD_LIB"],
  rules: ["RULE_CUSTOM_DESIGN", "RULE_RD_COST_ALLOCATION"],
  plannedCost: { material: 5000, labor: 120000, equipment: 15000, overhead: 15000, energy: 2000, total: 157000 },
  status: "completed",
  riskScore: 25,
  riskLevel: "medium",
  progress: 100,
  subTasks: [
    { id: "S02-1", name: "概念设计", duration: 5, status: "completed" },
    { id: "S02-2", name: "详细设计", duration: 7, status: "completed" },
    { id: "S02-3", name: "设计评审", duration: 2, status: "completed" },
    { id: "S02-4", name: "图纸输出", duration: 1, status: "completed" }
  ],
  sixM: {
    man: [{ name: "设计工程师", count: 3, rate: 600 }],
    machine: [{ name: "CAD工作站", power: 5, depreciation: 80 }],
    material: [{ name: "设计规范库", quantity: 1, price: 5000 }],
    method: { name: "非标设计流程", standard: "SOP-002" },
    environment: { temp: 22, humidity: 50 },
    measurement: [{ name: "设计评审", cost: 3000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high", customLevel: "高" },
    process: { name: "结构设计", duration: 15, standard: "SOP-002", description: "概念设计到详细设计的全流程" },
    man: [
      { role: "结构工程师", count: 2, rate: 600, efficiency: 1.3 },
      { role: "设计负责人", count: 1, rate: 800, efficiency: 1.2 }
    ],
    machine: [
      { name: "CAD系统", type: "软件系统", power: 5, depreciation: 80 },
      { name: "CAE仿真系统", type: "软件系统", power: 10, depreciation: 120 }
    ],
    material: [
      { name: "设计规范", quantity: 1, type: "文档" }
    ],
    method: [
      { name: "设计流程", standard: "SOP-002", steps: ["概念设计", "详细设计", "设计评审", "图纸输出"], constraints: ["压力容器必须做强度校核"] }
    ],
    environment: [
      { type: "设计室", temperature: 22, humidity: 50, cleanliness: "普通" }
    ],
    measurement: [
      { name: "设计评审", method: "专家评审", cost: 3000, mandatory: true }
    ],
    cost: {
      type: "人工+软件成本",
      labor: 120000,
      equipment: 15000,
      overhead: 15000,
      total: 157000,
      formula: "设计工时×单价 + CAD/CAE折旧 + 管理费用"
    },
    rules: [
      { id: "R2-1", name: "必须完成设计评审", mandatory: true, type: "compliance" },
      { id: "R2-2", name: "压力容器必须做强度校核", mandatory: true, type: "quality" }
    ]
  },
  es: 5, ef: 20, ls: 5, lf: 20, isCritical: true
};

// 3. 非标工艺规划
export const STAGE_03_PROCESS_PLAN: GraphNode = {
  id: "S03",
  type: "phase",
  name: "非标工艺规划",
  duration: 10,
  resources: ["R_PROCESS_01"],
  machines: ["PROCESS_SYSTEM"],
  materials: ["HISTORICAL_CASES"],
  rules: ["RULE_NONSTD_PROCESS", "RULE_RD_COST_ALLOCATION"],
  plannedCost: { material: 2000, labor: 50000, equipment: 5000, overhead: 8000, energy: 500, total: 65500 },
  status: "running",
  riskScore: 35,
  riskLevel: "medium",
  progress: 60,
  subTasks: [
    { id: "S03-1", name: "工艺路线设计", duration: 4, status: "completed" },
    { id: "S03-2", name: "工艺试验", duration: 4, status: "running" },
    { id: "S03-3", name: "工艺评审", duration: 2, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "工艺工程师", count: 2, rate: 500 }],
    machine: [{ name: "工艺系统", power: 3, depreciation: 50 }],
    material: [{ name: "历史案例库", quantity: 1, price: 2000 }],
    method: { name: "工艺规划方法", standard: "SOP-003" },
    environment: { temp: 22, humidity: 50 },
    measurement: [{ name: "工艺评审", cost: 2000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "工艺规划", duration: 10, standard: "SOP-003", description: "工艺路线设计与工艺试验" },
    man: [
      { role: "工艺工程师", count: 2, rate: 500, efficiency: 1.1 }
    ],
    machine: [
      { name: "工艺规划系统", type: "软件系统", power: 3, depreciation: 50 }
    ],
    material: [
      { name: "历史工艺案例", quantity: 1, type: "知识库" }
    ],
    method: [
      { name: "工艺路线设计", standard: "SOP-003", steps: ["工艺路线设计", "工艺试验", "工艺评审"], constraints: ["工艺必须满足设备能力"] }
    ],
    environment: [
      { type: "工艺室", temperature: 22, humidity: 50 }
    ],
    measurement: [
      { name: "工艺评审", method: "技术评审", cost: 2000, mandatory: true }
    ],
    cost: {
      type: "工艺工时成本",
      labor: 50000,
      equipment: 5000,
      overhead: 8000,
      total: 65500,
      formula: "工艺工时×单价 + 系统折旧 + 管理费用"
    },
    rules: [
      { id: "R3-1", name: "工艺必须满足设备能力", mandatory: true, type: "compliance" }
    ]
  },
  es: 20, ef: 30, ls: 20, lf: 30, isCritical: true
};

// 4. 定制化物料采购
export const STAGE_04_PROCUREMENT: GraphNode = {
  id: "S04",
  type: "phase",
  name: "定制化物料采购",
  duration: 20,
  resources: ["R_PROCURE_01"],
  machines: ["ERP_SYSTEM"],
  materials: ["CUSTOM_STEEL", "CUSTOM_TITANIUM"],
  rules: ["RULE_CUSTOM_MATERIAL_COST", "RULE_SPECIAL_MATERIAL_ALLOC"],
  plannedCost: { material: 800000, labor: 30000, equipment: 5000, overhead: 40000, energy: 1000, total: 876000 },
  status: "running",
  riskScore: 45,
  riskLevel: "high",
  progress: 40,
  subTasks: [
    { id: "S04-1", name: "供应商寻源", duration: 5, status: "completed" },
    { id: "S04-2", name: "特殊材料定制", duration: 10, status: "running" },
    { id: "S04-3", name: "到货检验", duration: 3, status: "not_started" },
    { id: "S04-4", name: "入库管理", duration: 2, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "采购工程师", count: 2, rate: 400 }],
    machine: [{ name: "ERP系统", power: 2, depreciation: 30 }],
    material: [{ name: "定制钢材", quantity: 1000, price: 500 }, { name: "钛合金", quantity: 200, price: 800 }],
    method: { name: "非标采购流程", standard: "SOP-004" },
    environment: { temp: 20, humidity: 55 },
    measurement: [{ name: "到货检验", cost: 5000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "采购", duration: 20, standard: "SOP-004", description: "供应商寻源到入库的全流程" },
    man: [
      { role: "采购经理", count: 2, rate: 400, efficiency: 1.0 }
    ],
    machine: [
      { name: "ERP系统", type: "软件系统", power: 2, depreciation: 30 }
    ],
    material: [
      { name: "钢材", quantity: 1000, unitPrice: 500, lossRate: 0.05 },
      { name: "钛合金", quantity: 200, unitPrice: 800, lossRate: 0.03 }
    ],
    method: [
      { name: "供应商选择流程", standard: "SOP-004", steps: ["供应商寻源", "特殊材料定制", "到货检验", "入库管理"], constraints: ["关键材料必须认证供应商"] }
    ],
    environment: [
      { type: "仓库", temperature: 20, humidity: 55 }
    ],
    measurement: [
      { name: "到货检验", method: "质量检验", cost: 5000, mandatory: true }
    ],
    cost: {
      type: "物料成本",
      material: 800000,
      labor: 30000,
      overhead: 40000,
      total: 876000,
      formula: "单价×数量×(1+损耗率) + 人工 + 管理费用"
    },
    rules: [
      { id: "R4-1", name: "关键材料必须认证供应商", mandatory: true, type: "compliance" }
    ]
  },
  es: 20, ef: 40, ls: 25, lf: 45, isCritical: false
};

// 5. 铆焊组对（核心工序）
export const STAGE_05_WELDING: GraphNode = {
  id: "S05",
  type: "process",
  name: "铆焊组对",
  duration: 25,
  resources: ["R_WELD_01", "R_WELD_02", "R_WELD_03"],
  machines: ["WELD_ROBOT_A", "WELD_MANUAL_B", "CRANE_10T"],
  materials: ["M_STEEL", "M_WIRE", "M_GAS"],
  rules: ["RULE_WELD_TIME", "RULE_WELD_QUALITY", "RULE_HEAVY_EQUIP_DEPREC"],
  plannedCost: { material: 150000, labor: 180000, equipment: 120000, overhead: 30000, energy: 25000, total: 505000 },
  status: "not_started",
  riskScore: 65,
  riskLevel: "high",
  progress: 0,
  subTasks: [
    { id: "S05-1", name: "材料准备", duration: 3, status: "not_started" },
    { id: "S05-2", name: "组对定位", duration: 5, status: "not_started" },
    { id: "S05-3", name: "主焊接", duration: 12, status: "not_started" },
    { id: "S05-4", name: "焊后处理", duration: 3, status: "not_started" },
    { id: "S05-5", name: "质量检查", duration: 2, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "高级焊工", count: 6, rate: 400 }],
    machine: [{ name: "焊接机器人", power: 25, depreciation: 300 }, { name: "手工焊机", power: 15, depreciation: 80 }],
    material: [{ name: "焊丝", quantity: 500, price: 80 }, { name: "钢板", quantity: 2000, price: 50 }],
    method: { name: "WPS焊接工艺", standard: "WPS-001" },
    environment: { temp: 25, humidity: 60 },
    measurement: [{ name: "UT检测", cost: 8000, mandatory: true }, { name: "外观检查", cost: 2000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "焊接组对", duration: 25, standard: "WPS-001", description: "材料准备到质量检查的全流程焊接" },
    man: [
      { role: "焊工", level: "高级", count: 6, rate: 400, efficiency: 1.3 }
    ],
    machine: [
      { name: "焊接机器人", type: "自动化", power: 25, depreciation: 300 },
      { name: "起吊设备", type: "重型", power: 50, depreciation: 200 }
    ],
    material: [
      { name: "焊丝", quantity: 500, unitPrice: 80, lossRate: 0.05 },
      { name: "钢板", quantity: 2000, unitPrice: 50, lossRate: 0.08 }
    ],
    method: [
      { name: "WPS焊接工艺", standard: "WPS-001", steps: ["材料准备", "组对定位", "主焊接", "焊后处理", "质量检查"], constraints: ["预热", "层间温度控制", "焊后热处理"] }
    ],
    environment: [
      { type: "温湿度控制", temperature: 25, humidity: 60, ventilation: "良好" }
    ],
    measurement: [
      { name: "UT检测", method: "超声波检测", cost: 8000, mandatory: true },
      { name: "外观检查", method: "目视检查", cost: 2000, mandatory: true }
    ],
    cost: {
      type: "综合成本",
      labor: 180000,
      material: 150000,
      equipment: 120000,
      energy: 25000,
      overhead: 30000,
      total: 505000,
      formula: "人工+材料+能耗+折旧"
    },
    rules: [
      { id: "R5-1", name: "焊接必须检测", mandatory: true, type: "quality" },
      { id: "R5-2", name: "焊接顺序不可变", mandatory: true, type: "logic" }
    ]
  },
  es: 45, ef: 70, ls: 45, lf: 70, isCritical: true
};

// 6. 定制化机加工序
export const STAGE_06_MACHINING: GraphNode = {
  id: "S06",
  type: "process",
  name: "定制化机加工序",
  duration: 18,
  resources: ["R_CNC_01", "R_CNC_02"],
  machines: ["CNC_5AXIS_01", "CNC_LATHE_02"],
  materials: ["M_ALLOY", "M_SEMI_FINISHED"],
  rules: ["RULE_CNC_PRECISION", "RULE_HEAVY_EQUIP_DEPREC"],
  plannedCost: { material: 80000, labor: 86400, equipment: 108000, overhead: 20000, energy: 15000, total: 309400 },
  status: "not_started",
  riskScore: 40,
  riskLevel: "medium",
  progress: 0,
  subTasks: [
    { id: "S06-1", name: "程序编制", duration: 3, status: "not_started" },
    { id: "S06-2", name: "工件装夹", duration: 2, status: "not_started" },
    { id: "S06-3", name: "粗加工", duration: 8, status: "not_started" },
    { id: "S06-4", name: "精加工", duration: 4, status: "not_started" },
    { id: "S06-5", name: "精度检测", duration: 1, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "CNC操作员", count: 4, rate: 350 }],
    machine: [{ name: "五轴CNC", power: 45, depreciation: 400 }, { name: "数控车床", power: 25, depreciation: 200 }],
    material: [{ name: "半成品", quantity: 500, price: 100 }],
    method: { name: "数控加工程序", standard: "CAM-001" },
    environment: { temp: 22, humidity: 50 },
    measurement: [{ name: "三坐标检测", cost: 3000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "机加工", duration: 18, standard: "CAM-001", description: "程序编制到精度检测的全流程" },
    man: [
      { role: "操作工", count: 4, rate: 350, efficiency: 1.0 }
    ],
    machine: [
      { name: "数控机床", type: "五轴", power: 45, depreciation: 400 }
    ],
    material: [
      { name: "半成品", quantity: 500, unitPrice: 100, lossRate: 0.05 }
    ],
    method: [
      { name: "加工程序", standard: "CAM-001", steps: ["程序编制", "工件装夹", "粗加工", "精加工", "精度检测"], constraints: ["精度必须达标"] }
    ],
    environment: [
      { type: "恒温车间", temperature: 22, humidity: 50 }
    ],
    measurement: [
      { name: "尺寸检测", method: "三坐标检测", cost: 3000, mandatory: true }
    ],
    cost: {
      type: "设备+人工成本",
      labor: 86400,
      material: 80000,
      equipment: 108000,
      energy: 15000,
      overhead: 20000,
      total: 309400,
      formula: "设备折旧+人工+材料"
    },
    rules: [
      { id: "R6-1", name: "精度必须达标", mandatory: true, type: "quality" }
    ]
  },
  es: 70, ef: 88, ls: 75, lf: 93, isCritical: false
};

// 7. 总装试压
export const STAGE_07_ASSEMBLY: GraphNode = {
  id: "S07",
  type: "process",
  name: "总装试压",
  duration: 15,
  resources: ["R_ASSY_01", "R_ASSY_02", "R_TEST_01"],
  machines: ["CRANE_20T", "TEST_RIG_01", "HYDRO_TEST_PUMP"],
  materials: ["M_FASTENERS", "M_SEALS"],
  rules: ["RULE_PRESSURE_TEST", "RULE_ASSEMBLY_TORQUE"],
  plannedCost: { material: 50000, labor: 90000, equipment: 45000, overhead: 15000, energy: 8000, total: 208000 },
  status: "not_started",
  riskScore: 55,
  riskLevel: "high",
  progress: 0,
  subTasks: [
    { id: "S07-1", name: "机械组装", duration: 8, status: "not_started" },
    { id: "S07-2", name: "电气接线", duration: 3, status: "not_started" },
    { id: "S07-3", name: "系统联调", duration: 2, status: "not_started" },
    { id: "S07-4", name: "压力测试", duration: 2, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "装配钳工", count: 5, rate: 380 }],
    machine: [{ name: "20T行车", power: 30, depreciation: 150 }, { name: "试压设备", power: 50, depreciation: 300 }],
    material: [{ name: "紧固件", quantity: 2000, price: 10 }, { name: "密封件", quantity: 500, price: 50 }],
    method: { name: "装配SOP", standard: "SOP-005" },
    environment: { temp: 22, humidity: 50 },
    measurement: [{ name: "气密性测试", cost: 5000, mandatory: true }, { name: "压力测试", cost: 8000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "总装试压", duration: 15, standard: "SOP-005", description: "机械组装到压力测试的全流程" },
    man: [
      { role: "装配工", count: 5, rate: 380, efficiency: 1.0 }
    ],
    machine: [
      { name: "起吊设备", type: "重型", power: 50, depreciation: 300 }
    ],
    material: [
      { name: "组件", quantity: 1000, unitPrice: 50, lossRate: 0.03 }
    ],
    method: [
      { name: "装配流程", standard: "SOP-005", steps: ["机械组装", "电气接线", "系统联调", "压力测试"], constraints: ["必须通过试压"] }
    ],
    environment: [
      { type: "装配车间", temperature: 22, humidity: 50 }
    ],
    measurement: [
      { name: "压力测试", method: "水压试验", cost: 8000, mandatory: true }
    ],
    cost: {
      type: "人工+设备成本",
      labor: 90000,
      material: 50000,
      equipment: 45000,
      energy: 8000,
      overhead: 15000,
      total: 208000,
      formula: "人工+设备+材料"
    },
    rules: [
      { id: "R7-1", name: "必须通过试压", mandatory: true, type: "quality" }
    ]
  },
  es: 93, ef: 108, ls: 93, lf: 108, isCritical: true
};

// 8. 定制化检测认证
export const STAGE_08_INSPECTION: GraphNode = {
  id: "S08",
  type: "process",
  name: "定制化检测认证",
  duration: 12,
  resources: ["R_INSPECT_01", "R_INSPECT_02"],
  machines: ["NDT_EQUIPMENT", "DIMENSIONAL_CHECKER"],
  materials: [],
  rules: ["RULE_ISO_CERTIFICATION", "RULE_CUSTOM_INSPECTION"],
  plannedCost: { material: 10000, labor: 72000, equipment: 30000, overhead: 12000, energy: 3000, total: 127000 },
  status: "not_started",
  riskScore: 30,
  riskLevel: "medium",
  progress: 0,
  subTasks: [
    { id: "S08-1", name: "无损检测", duration: 4, status: "not_started" },
    { id: "S08-2", name: "尺寸检验", duration: 3, status: "not_started" },
    { id: "S08-3", name: "性能测试", duration: 3, status: "not_started" },
    { id: "S08-4", name: "认证报告", duration: 2, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "检测工程师", count: 3, rate: 450 }],
    machine: [{ name: "NDT设备", power: 10, depreciation: 200 }, { name: "三坐标测量机", power: 5, depreciation: 150 }],
    material: [],
    method: { name: "ISO检测标准", standard: "ISO-001" },
    environment: { temp: 20, humidity: 45 },
    measurement: [{ name: "检测报告", cost: 10000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "检测认证", duration: 12, standard: "ISO-001", description: "无损检测到认证报告的全流程" },
    man: [
      { role: "检测工程师", count: 3, rate: 450, efficiency: 1.0 }
    ],
    machine: [
      { name: "检测设备", type: "精密", power: 10, depreciation: 200 }
    ],
    material: [],
    method: [
      { name: "ISO认证流程", standard: "ISO-001", steps: ["无损检测", "尺寸检验", "性能测试", "认证报告"], constraints: ["必须符合国家标准"] }
    ],
    environment: [
      { type: "检测室", temperature: 20, humidity: 45, cleanliness: "洁净" }
    ],
    measurement: [
      { name: "认证报告", method: "第三方检测", cost: 10000, mandatory: true }
    ],
    cost: {
      type: "检测费用",
      labor: 72000,
      material: 10000,
      equipment: 30000,
      overhead: 12000,
      total: 127000,
      formula: "检测费用"
    },
    rules: [
      { id: "R8-1", name: "必须符合国家标准", mandatory: true, type: "compliance" }
    ]
  },
  es: 108, ef: 120, ls: 108, lf: 120, isCritical: true
};

// 9. 现场安装调试
export const STAGE_09_INSTALLATION: GraphNode = {
  id: "S09",
  type: "phase",
  name: "现场安装调试",
  duration: 20,
  resources: ["R_FIELD_01", "R_FIELD_02", "R_FIELD_03"],
  machines: ["MOBILE_CRANE", "LIFTING_EQUIP"],
  materials: ["M_INSTALL_KIT"],
  rules: ["RULE_FIELD_SAFETY", "RULE_INSTALL_STD"],
  plannedCost: { material: 30000, labor: 120000, equipment: 50000, overhead: 20000, energy: 5000, total: 225000 },
  status: "not_started",
  riskScore: 50,
  riskLevel: "high",
  progress: 0,
  subTasks: [
    { id: "S09-1", name: "基础验收", duration: 3, status: "not_started" },
    { id: "S09-2", name: "设备就位", duration: 5, status: "not_started" },
    { id: "S09-3", name: "管道连接", duration: 5, status: "not_started" },
    { id: "S09-4", name: "电气接线", duration: 4, status: "not_started" },
    { id: "S09-5", name: "调试验收", duration: 3, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "现场工程师", count: 4, rate: 450 }],
    machine: [{ name: "移动吊车", power: 100, depreciation: 500 }, { name: "吊装设备", power: 50, depreciation: 200 }],
    material: [{ name: "安装工具包", quantity: 1, price: 30000 }],
    method: { name: "现场施工流程", standard: "SOP-006" },
    environment: { temp: 30, humidity: 70 },
    measurement: [{ name: "验收测试", cost: 10000, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "安装调试", duration: 20, standard: "SOP-006", description: "基础验收到调试验收的全流程" },
    man: [
      { role: "现场工程师", count: 4, rate: 450, efficiency: 1.0 }
    ],
    machine: [
      { name: "安装设备", type: "移动", power: 100, depreciation: 500 }
    ],
    material: [
      { name: "安装工具包", quantity: 1, unitPrice: 30000, type: "工具" }
    ],
    method: [
      { name: "施工流程", standard: "SOP-006", steps: ["基础验收", "设备就位", "管道连接", "电气接线", "调试验收"], constraints: ["必须客户验收"] }
    ],
    environment: [
      { type: "现场环境", temperature: 30, humidity: 70 }
    ],
    measurement: [
      { name: "验收测试", method: "现场测试", cost: 10000, mandatory: true }
    ],
    cost: {
      type: "人工+差旅成本",
      labor: 120000,
      material: 30000,
      equipment: 50000,
      overhead: 20000,
      total: 225000,
      formula: "人工+差旅"
    },
    rules: [
      { id: "R9-1", name: "必须客户验收", mandatory: true, type: "compliance" }
    ]
  },
  es: 120, ef: 140, ls: 120, lf: 140, isCritical: true
};

// 10. 回款结算
export const STAGE_10_SETTLEMENT: GraphNode = {
  id: "S10",
  type: "phase",
  name: "回款结算",
  duration: 10,
  resources: ["R_FINANCE_01"],
  machines: ["ERP_FINANCE"],
  materials: [],
  rules: ["RULE_PAYMENT_TERMS", "RULE_COST_SETTLEMENT"],
  plannedCost: { material: 0, labor: 20000, equipment: 2000, overhead: 5000, energy: 200, total: 27200 },
  status: "not_started",
  riskScore: 20,
  riskLevel: "low",
  progress: 0,
  subTasks: [
    { id: "S10-1", name: "成本核算", duration: 3, status: "not_started" },
    { id: "S10-2", name: "发票开具", duration: 2, status: "not_started" },
    { id: "S10-3", name: "尾款回收", duration: 4, status: "not_started" },
    { id: "S10-4", name: "项目归档", duration: 1, status: "not_started" }
  ],
  sixM: {
    man: [{ name: "财务专员", count: 2, rate: 350 }],
    machine: [{ name: "财务ERP", power: 2, depreciation: 20 }],
    material: [],
    method: { name: "结算流程", standard: "SOP-007" },
    environment: { temp: 22, humidity: 50 },
    measurement: [{ name: "对账确认", cost: 0, mandatory: true }]
  },
  ontology: {
    project: { type: "非标设备", complexity: "high" },
    process: { name: "回款结算", duration: 10, standard: "SOP-007", description: "成本核算到项目归档的全流程" },
    man: [
      { role: "财务", count: 2, rate: 350, efficiency: 1.0 }
    ],
    machine: [
      { name: "ERP", type: "软件系统", power: 2, depreciation: 20 }
    ],
    material: [],
    method: [
      { name: "结算流程", standard: "SOP-007", steps: ["成本核算", "发票开具", "尾款回收", "项目归档"], constraints: ["必须完成对账"] }
    ],
    environment: [
      { type: "办公室", temperature: 22, humidity: 50 }
    ],
    measurement: [
      { name: "对账", method: "财务对账", cost: 0, mandatory: true }
    ],
    cost: {
      type: "财务费用",
      labor: 20000,
      equipment: 2000,
      overhead: 5000,
      total: 27200,
      formula: "财务人工成本"
    },
    rules: [
      { id: "R10-1", name: "必须完成对账", mandatory: true, type: "compliance" }
    ]
  },
  es: 140, ef: 150, ls: 140, lf: 150, isCritical: true
};

// ============ 新的项目图数据结构 ============

export const mockGraph: ProjectGraph = {
  project_id: "P001",
  nodes: [
    STAGE_01_REQUIREMENT,
    STAGE_02_DESIGN,
    STAGE_03_PROCESS_PLAN,
    STAGE_04_PROCUREMENT,
    STAGE_05_WELDING,
    STAGE_06_MACHINING,
    STAGE_07_ASSEMBLY,
    STAGE_08_INSPECTION,
    STAGE_09_INSTALLATION,
    STAGE_10_SETTLEMENT
  ],
  edges: [
    // 主线流程
    { from: "S01", to: "S02", type: "finish_to_start" },
    { from: "S02", to: "S03", type: "finish_to_start" },

    // 设计并行：工艺规划与物料采购并行
    { from: "S03", to: "S05", type: "finish_to_start" },
    { from: "S04", to: "S05", type: "finish_to_start" },

    // 焊接与机加工并行（部分）
    { from: "S05", to: "S07", type: "finish_to_start" },
    { from: "S06", to: "S07", type: "finish_to_start" },

    // 后续流程
    { from: "S07", to: "S08", type: "finish_to_start" },
    { from: "S08", to: "S09", type: "finish_to_start" },
    { from: "S09", to: "S10", type: "finish_to_start" },

    // 特殊关系：设计阶段开始后可启动采购
    { from: "S02", to: "S04", type: "start_to_start", lag: 5 },

    // 焊接开始后机加工可部分开始
    { from: "S05", to: "S06", type: "start_to_start", lag: 10 }
  ]
};

// ============ 新的规则定义 ============

export const mockRules: Rule[] = [
  {
    id: "R1",
    name: "定制化设计成本归集规则",
    expression: "design_cost = design_hours * engineer_rate + software_cost + review_cost",
    ruleType: "cost",
    scope: "定制化设计",
    isActive: true
  },
  {
    id: "R2",
    name: "非标工艺研发成本归集规则",
    expression: "IF process_category == '非标工艺' THEN R&D_cost = design_hours * engineer_rate + trial_cost + validation_cost",
    ruleType: "cost",
    scope: "非标工艺规划",
    isActive: true
  },
  {
    id: "R3",
    name: "定制化特殊材料成本分摊规则",
    expression: "IF material_type == '定制特殊材料' THEN material_cost = base_price * quantity * 1.5 + custom_processing_fee",
    ruleType: "cost",
    scope: "定制化物料采购",
    isActive: true
  },
  {
    id: "R4",
    name: "焊接质量控制规则",
    expression: "IF weld_type == '主焊接' THEN require(['预热', '层间温度控制', '焊后热处理'])",
    ruleType: "quality",
    scope: "铆焊组对",
    isActive: true
  },
  {
    id: "R5",
    name: "重型设备定制化使用的折旧分摊规则",
    expression: "IF equipment_type == '重型设备' AND usage_type == '定制' THEN depreciation_cost = (equipment_value * customization_factor) / custom_lifecycle_hours * usage_hours",
    ruleType: "cost",
    scope: "铆焊组对/机加工",
    isActive: true
  },
  {
    id: "R6",
    name: "压力容器试压规则",
    expression: "IF product_type == '压力容器' THEN test_pressure = 1.5 * design_pressure",
    ruleType: "quality",
    scope: "总装试压",
    isActive: true
  },
  {
    id: "R7",
    name: "定制化检测认证规则",
    expression: "IF custom_level == '高' THEN require(['第三方检测', '客户见证', '认证报告'])",
    ruleType: "compliance",
    scope: "定制化检测认证",
    isActive: true
  },
  {
    id: "R8",
    name: "现场安装安全规则",
    expression: "ASSERT safety_checklist_completed == true BEFORE start_installation",
    ruleType: "logic",
    scope: "现场安装调试",
    isActive: true
  },
  {
    id: "R9",
    name: "回款结算规则",
    expression: "payment_schedule = [0.3, 0.4, 0.2, 0.1] AT milestones = [contract, delivery, installation, acceptance]",
    ruleType: "cost",
    scope: "回款结算",
    isActive: true
  }
];

// ============ 新的甘特图任务 ============

export const mockGanttTasks: GanttTask[] = [
  { id: "S01", name: "需求对接", start: "2026-03-01", end: "2026-03-05", resource: "R_SALES_01", progress: 100, dependencies: [], status: "completed", cost: 17100, duration: 5, riskLevel: "low" },
  { id: "S02", name: "定制化设计", start: "2026-03-06", end: "2026-03-20", resource: "R_DESIGN_01", progress: 100, dependencies: ["S01"], status: "completed", cost: 157000, duration: 15, riskLevel: "medium" },
  { id: "S03", name: "非标工艺规划", start: "2026-03-21", end: "2026-03-30", resource: "R_PROCESS_01", progress: 60, dependencies: ["S02"], status: "running", cost: 65500, duration: 10, riskLevel: "medium" },
  { id: "S04", name: "定制化物料采购", start: "2026-03-11", end: "2026-03-30", resource: "R_PROCURE_01", progress: 40, dependencies: ["S02"], status: "running", cost: 876000, duration: 20, riskLevel: "high" },
  { id: "S05", name: "铆焊组对", start: "2026-03-31", end: "2026-04-24", resource: "R_WELD_01", progress: 0, dependencies: ["S03", "S04"], status: "not_started", cost: 505000, duration: 25, riskLevel: "high" },
  { id: "S06", name: "定制化机加工序", start: "2026-04-10", end: "2026-04-27", resource: "R_CNC_01", progress: 0, dependencies: ["S05"], status: "not_started", cost: 309400, duration: 18, riskLevel: "medium" },
  { id: "S07", name: "总装试压", start: "2026-04-28", end: "2026-05-12", resource: "R_ASSY_01", progress: 0, dependencies: ["S05", "S06"], status: "not_started", cost: 208000, duration: 15, riskLevel: "high" },
  { id: "S08", name: "定制化检测认证", start: "2026-05-13", end: "2026-05-24", resource: "R_INSPECT_01", progress: 0, dependencies: ["S07"], status: "not_started", cost: 127000, duration: 12, riskLevel: "medium" },
  { id: "S09", name: "现场安装调试", start: "2026-05-25", end: "2026-06-13", resource: "R_FIELD_01", progress: 0, dependencies: ["S08"], status: "not_started", cost: 225000, duration: 20, riskLevel: "high" },
  { id: "S10", name: "回款结算", start: "2026-06-14", end: "2026-06-23", resource: "R_FINANCE_01", progress: 0, dependencies: ["S09"], status: "not_started", cost: 27200, duration: 10, riskLevel: "low" }
];

// ============ 导出所有原有类型定义 ============

export type SixMType = 'man' | 'machine' | 'material' | 'method' | 'environment' | 'measurement';

export interface OntologyNode {
  id: string;
  type: 'project' | 'process' | 'man' | 'machine' | 'material' | 'method' | 'environment' | 'measurement' | 'cost' | 'rule';
  name: string;
  properties: Record<string, any>;
}

export interface OntologyEdge {
  id: string;
  source: string;
  target: string;
  type: 'uses' | 'consumes' | 'follows' | 'constrained_by' | 'affects' | 'requires';
  constraints?: Record<string, any>;
}

export interface OntologyGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

// ============ 新的本体图谱（10个工序的完整6M元素）============
// 根据 mockTaskNodePacks 自动生成所有工序的6M节点和关联

function generateOntologyFromTaskPacks(): OntologyGraph {
  const nodes: OntologyNode[] = [];
  const edges: OntologyEdge[] = [];
  let edgeIdCounter = 1;

  // 添加10个主工序节点
  const stageNames: Record<string, string> = {
    'S01': '需求对接', 'S02': '定制化设计', 'S03': '非标工艺规划', 'S04': '定制化物料采购',
    'S05': '铆焊组对', 'S06': '定制化机加工序', 'S07': '总装试压', 'S08': '定制化检测认证',
    'S09': '现场安装调试', 'S10': '回款结算'
  };

  Object.entries(stageNames).forEach(([id, name], index) => {
    nodes.push({
      id,
      type: 'process',
      name,
      properties: { stage: index + 1 }
    });
  });

  // 添加工序间关系
  const flowEdges = [
    ['S01', 'S02'], ['S02', 'S03'], ['S03', 'S05'], ['S04', 'S05'],
    ['S05', 'S07'], ['S06', 'S07'], ['S07', 'S08'], ['S08', 'S09'], ['S09', 'S10'],
    ['S02', 'S04'], ['S05', 'S06']
  ];

  flowEdges.forEach(([source, target]) => {
    edges.push({
      id: `flow_${edgeIdCounter++}`,
      source,
      target,
      type: 'follows'
    });
  });

  // 从 mockTaskNodePacks 生成6M节点和关联
  mockTaskNodePacks.forEach((pack) => {
    const stageId = pack.task_id;

    pack.node_pack.forEach((category) => {
      const categoryType = category.type;

      category.nodes.forEach((node, index) => {
        const nodeId = `${stageId}_${categoryType}_${index + 1}`;

        // 创建6M节点
        const ontologyNode: OntologyNode = {
          id: nodeId,
          type: categoryType,
          name: node.name,
          properties: {}
        };

        // 根据类型添加属性
        if (categoryType === 'man') {
          ontologyNode.properties = {
            count: node.count,
            hourlyRate: node.hourly_rate,
            efficiency: node.efficiency,
            workHours: node.work_hours
          };
        } else if (categoryType === 'machine') {
          ontologyNode.properties = {
            power: node.power_kw,
            duration: node.duration,
            depreciation: node.depreciation_per_hour,
            energyCost: node.energy_cost_per_hour
          };
        } else if (categoryType === 'material') {
          ontologyNode.properties = {
            quantity: node.quantity,
            unitPrice: node.unit_price,
            lossRate: node.loss_rate
          };
        } else if (categoryType === 'method') {
          ontologyNode.properties = {
            standardTime: node.standard_time,
            constraints: node.constraints
          };
        } else if (categoryType === 'environment') {
          ontologyNode.properties = {
            temperature: node.temperature,
            humidity: node.humidity,
            impactFactor: node.impact_factor
          };
        } else if (categoryType === 'measurement') {
          ontologyNode.properties = {
            cost: node.cost,
            mandatory: node.mandatory,
            method: node.method
          };
        }

        nodes.push(ontologyNode);

        // 创建与工序的关联
        let edgeType: OntologyEdge['type'] = 'uses';
        if (categoryType === 'material') edgeType = 'consumes';
        else if (categoryType === 'method') edgeType = 'constrained_by';
        else if (categoryType === 'environment') edgeType = 'affects';
        else if (categoryType === 'measurement') edgeType = 'requires';

        edges.push({
          id: `e_${edgeIdCounter++}`,
          source: stageId,
          target: nodeId,
          type: edgeType
        });
      });
    });
  });

  return { nodes, edges };
}

// Lazy initialization to avoid temporal dead zone - will be initialized after mockTaskNodePacks is defined
let _mockOntologyGraph: OntologyGraph | null = null;

export function getMockOntologyGraph(): OntologyGraph {
  if (!_mockOntologyGraph) {
    _mockOntologyGraph = generateOntologyFromTaskPacks();
  }
  return _mockOntologyGraph;
}

// Export a getter-based object for compatibility
export const mockOntologyGraph: OntologyGraph = {
  get nodes() { return getMockOntologyGraph().nodes; },
  get edges() { return getMockOntologyGraph().edges; }
};

// ============ SixM节点定义 ============

export interface SixMNode {
  id: string;
  type: SixMType;
  name: string;
  count?: number;
  hourly_rate?: number;
  efficiency?: number;
  work_hours?: number;
  power_kw?: number;
  duration?: number;
  depreciation_per_hour?: number;
  energy_cost_per_hour?: number;
  quantity?: number;
  unit_price?: number;
  loss_rate?: number;
  standard_time?: number;
  constraints?: string[];
  temperature?: number;
  humidity?: number;
  impact_factor?: number;
  method?: string;
  cost?: number;
  mandatory?: boolean;
}

export interface TaskNodePack {
  task_id: string;
  task_name: string;
  node_pack: {
    type: SixMType;
    nodes: SixMNode[];
  }[];
}

// ============ 完整的人员清单（环保装备/压力容器制造企业）============
export const PERSONNEL_LIST = [
  // S01 需求对接 - 销售团队
  { id: "P_SALES_01", name: "王伟", role: "销售总监", department: "销售部", hourly_rate: 500, efficiency: 1.3, skill_level: "高级" },
  { id: "P_SALES_02", name: "李明", role: "销售经理", department: "销售部", hourly_rate: 400, efficiency: 1.2, skill_level: "中级" },
  { id: "P_SALES_03", name: "张敏", role: "销售工程师", department: "销售部", hourly_rate: 350, efficiency: 1.1, skill_level: "中级" },
  { id: "P_TECH_01", name: "刘工", role: "技术工程师", department: "技术部", hourly_rate: 450, efficiency: 1.2, skill_level: "高级" },
  { id: "P_TECH_02", name: "陈工", role: "售前支持", department: "技术部", hourly_rate: 400, efficiency: 1.1, skill_level: "中级" },

  // S02 定制化设计 - 设计团队
  { id: "P_DESIGN_01", name: "赵建国", role: "设计总监", department: "设计部", hourly_rate: 600, efficiency: 1.4, skill_level: "专家" },
  { id: "P_DESIGN_02", name: "孙丽", role: "结构工程师", department: "设计部", hourly_rate: 500, efficiency: 1.3, skill_level: "高级" },
  { id: "P_DESIGN_03", name: "周强", role: "机械工程师", department: "设计部", hourly_rate: 480, efficiency: 1.2, skill_level: "高级" },
  { id: "P_DESIGN_04", name: "吴芳", role: "CAD绘图员", department: "设计部", hourly_rate: 300, efficiency: 1.0, skill_level: "中级" },
  { id: "P_DESIGN_05", name: "郑华", role: "CAE分析师", department: "设计部", hourly_rate: 550, efficiency: 1.3, skill_level: "高级" },

  // S03 非标工艺规划 - 工艺团队
  { id: "P_PROC_01", name: "杨勇", role: "工艺总监", department: "工艺部", hourly_rate: 550, efficiency: 1.3, skill_level: "专家" },
  { id: "P_PROC_02", name: "朱琳", role: "焊接工艺师", department: "工艺部", hourly_rate: 480, efficiency: 1.2, skill_level: "高级" },
  { id: "P_PROC_03", name: "徐鹏", role: "机加工艺师", department: "工艺部", hourly_rate: 450, efficiency: 1.2, skill_level: "高级" },
  { id: "P_PROC_04", name: "马云", role: "装配工艺师", department: "工艺部", hourly_rate: 420, efficiency: 1.1, skill_level: "中级" },

  // S04 采购
  { id: "P_PROCURE_01", name: "林峰", role: "采购总监", department: "采购部", hourly_rate: 450, efficiency: 1.2, skill_level: "高级" },
  { id: "P_PROCURE_02", name: "何静", role: "采购经理", department: "采购部", hourly_rate: 380, efficiency: 1.1, skill_level: "中级" },
  { id: "P_PROCURE_03", name: "罗刚", role: "供应商管理", department: "采购部", hourly_rate: 350, efficiency: 1.0, skill_level: "中级" },

  // S05 铆焊组对 - 焊接团队（核心）
  { id: "P_WELD_01", name: "高志强", role: "高级焊工", department: "制造部", hourly_rate: 450, efficiency: 1.4, skill_level: "高级" },
  { id: "P_WELD_02", name: "谢军", role: "高级焊工", department: "制造部", hourly_rate: 450, efficiency: 1.4, skill_level: "高级" },
  { id: "P_WELD_03", name: "马东", role: "高级焊工", department: "制造部", hourly_rate: 450, efficiency: 1.3, skill_level: "高级" },
  { id: "P_WELD_04", name: "胡杨", role: "中级焊工", department: "制造部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },
  { id: "P_WELD_05", name: "郭明", role: "中级焊工", department: "制造部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },
  { id: "P_WELD_06", name: "梁伟", role: "初级焊工", department: "制造部", hourly_rate: 320, efficiency: 1.0, skill_level: "初级" },
  { id: "P_FIT_01", name: "宋强", role: "铆工", department: "制造部", hourly_rate: 350, efficiency: 1.2, skill_level: "中级" },
  { id: "P_FIT_02", name: "唐丽", role: "组对工", department: "制造部", hourly_rate: 320, efficiency: 1.1, skill_level: "中级" },

  // S06 机加工
  { id: "P_CNC_01", name: "韩冰", role: "数控编程师", department: "机加部", hourly_rate: 480, efficiency: 1.3, skill_level: "高级" },
  { id: "P_CNC_02", name: "冯磊", role: "CNC操作工", department: "机加部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },
  { id: "P_CNC_03", name: "董洋", role: "CNC操作工", department: "机加部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },
  { id: "P_CNC_04", name: "曾洁", role: "车工", department: "机加部", hourly_rate: 350, efficiency: 1.1, skill_level: "中级" },

  // S07 总装试压
  { id: "P_ASSY_01", name: "蒋文", role: "装配组长", department: "装配部", hourly_rate: 420, efficiency: 1.3, skill_level: "高级" },
  { id: "P_ASSY_02", name: "沈刚", role: "装配钳工", department: "装配部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },
  { id: "P_ASSY_03", name: "韦伟", role: "装配钳工", department: "装配部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },
  { id: "P_ASSY_04", name: "秦磊", role: "电气装配工", department: "装配部", hourly_rate: 400, efficiency: 1.2, skill_level: "中级" },
  { id: "P_TEST_01", name: "姜涛", role: "试压工程师", department: "质检部", hourly_rate: 450, efficiency: 1.3, skill_level: "高级" },

  // S08 检测认证
  { id: "P_INS_01", name: "范明", role: "质检经理", department: "质检部", hourly_rate: 500, efficiency: 1.3, skill_level: "高级" },
  { id: "P_INS_02", name: "方华", role: "NDT检测员", department: "质检部", hourly_rate: 420, efficiency: 1.2, skill_level: "高级" },
  { id: "P_INS_03", name: "袁林", role: "尺寸检测员", department: "质检部", hourly_rate: 350, efficiency: 1.1, skill_level: "中级" },
  { id: "P_INS_04", name: "任勇", role: "性能测试员", department: "质检部", hourly_rate: 380, efficiency: 1.2, skill_level: "中级" },

  // S09 现场安装
  { id: "P_FIELD_01", name: "潘峰", role: "项目经理", department: "工程部", hourly_rate: 550, efficiency: 1.3, skill_level: "高级" },
  { id: "P_FIELD_02", name: "于洋", role: "现场工程师", department: "工程部", hourly_rate: 480, efficiency: 1.2, skill_level: "高级" },
  { id: "P_FIELD_03", name: "董强", role: "安装工", department: "工程部", hourly_rate: 380, efficiency: 1.1, skill_level: "中级" },
  { id: "P_FIELD_04", name: "余伟", role: "安装工", department: "工程部", hourly_rate: 380, efficiency: 1.1, skill_level: "中级" },
  { id: "P_FIELD_05", name: "孔杰", role: "调试工程师", department: "工程部", hourly_rate: 450, efficiency: 1.2, skill_level: "高级" },

  // S10 财务
  { id: "P_FIN_01", name: "白静", role: "财务经理", department: "财务部", hourly_rate: 450, efficiency: 1.2, skill_level: "高级" },
  { id: "P_FIN_02", name: "龙洋", role: "成本会计", department: "财务部", hourly_rate: 380, efficiency: 1.1, skill_level: "中级" },
  { id: "P_FIN_03", name: "毛丽", role: "出纳", department: "财务部", hourly_rate: 320, efficiency: 1.0, skill_level: "初级" }
];

// ============ 完整的设备清单 ============
export const EQUIPMENT_LIST = [
  // 焊接设备
  { id: "EQ_WELD_01", name: "自动焊接机器人工作站", type: "焊接设备", power_kw: 35, depreciation_per_hour: 280, energy_cost_per_hour: 28, capacity: "10m/h", manufacturer: "ABB" },
  { id: "EQ_WELD_02", name: "埋弧焊机 MZ-1000", type: "焊接设备", power_kw: 45, depreciation_per_hour: 120, energy_cost_per_hour: 36, capacity: "15m/h", manufacturer: "成都华远" },
  { id: "EQ_WELD_03", name: "手工电弧焊机 ZX7-400", type: "焊接设备", power_kw: 18, depreciation_per_hour: 45, energy_cost_per_hour: 14.4, capacity: "标准", manufacturer: "深圳瑞凌" },
  { id: "EQ_WELD_04", name: "氩弧焊机 WS-400", type: "焊接设备", power_kw: 15, depreciation_per_hour: 55, energy_cost_per_hour: 12, capacity: "精密", manufacturer: "上海通用" },
  { id: "EQ_WELD_05", name: "焊条烘干箱", type: "焊接辅助", power_kw: 5, depreciation_per_hour: 12, energy_cost_per_hour: 4, capacity: "150kg", manufacturer: "国产" },
  { id: "EQ_WELD_06", name: "焊接烟尘净化器", type: "环保设备", power_kw: 7.5, depreciation_per_hour: 25, energy_cost_per_hour: 6, capacity: "5000m³/h", manufacturer: "南京远大" },
  { id: "EQ_WELD_07", name: "焊接变位机 5T", type: "焊接辅助", power_kw: 3, depreciation_per_hour: 35, energy_cost_per_hour: 2.4, capacity: "5吨", manufacturer: "国产" },

  // 机加设备
  { id: "EQ_CNC_01", name: "五轴联动加工中心", type: "机加设备", power_kw: 55, depreciation_per_hour: 380, energy_cost_per_hour: 44, capacity: "2000×1000mm", manufacturer: "德玛吉" },
  { id: "EQ_CNC_02", name: "数控龙门铣床", type: "机加设备", power_kw: 45, depreciation_per_hour: 280, energy_cost_per_hour: 36, capacity: "3000×1500mm", manufacturer: "海天精工" },
  { id: "EQ_CNC_03", name: "数控车床 CK6140", type: "机加设备", power_kw: 22, depreciation_per_hour: 120, energy_cost_per_hour: 17.6, capacity: "Φ400×1000mm", manufacturer: "沈阳机床" },
  { id: "EQ_CNC_04", name: "数控车床 CK6150", type: "机加设备", power_kw: 30, depreciation_per_hour: 150, energy_cost_per_hour: 24, capacity: "Φ500×1500mm", manufacturer: "沈阳机床" },
  { id: "EQ_CNC_05", name: "钻床 Z3050", type: "机加设备", power_kw: 5.5, depreciation_per_hour: 35, energy_cost_per_hour: 4.4, capacity: "Φ50mm", manufacturer: "中捷" },
  { id: "EQ_CNC_06", name: "平面磨床 M7130", type: "机加设备", power_kw: 15, depreciation_per_hour: 85, energy_cost_per_hour: 12, capacity: "1000×300mm", manufacturer: "杭州机床" },

  // 起重运输
  { id: "EQ_CRANE_01", name: "桥式起重机 32T", type: "起重设备", power_kw: 75, depreciation_per_hour: 180, energy_cost_per_hour: 60, capacity: "32吨", manufacturer: "大连重工" },
  { id: "EQ_CRANE_02", name: "桥式起重机 20T", type: "起重设备", power_kw: 55, depreciation_per_hour: 120, energy_cost_per_hour: 44, capacity: "20吨", manufacturer: "大连重工" },
  { id: "EQ_CRANE_03", name: "桥式起重机 10T", type: "起重设备", power_kw: 37, depreciation_per_hour: 80, energy_cost_per_hour: 29.6, capacity: "10吨", manufacturer: "大连重工" },
  { id: "EQ_CRANE_04", name: "移动式龙门吊 5T", type: "起重设备", power_kw: 15, depreciation_per_hour: 65, energy_cost_per_hour: 12, capacity: "5吨", manufacturer: "国产" },
  { id: "EQ_FORK_01", name: "叉车 3T", type: "运输设备", power_kw: 45, depreciation_per_hour: 35, energy_cost_per_hour: 36, capacity: "3吨", manufacturer: "合力" },

  // 检测设备
  { id: "EQ_NDT_01", name: "X射线探伤机 XXG-3005", type: "检测设备", power_kw: 8, depreciation_per_hour: 150, energy_cost_per_hour: 6.4, capacity: "300kV", manufacturer: "丹东奥龙" },
  { id: "EQ_NDT_02", name: "超声波探伤仪", type: "检测设备", power_kw: 0.1, depreciation_per_hour: 45, energy_cost_per_hour: 0.08, capacity: "数字式", manufacturer: "汕头超声" },
  { id: "EQ_NDT_03", name: "磁粉探伤机", type: "检测设备", power_kw: 5, depreciation_per_hour: 55, energy_cost_per_hour: 4, capacity: "移动式", manufacturer: "国产" },
  { id: "EQ_MEAS_01", name: "三坐标测量机", type: "检测设备", power_kw: 2, depreciation_per_hour: 220, energy_cost_per_hour: 1.6, capacity: "2000×1500×1000", manufacturer: "海克斯康" },
  { id: "EQ_MEAS_02", name: "激光跟踪仪", type: "检测设备", power_kw: 0.5, depreciation_per_hour: 180, energy_cost_per_hour: 0.4, capacity: "高精度", manufacturer: "莱卡" },

  // 试压设备
  { id: "EQ_TEST_01", name: "水压试验泵", type: "试压设备", power_kw: 15, depreciation_per_hour: 85, energy_cost_per_hour: 12, capacity: "100MPa", manufacturer: "国产" },
  { id: "EQ_TEST_02", name: "气压试验设备", type: "试压设备", power_kw: 11, depreciation_per_hour: 65, energy_cost_per_hour: 8.8, capacity: "10MPa", manufacturer: "国产" },
  { id: "EQ_TEST_03", name: "气密性检测仪", type: "检测设备", power_kw: 3, depreciation_per_hour: 45, energy_cost_per_hour: 2.4, capacity: "高精度", manufacturer: "日本COSMO" },

  // 软件系统
  { id: "EQ_SW_01", name: "CAD工作站", type: "软件系统", power_kw: 0.8, depreciation_per_hour: 25, energy_cost_per_hour: 0.64, capacity: "高性能", manufacturer: "DELL" },
  { id: "EQ_SW_02", name: "CAE仿真服务器", type: "软件系统", power_kw: 2, depreciation_per_hour: 85, energy_cost_per_hour: 1.6, capacity: "集群", manufacturer: "HP" },
  { id: "EQ_SW_03", name: "ERP系统服务器", type: "软件系统", power_kw: 3, depreciation_per_hour: 120, energy_cost_per_hour: 2.4, capacity: "企业级", manufacturer: "SAP" }
];

// ============ 完整的材料清单 ============
export const MATERIAL_LIST = [
  // 金属材料
  { id: "MAT_ST_01", name: "Q345R压力容器钢板", unit_price: 5200, unit: "吨", loss_rate: 0.08, supplier: "宝钢" },
  { id: "MAT_ST_02", name: "Q235B碳钢钢板", unit_price: 3800, unit: "吨", loss_rate: 0.06, supplier: "鞍钢" },
  { id: "MAT_ST_03", name: "304不锈钢板", unit_price: 18500, unit: "吨", loss_rate: 0.05, supplier: "太钢" },
  { id: "MAT_ST_04", name: "316L不锈钢板", unit_price: 28000, unit: "吨", loss_rate: 0.05, supplier: "太钢" },
  { id: "MAT_ST_05", name: "2205双相不锈钢", unit_price: 45000, unit: "吨", loss_rate: 0.04, supplier: "进口" },
  { id: "MAT_ST_06", name: "15CrMo合金钢板", unit_price: 8500, unit: "吨", loss_rate: 0.07, supplier: "舞钢" },
  { id: "MAT_ST_07", name: "钛合金板 TA2", unit_price: 120000, unit: "吨", loss_rate: 0.03, supplier: "宝钛" },
  { id: "MAT_ST_08", name: "碳钢圆钢 Φ20-Φ100", unit_price: 3600, unit: "吨", loss_rate: 0.04, supplier: "首钢" },
  { id: "MAT_ST_09", name: "不锈钢圆钢 304", unit_price: 17500, unit: "吨", loss_rate: 0.04, supplier: "永兴特钢" },

  // 焊接材料
  { id: "MAT_WELD_01", name: "J507焊条 Φ3.2", unit_price: 12, unit: "kg", loss_rate: 0.15, supplier: "大西洋" },
  { id: "MAT_WELD_02", name: "J507焊条 Φ4.0", unit_price: 11.5, unit: "kg", loss_rate: 0.15, supplier: "大西洋" },
  { id: "MAT_WELD_03", name: "ER50-6焊丝 Φ1.2", unit_price: 9.8, unit: "kg", loss_rate: 0.08, supplier: "金桥" },
  { id: "MAT_WELD_04", name: "ER308L不锈钢焊丝", unit_price: 85, unit: "kg", loss_rate: 0.08, supplier: "安泰" },
  { id: "MAT_WELD_05", name: "ER316L不锈钢焊丝", unit_price: 120, unit: "kg", loss_rate: 0.08, supplier: "安泰" },
  { id: "MAT_WELD_06", name: "埋弧焊丝 H08MnA", unit_price: 7.5, unit: "kg", loss_rate: 0.05, supplier: "金桥" },
  { id: "MAT_WELD_07", name: "埋弧焊剂 HJ431", unit_price: 3.2, unit: "kg", loss_rate: 0.2, supplier: "洛阳牡丹" },
  { id: "MAT_WELD_08", name: "氩气 99.999%", unit_price: 45, unit: "瓶", loss_rate: 0.05, supplier: "林德气体" },
  { id: "MAT_WELD_09", name: "二氧化碳气", unit_price: 28, unit: "瓶", loss_rate: 0.05, supplier: "林德气体" },
  { id: "MAT_WELD_10", name: "氧气 工业级", unit_price: 22, unit: "瓶", loss_rate: 0.05, supplier: "林德气体" },
  { id: "MAT_WELD_11", name: "乙炔气", unit_price: 85, unit: "瓶", loss_rate: 0.05, supplier: "林德气体" },

  // 配件辅料
  { id: "MAT_FAST_01", name: "高强度螺栓 M16-M36", unit_price: 15, unit: "套", loss_rate: 0.03, supplier: "晋亿实业" },
  { id: "MAT_FAST_02", name: "不锈钢螺栓 304", unit_price: 28, unit: "套", loss_rate: 0.03, supplier: "东明" },
  { id: "MAT_FAST_03", name: "垫片 金属缠绕垫", unit_price: 45, unit: "片", loss_rate: 0.05, supplier: "慈溪密封" },
  { id: "MAT_SEAL_01", name: "O型圈 氟橡胶", unit_price: 12, unit: "个", loss_rate: 0.05, supplier: "日本NOK" },
  { id: "MAT_SEAL_02", name: "机械密封", unit_price: 850, unit: "套", loss_rate: 0.02, supplier: "博格曼" },
  { id: "MAT_PAINT_01", name: "环氧底漆", unit_price: 32, unit: "kg", loss_rate: 0.1, supplier: "PPG" },
  { id: "MAT_PAINT_02", name: "聚氨酯面漆", unit_price: 45, unit: "kg", loss_rate: 0.1, supplier: "PPG" },
  { id: "MAT_INS_01", name: "保温棉 硅酸铝", unit_price: 1800, unit: "m³", loss_rate: 0.15, supplier: "鲁阳" }
];

// 10个工序的Node Pack - 完整版
export const mockTaskNodePacks: TaskNodePack[] = [
  // S01 需求对接
  {
    task_id: "S01",
    task_name: "需求对接",
    node_pack: [
      { type: "man", nodes: [
        { id: "s01_m1", type: "man", name: "王伟-销售总监", count: 1, hourly_rate: 500, efficiency: 1.3, work_hours: 20 },
        { id: "s01_m2", type: "man", name: "李明-销售经理", count: 1, hourly_rate: 400, efficiency: 1.2, work_hours: 40 },
        { id: "s01_m3", type: "man", name: "刘工-技术工程师", count: 1, hourly_rate: 450, efficiency: 1.2, work_hours: 30 },
        { id: "s01_m4", type: "man", name: "陈工-售前支持", count: 1, hourly_rate: 400, efficiency: 1.1, work_hours: 25 },
        { id: "s01_m5", type: "man", name: "张敏-销售工程师", count: 1, hourly_rate: 350, efficiency: 1.1, work_hours: 35 }
      ]},
      { type: "machine", nodes: [
        { id: "s01_mc1", type: "machine", name: "CAD工作站", power_kw: 0.8, duration: 40, depreciation_per_hour: 25, energy_cost_per_hour: 0.64 }
      ]},
      { type: "material", nodes: [
        { id: "s01_mat1", type: "material", name: "客户需求文档", quantity: 5, unit_price: 50, loss_rate: 0 },
        { id: "s01_mat2", type: "material", name: "技术方案模板", quantity: 3, unit_price: 100, loss_rate: 0 }
      ]},
      { type: "method", nodes: [{ id: "s01_mth1", type: "method", name: "客户需求调研流程", standard_time: 40, constraints: ["客户现场访谈", "需求收集", "可行性分析", "方案初稿"] }] },
      { type: "environment", nodes: [{ id: "s01_env1", type: "environment", name: "会议室/客户现场", temperature: 22, humidity: 50, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [{ id: "s01_ms1", type: "measurement", name: "需求确认书签署", cost: 0, mandatory: true }] }
    ]
  },
  // S02 定制化设计
  {
    task_id: "S02",
    task_name: "定制化设计",
    node_pack: [
      { type: "man", nodes: [
        { id: "s02_m1", type: "man", name: "赵建国-设计总监", count: 1, hourly_rate: 600, efficiency: 1.4, work_hours: 60 },
        { id: "s02_m2", type: "man", name: "孙丽-结构工程师", count: 2, hourly_rate: 500, efficiency: 1.3, work_hours: 240 },
        { id: "s02_m3", type: "man", name: "周强-机械工程师", count: 2, hourly_rate: 480, efficiency: 1.2, work_hours: 240 },
        { id: "s02_m4", type: "man", name: "郑华-CAE分析师", count: 1, hourly_rate: 550, efficiency: 1.3, work_hours: 80 },
        { id: "s02_m5", type: "man", name: "吴芳-CAD绘图员", count: 3, hourly_rate: 300, efficiency: 1.0, work_hours: 360 }
      ]},
      { type: "machine", nodes: [
        { id: "s02_mc1", type: "machine", name: "CAD工作站", power_kw: 0.8, duration: 360, depreciation_per_hour: 25, energy_cost_per_hour: 0.64 },
        { id: "s02_mc2", type: "machine", name: "CAE仿真服务器", power_kw: 2, duration: 80, depreciation_per_hour: 85, energy_cost_per_hour: 1.6 }
      ]},
      { type: "material", nodes: [
        { id: "s02_mat1", type: "material", name: "设计标准库", quantity: 1, unit_price: 5000, loss_rate: 0 },
        { id: "s02_mat2", type: "material", name: "材料样本", quantity: 10, unit_price: 200, loss_rate: 0 }
      ]},
      { type: "method", nodes: [{ id: "s02_mth1", type: "method", name: "非标设备设计流程", standard_time: 360, constraints: ["概念设计", "详细设计", "强度校核", "设计评审", "图纸输出"] }] },
      { type: "environment", nodes: [{ id: "s02_env1", type: "environment", name: "设计办公室", temperature: 22, humidity: 50, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [{ id: "s02_ms1", type: "measurement", name: "设计评审会议", cost: 5000, mandatory: true }] }
    ]
  },
  // S03 非标工艺规划
  {
    task_id: "S03",
    task_name: "非标工艺规划",
    node_pack: [
      { type: "man", nodes: [
        { id: "s03_m1", type: "man", name: "杨勇-工艺总监", count: 1, hourly_rate: 550, efficiency: 1.3, work_hours: 40 },
        { id: "s03_m2", type: "man", name: "朱琳-焊接工艺师", count: 1, hourly_rate: 480, efficiency: 1.2, work_hours: 120 },
        { id: "s03_m3", type: "man", name: "徐鹏-机加工艺师", count: 1, hourly_rate: 450, efficiency: 1.2, work_hours: 100 },
        { id: "s03_m4", type: "man", name: "马云-装配工艺师", count: 1, hourly_rate: 420, efficiency: 1.1, work_hours: 80 }
      ]},
      { type: "machine", nodes: [
        { id: "s03_mc1", type: "machine", name: "CAD工作站", power_kw: 0.8, duration: 120, depreciation_per_hour: 25, energy_cost_per_hour: 0.64 },
        { id: "s03_mc2", type: "machine", name: "ERP系统服务器", power_kw: 3, duration: 80, depreciation_per_hour: 120, energy_cost_per_hour: 2.4 }
      ]},
      { type: "material", nodes: [
        { id: "s03_mat1", type: "material", name: "历史工艺案例", quantity: 1, unit_price: 2000, loss_rate: 0 },
        { id: "s03_mat2", type: "material", name: "WPS焊接工艺评定", quantity: 5, unit_price: 800, loss_rate: 0 }
      ]},
      { type: "method", nodes: [{ id: "s03_mth1", type: "method", name: "工艺路线设计流程", standard_time: 200, constraints: ["工艺分析", "路线规划", "工装设计", "工时定额", "工艺评审"] }] },
      { type: "environment", nodes: [{ id: "s03_env1", type: "environment", name: "工艺办公室", temperature: 22, humidity: 50, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [{ id: "s03_ms1", type: "measurement", name: "工艺评审", cost: 3000, mandatory: true }] }
    ]
  },
  // S04 定制化物料采购
  {
    task_id: "S04",
    task_name: "定制化物料采购",
    node_pack: [
      { type: "man", nodes: [
        { id: "s04_m1", type: "man", name: "林峰-采购总监", count: 1, hourly_rate: 450, efficiency: 1.2, work_hours: 60 },
        { id: "s04_m2", type: "man", name: "何静-采购经理", count: 2, hourly_rate: 380, efficiency: 1.1, work_hours: 320 },
        { id: "s04_m3", type: "man", name: "罗刚-供应商管理", count: 1, hourly_rate: 350, efficiency: 1.0, work_hours: 160 }
      ]},
      { type: "machine", nodes: [
        { id: "s04_mc1", type: "machine", name: "ERP系统服务器", power_kw: 3, duration: 320, depreciation_per_hour: 120, energy_cost_per_hour: 2.4 }
      ]},
      { type: "material", nodes: [
        { id: "s04_mat1", type: "material", name: "Q345R压力容器钢板", quantity: 50, unit_price: 5200, loss_rate: 0.08 },
        { id: "s04_mat2", type: "material", name: "304不锈钢板", quantity: 5, unit_price: 18500, loss_rate: 0.05 },
        { id: "s04_mat3", type: "material", name: "15CrMo合金钢板", quantity: 8, unit_price: 8500, loss_rate: 0.07 },
        { id: "s04_mat4", type: "material", name: "碳钢圆钢", quantity: 3, unit_price: 3600, loss_rate: 0.04 },
        { id: "s04_mat5", type: "material", name: "J507焊条", quantity: 800, unit_price: 11.8, loss_rate: 0.15 },
        { id: "s04_mat6", type: "material", name: "ER50-6焊丝", quantity: 500, unit_price: 9.8, loss_rate: 0.08 },
        { id: "s04_mat7", type: "material", name: "高强度螺栓", quantity: 200, unit_price: 15, loss_rate: 0.03 },
        { id: "s04_mat8", type: "material", name: "金属缠绕垫", quantity: 100, unit_price: 45, loss_rate: 0.05 }
      ]},
      { type: "method", nodes: [{ id: "s04_mth1", type: "method", name: "非标采购流程", standard_time: 320, constraints: ["供应商寻源", "询价比价", "合同签订", "进度跟踪", "到货检验"] }] },
      { type: "environment", nodes: [{ id: "s04_env1", type: "environment", name: "仓库/办公室", temperature: 20, humidity: 55, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [
        { id: "s04_ms1", type: "measurement", name: "材料复验", cost: 8000, mandatory: true },
        { id: "s04_ms2", type: "measurement", name: "质保书审核", cost: 0, mandatory: true }
      ]}
    ]
  },
  // S05 铆焊组对（核心工序）
  {
    task_id: "S05",
    task_name: "铆焊组对",
    node_pack: [
      { type: "man", nodes: [
        { id: "s05_m1", type: "man", name: "高志强-高级焊工", count: 1, hourly_rate: 450, efficiency: 1.4, work_hours: 200 },
        { id: "s05_m2", type: "man", name: "谢军-高级焊工", count: 1, hourly_rate: 450, efficiency: 1.4, work_hours: 200 },
        { id: "s05_m3", type: "man", name: "马东-高级焊工", count: 1, hourly_rate: 450, efficiency: 1.3, work_hours: 200 },
        { id: "s05_m4", type: "man", name: "胡杨-中级焊工", count: 2, hourly_rate: 380, efficiency: 1.2, work_hours: 400 },
        { id: "s05_m5", type: "man", name: "郭明-中级焊工", count: 1, hourly_rate: 380, efficiency: 1.2, work_hours: 200 },
        { id: "s05_m6", type: "man", name: "梁伟-初级焊工", count: 2, hourly_rate: 320, efficiency: 1.0, work_hours: 400 },
        { id: "s05_m7", type: "man", name: "宋强-铆工", count: 2, hourly_rate: 350, efficiency: 1.2, work_hours: 400 },
        { id: "s05_m8", type: "man", name: "唐丽-组对工", count: 2, hourly_rate: 320, efficiency: 1.1, work_hours: 400 }
      ]},
      { type: "machine", nodes: [
        { id: "s05_mc1", type: "machine", name: "自动焊接机器人工作站", power_kw: 35, duration: 200, depreciation_per_hour: 280, energy_cost_per_hour: 28 },
        { id: "s05_mc2", type: "machine", name: "埋弧焊机 MZ-1000", power_kw: 45, duration: 150, depreciation_per_hour: 120, energy_cost_per_hour: 36 },
        { id: "s05_mc3", type: "machine", name: "手工电弧焊机", power_kw: 18, duration: 400, depreciation_per_hour: 45, energy_cost_per_hour: 14.4 },
        { id: "s05_mc4", type: "machine", name: "焊接变位机 5T", power_kw: 3, duration: 300, depreciation_per_hour: 35, energy_cost_per_hour: 2.4 },
        { id: "s05_mc5", type: "machine", name: "桥式起重机 32T", power_kw: 75, duration: 100, depreciation_per_hour: 180, energy_cost_per_hour: 60 },
        { id: "s05_mc6", type: "machine", name: "焊接烟尘净化器", power_kw: 7.5, duration: 600, depreciation_per_hour: 25, energy_cost_per_hour: 6 }
      ]},
      { type: "material", nodes: [
        { id: "s05_mat1", type: "material", name: "J507焊条 Φ4.0", quantity: 500, unit_price: 11.5, loss_rate: 0.15 },
        { id: "s05_mat2", type: "material", name: "ER50-6焊丝", quantity: 300, unit_price: 9.8, loss_rate: 0.08 },
        { id: "s05_mat3", type: "material", name: "埋弧焊丝 H08MnA", quantity: 200, unit_price: 7.5, loss_rate: 0.05 },
        { id: "s05_mat4", type: "material", name: "氩气 99.999%", quantity: 30, unit_price: 45, loss_rate: 0.05 },
        { id: "s05_mat5", type: "material", name: "氧气 工业级", quantity: 20, unit_price: 22, loss_rate: 0.05 },
        { id: "s05_mat6", type: "material", name: "乙炔气", quantity: 15, unit_price: 85, loss_rate: 0.05 }
      ]},
      { type: "method", nodes: [{ id: "s05_mth1", type: "method", name: "WPS焊接工艺规程", standard_time: 600, constraints: ["坡口准备", "组对定位", "预热", "多层多道焊", "层间温度控制", "焊后热处理"] }] },
      { type: "environment", nodes: [{ id: "s05_env1", type: "environment", name: "恒温焊接车间", temperature: 25, humidity: 60, impact_factor: 0.95 }] },
      { type: "measurement", nodes: [
        { id: "s05_ms1", type: "measurement", name: "X射线探伤 RT", cost: 15000, mandatory: true },
        { id: "s05_ms2", type: "measurement", name: "超声波探伤 UT", cost: 8000, mandatory: true },
        { id: "s05_ms3", type: "measurement", name: "磁粉探伤 MT", cost: 3000, mandatory: false },
        { id: "s05_ms4", type: "measurement", name: "外观检查 VT", cost: 1000, mandatory: true }
      ]}
    ]
  },
  // S06 定制化机加工序
  {
    task_id: "S06",
    task_name: "定制化机加工序",
    node_pack: [
      { type: "man", nodes: [
        { id: "s06_m1", type: "man", name: "韩冰-数控编程师", count: 1, hourly_rate: 480, efficiency: 1.3, work_hours: 72 },
        { id: "s06_m2", type: "man", name: "冯磊-CNC操作工", count: 2, hourly_rate: 380, efficiency: 1.2, work_hours: 288 },
        { id: "s06_m3", type: "man", name: "董洋-CNC操作工", count: 1, hourly_rate: 380, efficiency: 1.2, work_hours: 288 },
        { id: "s06_m4", type: "man", name: "曾洁-车工", count: 1, hourly_rate: 350, efficiency: 1.1, work_hours: 144 }
      ]},
      { type: "machine", nodes: [
        { id: "s06_mc1", type: "machine", name: "五轴联动加工中心", power_kw: 55, duration: 144, depreciation_per_hour: 380, energy_cost_per_hour: 44 },
        { id: "s06_mc2", type: "machine", name: "数控龙门铣床", power_kw: 45, duration: 180, depreciation_per_hour: 280, energy_cost_per_hour: 36 },
        { id: "s06_mc3", type: "machine", name: "数控车床 CK6150", power_kw: 30, duration: 144, depreciation_per_hour: 150, energy_cost_per_hour: 24 },
        { id: "s06_mc4", type: "machine", name: "钻床 Z3050", power_kw: 5.5, duration: 80, depreciation_per_hour: 35, energy_cost_per_hour: 4.4 },
        { id: "s06_mc5", type: "machine", name: "平面磨床 M7130", power_kw: 15, duration: 48, depreciation_per_hour: 85, energy_cost_per_hour: 12 }
      ]},
      { type: "material", nodes: [
        { id: "s06_mat1", type: "material", name: "切削液", quantity: 50, unit_price: 25, loss_rate: 0.2 },
        { id: "s06_mat2", type: "material", name: "数控刀片", quantity: 30, unit_price: 85, loss_rate: 0.1 }
      ]},
      { type: "method", nodes: [{ id: "s06_mth1", type: "method", name: "数控加工工艺规程", standard_time: 288, constraints: ["程序编制", "工件装夹", "粗加工", "半精加工", "精加工", "尺寸检测"] }] },
      { type: "environment", nodes: [{ id: "s06_env1", type: "environment", name: "恒温机加车间", temperature: 22, humidity: 50, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [
        { id: "s06_ms1", type: "measurement", name: "三坐标测量", cost: 5000, mandatory: true },
        { id: "s06_ms2", type: "measurement", name: "粗糙度检测", cost: 800, mandatory: true }
      ]}
    ]
  },
  // S07 总装试压
  {
    task_id: "S07",
    task_name: "总装试压",
    node_pack: [
      { type: "man", nodes: [
        { id: "s07_m1", type: "man", name: "蒋文-装配组长", count: 1, hourly_rate: 420, efficiency: 1.3, work_hours: 120 },
        { id: "s07_m2", type: "man", name: "沈刚-装配钳工", count: 2, hourly_rate: 380, efficiency: 1.2, work_hours: 240 },
        { id: "s07_m3", type: "man", name: "韦伟-装配钳工", count: 1, hourly_rate: 380, efficiency: 1.2, work_hours: 240 },
        { id: "s07_m4", type: "man", name: "秦磊-电气装配工", count: 1, hourly_rate: 400, efficiency: 1.2, work_hours: 80 },
        { id: "s07_m5", type: "man", name: "姜涛-试压工程师", count: 1, hourly_rate: 450, efficiency: 1.3, work_hours: 40 }
      ]},
      { type: "machine", nodes: [
        { id: "s07_mc1", type: "machine", name: "桥式起重机 20T", power_kw: 55, duration: 120, depreciation_per_hour: 120, energy_cost_per_hour: 44 },
        { id: "s07_mc2", type: "machine", name: "水压试验泵", power_kw: 15, duration: 30, depreciation_per_hour: 85, energy_cost_per_hour: 12 },
        { id: "s07_mc3", type: "machine", name: "气压试验设备", power_kw: 11, duration: 20, depreciation_per_hour: 65, energy_cost_per_hour: 8.8 },
        { id: "s07_mc4", type: "machine", name: "气密性检测仪", power_kw: 3, duration: 40, depreciation_per_hour: 45, energy_cost_per_hour: 2.4 },
        { id: "s07_mc5", type: "machine", name: "叉车 3T", power_kw: 45, duration: 60, depreciation_per_hour: 35, energy_cost_per_hour: 36 }
      ]},
      { type: "material", nodes: [
        { id: "s07_mat1", type: "material", name: "高强度螺栓 M16-M36", quantity: 200, unit_price: 15, loss_rate: 0.03 },
        { id: "s07_mat2", type: "material", name: "金属缠绕垫", quantity: 80, unit_price: 45, loss_rate: 0.05 },
        { id: "s07_mat3", type: "material", name: "O型圈 氟橡胶", quantity: 50, unit_price: 12, loss_rate: 0.05 },
        { id: "s07_mat4", type: "material", name: "机械密封", quantity: 10, unit_price: 850, loss_rate: 0.02 },
        { id: "s07_mat5", type: "material", name: "液压油", quantity: 200, unit_price: 18, loss_rate: 0.1 }
      ]},
      { type: "method", nodes: [{ id: "s07_mth1", type: "method", name: "压力容器装配试压规程", standard_time: 240, constraints: ["零部件清洗", "机械组装", "扭矩校验", "电气接线", "系统联调", "水压试验", "气密性试验"] }] },
      { type: "environment", nodes: [{ id: "s07_env1", type: "environment", name: "装配车间", temperature: 22, humidity: 55, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [
        { id: "s07_ms1", type: "measurement", name: "水压试验", cost: 8000, mandatory: true },
        { id: "s07_ms2", type: "measurement", name: "气密性试验", cost: 5000, mandatory: true },
        { id: "s07_ms3", type: "measurement", name: "扭矩校验", cost: 2000, mandatory: true }
      ]}
    ]
  },
  // S08 定制化检测认证
  {
    task_id: "S08",
    task_name: "定制化检测认证",
    node_pack: [
      { type: "man", nodes: [
        { id: "s08_m1", type: "man", name: "范明-质检经理", count: 1, hourly_rate: 500, efficiency: 1.3, work_hours: 48 },
        { id: "s08_m2", type: "man", name: "方华-NDT检测员", count: 2, hourly_rate: 420, efficiency: 1.2, work_hours: 96 },
        { id: "s08_m3", type: "man", name: "袁林-尺寸检测员", count: 1, hourly_rate: 350, efficiency: 1.1, work_hours: 72 },
        { id: "s08_m4", type: "man", name: "任勇-性能测试员", count: 1, hourly_rate: 380, efficiency: 1.2, work_hours: 64 }
      ]},
      { type: "machine", nodes: [
        { id: "s08_mc1", type: "machine", name: "X射线探伤机 XXG-3005", power_kw: 8, duration: 48, depreciation_per_hour: 150, energy_cost_per_hour: 6.4 },
        { id: "s08_mc2", type: "machine", name: "超声波探伤仪", power_kw: 0.1, duration: 64, depreciation_per_hour: 45, energy_cost_per_hour: 0.08 },
        { id: "s08_mc3", type: "machine", name: "磁粉探伤机", power_kw: 5, duration: 32, depreciation_per_hour: 55, energy_cost_per_hour: 4 },
        { id: "s08_mc4", type: "machine", name: "三坐标测量机", power_kw: 2, duration: 48, depreciation_per_hour: 220, energy_cost_per_hour: 1.6 },
        { id: "s08_mc5", type: "machine", name: "激光跟踪仪", power_kw: 0.5, duration: 24, depreciation_per_hour: 180, energy_cost_per_hour: 0.4 }
      ]},
      { type: "material", nodes: [
        { id: "s08_mat1", type: "material", name: "X射线胶片", quantity: 100, unit_price: 35, loss_rate: 0.1 },
        { id: "s08_mat2", type: "material", name: "显影液", quantity: 20, unit_price: 85, loss_rate: 0.2 },
        { id: "s08_mat3", type: "material", name: "磁粉", quantity: 10, unit_price: 120, loss_rate: 0.15 }
      ]},
      { type: "method", nodes: [{ id: "s08_mth1", type: "method", name: "压力容器检测认证流程", standard_time: 192, constraints: ["无损检测RT/UT/MT/PT", "尺寸检测", "压力测试", "性能测试", "第三方见证", "认证报告"] }] },
      { type: "environment", nodes: [{ id: "s08_env1", type: "environment", name: "恒温检测室", temperature: 20, humidity: 45, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [
        { id: "s08_ms1", type: "measurement", name: "第三方检测报告", cost: 25000, mandatory: true },
        { id: "s08_ms2", type: "measurement", name: "压力容器合格证", cost: 5000, mandatory: true },
        { id: "s08_ms3", type: "measurement", name: "竣工资料", cost: 3000, mandatory: true }
      ]}
    ]
  },
  // S09 现场安装调试
  {
    task_id: "S09",
    task_name: "现场安装调试",
    node_pack: [
      { type: "man", nodes: [
        { id: "s09_m1", type: "man", name: "潘峰-项目经理", count: 1, hourly_rate: 550, efficiency: 1.3, work_hours: 160 },
        { id: "s09_m2", type: "man", name: "于洋-现场工程师", count: 1, hourly_rate: 480, efficiency: 1.2, work_hours: 320 },
        { id: "s09_m3", type: "man", name: "董强-安装工", count: 3, hourly_rate: 380, efficiency: 1.1, work_hours: 960 },
        { id: "s09_m4", type: "man", name: "余伟-安装工", count: 2, hourly_rate: 380, efficiency: 1.1, work_hours: 960 },
        { id: "s09_m5", type: "man", name: "孔杰-调试工程师", count: 1, hourly_rate: 450, efficiency: 1.2, work_hours: 120 }
      ]},
      { type: "machine", nodes: [
        { id: "s09_mc1", type: "machine", name: "移动式龙门吊 5T", power_kw: 15, duration: 80, depreciation_per_hour: 65, energy_cost_per_hour: 12 },
        { id: "s09_mc2", type: "machine", name: "叉车 3T", power_kw: 45, duration: 120, depreciation_per_hour: 35, energy_cost_per_hour: 36 },
        { id: "s09_mc3", type: "machine", name: "液压扳手", power_kw: 3, duration: 60, depreciation_per_hour: 25, energy_cost_per_hour: 2.4 },
        { id: "s09_mc4", type: "machine", name: "激光对中仪", power_kw: 0.5, duration: 40, depreciation_per_hour: 120, energy_cost_per_hour: 0.4 }
      ]},
      { type: "material", nodes: [
        { id: "s09_mat1", type: "material", name: "现场安装辅料", quantity: 1, unit_price: 15000, loss_rate: 0.1 },
        { id: "s09_mat2", type: "material", name: "管道连接件", quantity: 50, unit_price: 120, loss_rate: 0.05 },
        { id: "s09_mat3", type: "material", name: "电缆线", quantity: 200, unit_price: 45, loss_rate: 0.1 },
        { id: "s09_mat4", type: "material", name: "环氧底漆", quantity: 50, unit_price: 32, loss_rate: 0.1 },
        { id: "s09_mat5", type: "material", name: "聚氨酯面漆", quantity: 80, unit_price: 45, loss_rate: 0.1 }
      ]},
      { type: "method", nodes: [{ id: "s09_mth1", type: "method", name: "现场安装调试规程", standard_time: 320, constraints: ["基础验收", "设备就位", "管道连接", "电气接线", "单机调试", "系统联调", "带负荷试车", "客户验收"] }] },
      { type: "environment", nodes: [{ id: "s09_env1", type: "environment", name: "客户现场", temperature: 30, humidity: 70, impact_factor: 0.9 }] },
      { type: "measurement", nodes: [
        { id: "s09_ms1", type: "measurement", name: "设备安装验收", cost: 8000, mandatory: true },
        { id: "s09_ms2", type: "measurement", name: "系统性能测试", cost: 12000, mandatory: true },
        { id: "s09_ms3", type: "measurement", name: "客户验收签字", cost: 0, mandatory: true }
      ]}
    ]
  },
  // S10 回款结算
  {
    task_id: "S10",
    task_name: "回款结算",
    node_pack: [
      { type: "man", nodes: [
        { id: "s10_m1", type: "man", name: "白静-财务经理", count: 1, hourly_rate: 450, efficiency: 1.2, work_hours: 40 },
        { id: "s10_m2", type: "man", name: "龙洋-成本会计", count: 1, hourly_rate: 380, efficiency: 1.1, work_hours: 120 },
        { id: "s10_m3", type: "man", name: "毛丽-出纳", count: 1, hourly_rate: 320, efficiency: 1.0, work_hours: 80 }
      ]},
      { type: "machine", nodes: [
        { id: "s10_mc1", type: "machine", name: "ERP系统服务器", power_kw: 3, duration: 80, depreciation_per_hour: 120, energy_cost_per_hour: 2.4 },
        { id: "s10_mc2", type: "machine", name: "财务工作站", power_kw: 0.5, duration: 160, depreciation_per_hour: 15, energy_cost_per_hour: 0.4 }
      ]},
      { type: "material", nodes: [
        { id: "s10_mat1", type: "material", name: "发票", quantity: 20, unit_price: 5, loss_rate: 0 },
        { id: "s10_mat2", type: "material", name: "档案盒", quantity: 5, unit_price: 15, loss_rate: 0 }
      ]},
      { type: "method", nodes: [{ id: "s10_mth1", type: "method", name: "项目结算流程", standard_time: 160, constraints: ["成本归集", "成本核算", "发票开具", "尾款回收", "项目归档"] }] },
      { type: "environment", nodes: [{ id: "s10_env1", type: "environment", name: "财务办公室", temperature: 22, humidity: 50, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [
        { id: "s10_ms1", type: "measurement", name: "项目成本核算", cost: 0, mandatory: true },
        { id: "s10_ms2", type: "measurement", name: "财务对账", cost: 0, mandatory: true }
      ]}
    ]
  }
];

// ============ 工序模板库 ============

export interface ProcessTemplate {
  id: string;
  name: string;
  category: string;
  defaultDuration: number;
  defaultResources: string[];
  defaultRules: string[];
  subNodes: Omit<GraphNode, 'status' | 'es' | 'ef' | 'ls' | 'lf' | 'isCritical'>[];
  subEdges: GraphEdge[];
}

export const mockProcessLibrary: ProcessTemplate[] = [
  // S05 铆焊组对模板
  {
    id: "PROC_WELD_CUSTOM",
    name: "定制化铆焊组对",
    category: "制造",
    defaultDuration: 25,
    defaultResources: ["R_WELD_01", "R_WELD_02", "R_WELD_03"],
    defaultRules: ["RULE_WELD_QUALITY", "RULE_HEAVY_EQUIP_DEPREC"],
    subNodes: [
      { id: "s05_sub1", type: "task", name: "材料准备", duration: 3, resources: ["R_PREP_01"], materials: ["M_WIRE", "M_GAS"], rules: [], plannedCost: { material: 15000, labor: 5000, equipment: 2000, overhead: 1000, energy: 500, total: 23500 }, riskScore: 10 },
      { id: "s05_sub2", type: "task", name: "组对定位", duration: 5, resources: ["R_FIT_01"], materials: [], rules: [], plannedCost: { material: 0, labor: 25000, equipment: 5000, overhead: 2000, energy: 1000, total: 33000 }, riskScore: 20 },
      { id: "s05_sub3", type: "task", name: "主焊接", duration: 12, resources: ["R_WELD_01"], materials: ["M_STEEL"], rules: ["RULE_WELD_QUALITY"], plannedCost: { material: 100000, labor: 120000, equipment: 100000, overhead: 20000, energy: 20000, total: 360000 }, riskScore: 65 },
      { id: "s05_sub4", type: "task", name: "焊后处理", duration: 3, resources: ["R_HT_01"], materials: [], rules: [], plannedCost: { material: 5000, labor: 15000, equipment: 8000, overhead: 3000, energy: 15000, total: 46000 }, riskScore: 30 },
      { id: "s05_sub5", type: "task", name: "质量检查", duration: 2, resources: ["R_QC_01"], materials: [], rules: ["RULE_NDT_REQUIRED"], plannedCost: { material: 0, labor: 15000, equipment: 5000, overhead: 4000, energy: 500, total: 24500 }, riskScore: 25 }
    ],
    subEdges: [
      { from: "s05_sub1", to: "s05_sub2", type: "finish_to_start" },
      { from: "s05_sub2", to: "s05_sub3", type: "finish_to_start" },
      { from: "s05_sub3", to: "s05_sub4", type: "finish_to_start" },
      { from: "s05_sub4", to: "s05_sub5", type: "finish_to_start" }
    ]
  },
  // S07 总装试压模板
  {
    id: "PROC_ASSEMBLY_TEST",
    name: "总装试压",
    category: "装配",
    defaultDuration: 15,
    defaultResources: ["R_ASSY_01", "R_TEST_01"],
    defaultRules: ["RULE_PRESSURE_TEST", "RULE_ASSEMBLY_TORQUE"],
    subNodes: [
      { id: "s07_sub1", type: "task", name: "机械组装", duration: 8, resources: ["R_ASSY_01"], materials: ["M_FASTENERS"], rules: [], plannedCost: { material: 30000, labor: 48000, equipment: 24000, overhead: 8000, energy: 4000, total: 114000 }, riskScore: 20 },
      { id: "s07_sub2", type: "task", name: "电气接线", duration: 3, resources: ["R_ELEC_01"], materials: ["M_CABLE"], rules: ["RULE_ELEC_SAFETY"], plannedCost: { material: 15000, labor: 18000, equipment: 6000, overhead: 3000, energy: 2000, total: 44000 }, riskScore: 35 },
      { id: "s07_sub3", type: "task", name: "系统联调", duration: 2, resources: ["R_TEST_01"], materials: [], rules: [], plannedCost: { material: 2000, labor: 12000, equipment: 8000, overhead: 2000, energy: 3000, total: 27000 }, riskScore: 40 },
      { id: "s07_sub4", type: "task", name: "压力测试", duration: 2, resources: ["R_TEST_01"], materials: [], rules: ["RULE_PRESSURE_TEST"], plannedCost: { material: 3000, labor: 12000, equipment: 12000, overhead: 2000, energy: 6000, total: 35000 }, riskScore: 60 }
    ],
    subEdges: [
      { from: "s07_sub1", to: "s07_sub2", type: "finish_to_start" },
      { from: "s07_sub2", to: "s07_sub3", type: "finish_to_start" },
      { from: "s07_sub3", to: "s07_sub4", type: "finish_to_start" }
    ]
  }
];

// ============ 项目定义 ============

export interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  ganttTasks: GanttTask[];
}

export const mockProjects: Project[] = [
  {
    id: 'P001',
    name: '大型环保除尘设备',
    description: '为钢铁厂定制的 500,000 m³/h 滤筒除尘器项目，包含10个主工序阶段',
    template: '环保设备制造（非标）',
    nodes: mockGraph.nodes,
    edges: mockGraph.edges,
    ganttTasks: mockGanttTasks
  },
  {
    id: 'P002',
    name: '工业废水处理系统',
    description: '化工园区高浓度废水零排放处理系统，全流程定制化制造',
    template: '水处理系统（非标）',
    nodes: [],
    edges: [],
    ganttTasks: []
  }
];

// ============ 推演场景定义 ============

export const mockSimulationScenarios: SimulationScenario[] = [
  {
    id: "SC01",
    name: "增加焊接资源",
    description: "在铆焊组对阶段增加焊工和焊机，缩短工期但增加成本",
    changes: [
      { type: "resource_add", targetId: "S05", value: { welders: 2 }, description: "增加2名高级焊工" },
      { type: "resource_add", targetId: "S05", value: { machines: 1 }, description: "增加1台焊接机器人" },
      { type: "duration_change", targetId: "S05", value: -5, description: "工期缩短5天" },
      { type: "cost_adjust", targetId: "S05", value: 80000, description: "成本增加8万元" }
    ],
    results: {
      totalCost: 2532300,
      totalDuration: 145,
      profit: 467700,
      profitImpact: -3.2,
      durationImpact: -5,
      costImpact: 80000
    },
    aiRecommendation: "建议增加夜班班次而非增加设备，可节省设备租赁成本"
  },
  {
    id: "SC02",
    name: "外协机加工",
    description: "将定制化机加工序外协，缩短工期但利润降低",
    changes: [
      { type: "duration_change", targetId: "S06", value: -8, description: "机加工外协缩短8天" },
      { type: "cost_adjust", targetId: "S06", value: 50000, description: "外协费用增加5万元" }
    ],
    results: {
      totalCost: 2552300,
      totalDuration: 142,
      profit: 447700,
      profitImpact: -5.2,
      durationImpact: -8,
      costImpact: 50000
    },
    aiRecommendation: "外协方案可行，但需关注质量控制，建议选择有资质的供应商"
  },
  {
    id: "SC03",
    name: "优化采购策略",
    description: "提前锁定特殊材料价格，降低物料成本",
    changes: [
      { type: "cost_adjust", targetId: "S04", value: -100000, description: "批量采购节省10万元" },
      { type: "duration_change", targetId: "S04", value: -2, description: "提前下单缩短2天" }
    ],
    results: {
      totalCost: 2352300,
      totalDuration: 148,
      profit: 647700,
      profitImpact: 10.8,
      durationImpact: -2,
      costImpact: -100000
    },
    aiRecommendation: "建议立即执行，与供应商签订长期合作协议"
  }
];

// ============ 10阶段本体数据统一导出 ============
export const STAGE_ONTOLOGY_LIST = [
  { stage: 'S01', name: '需求对接', node: STAGE_01_REQUIREMENT },
  { stage: 'S02', name: '定制化设计', node: STAGE_02_DESIGN },
  { stage: 'S03', name: '非标工艺规划', node: STAGE_03_PROCESS_PLAN },
  { stage: 'S04', name: '定制化物料采购', node: STAGE_04_PROCUREMENT },
  { stage: 'S05', name: '铆焊组对', node: STAGE_05_WELDING },
  { stage: 'S06', name: '定制化机加工序', node: STAGE_06_MACHINING },
  { stage: 'S07', name: '总装试压', node: STAGE_07_ASSEMBLY },
  { stage: 'S08', name: '定制化检测认证', node: STAGE_08_INSPECTION },
  { stage: 'S09', name: '现场安装调试', node: STAGE_09_INSTALLATION },
  { stage: 'S10', name: '回款结算', node: STAGE_10_SETTLEMENT }
];

// 根据阶段ID获取本体数据
export function getStageOntology(stageId: string): StageOntology | undefined {
  const stage = STAGE_ONTOLOGY_LIST.find(s => s.stage === stageId);
  return stage?.node.ontology;
}

// 获取所有阶段的本体数据
export function getAllStageOntologies(): StageOntology[] {
  return STAGE_ONTOLOGY_LIST
    .map(s => s.node.ontology)
    .filter((o): o is StageOntology => o !== undefined);
}

// ============ 工业级4大类12子类资源数据 ============

/** 消耗类资源 - 原材料 */
export const CONSUMABLE_RAW_MATERIALS: IndustrialResource[] = [
  {
    id: "RES-RM-001", name: "Q345R压力容器钢板", category: "consumable", sub_type: "raw_material",
    tags: ["metal", "pressure_vessel", "carbon_steel"],
    attributes: { description: "压力容器用碳钢钢板", manufacturer: "宝钢", loss_rate: 0.08, supplier: "宝钢股份" },
    cost_type: "variable", unit: "吨", unit_cost: 5200, currency: "CNY", time_unit: "piece",
    status: "active", department: "采购部", bound_skill_ids: ["SKILL-MAT-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-RM-002", name: "304不锈钢板", category: "consumable", sub_type: "raw_material",
    tags: ["metal", "stainless", "corrosion_resistant"],
    attributes: { description: "奥氏体不锈钢板", manufacturer: "太钢", loss_rate: 0.05, supplier: "太钢不锈" },
    cost_type: "variable", unit: "吨", unit_cost: 18500, currency: "CNY", time_unit: "piece",
    status: "active", department: "采购部", bound_skill_ids: ["SKILL-MAT-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-RM-003", name: "316L不锈钢板", category: "consumable", sub_type: "raw_material",
    tags: ["metal", "stainless", "molybdenum", "corrosion_resistant"],
    attributes: { description: "超低碳含钼不锈钢", manufacturer: "太钢", loss_rate: 0.05, supplier: "太钢不锈" },
    cost_type: "variable", unit: "吨", unit_cost: 28000, currency: "CNY", time_unit: "piece",
    status: "active", department: "采购部", bound_skill_ids: ["SKILL-MAT-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 消耗类资源 - 耗材 */
export const CONSUMABLE_SUPPLIES: IndustrialResource[] = [
  {
    id: "RES-CS-001", name: "J507焊条 Φ3.2", category: "consumable", sub_type: "consumable",
    tags: ["welding", "electrode", "carbon_steel"],
    attributes: { description: "低氢钠型药皮焊条", manufacturer: "大西洋", loss_rate: 0.15, supplier: "大西洋焊材", min_order_quantity: 100 },
    cost_type: "variable", unit: "kg", unit_cost: 12, currency: "CNY", time_unit: "piece",
    status: "active", department: "制造部", bound_skill_ids: ["SKILL-WELD-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-CS-002", name: "ER308L不锈钢焊丝", category: "consumable", sub_type: "consumable",
    tags: ["welding", "wire", "stainless", "TIG"],
    attributes: { description: "超低碳不锈钢焊丝", manufacturer: "安泰", loss_rate: 0.08, supplier: "安泰科技" },
    cost_type: "variable", unit: "kg", unit_cost: 85, currency: "CNY", time_unit: "piece",
    status: "active", department: "制造部", bound_skill_ids: ["SKILL-WELD-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-CS-003", name: "氩气 99.999%", category: "consumable", sub_type: "consumable",
    tags: ["gas", "shielding", "TIG", "high_purity"],
    attributes: { description: "高纯氩气", manufacturer: "林德气体", loss_rate: 0.05, supplier: "林德气体" },
    cost_type: "variable", unit: "瓶", unit_cost: 45, currency: "CNY", time_unit: "piece",
    status: "active", department: "制造部", bound_skill_ids: ["SKILL-WELD-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 消耗类资源 - 能源 */
export const CONSUMABLE_ENERGY: IndustrialResource[] = [
  {
    id: "RES-EN-001", name: "工业用电", category: "consumable", sub_type: "energy",
    tags: ["electricity", "power", "manufacturing"],
    attributes: { description: "工业用电(峰谷平)", supplier: "国家电网" },
    cost_type: "variable", unit: "kWh", unit_cost: 0.8, currency: "CNY", time_unit: "hour",
    status: "active", department: "动力部", bound_skill_ids: ["SKILL-ENERGY-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-EN-002", name: "压缩空气", category: "consumable", sub_type: "energy",
    tags: ["compressed_air", "pneumatic", "auxiliary"],
    attributes: { description: "0.7MPa压缩空气", supplier: "自备空压站" },
    cost_type: "variable", unit: "m³", unit_cost: 0.15, currency: "CNY", time_unit: "hour",
    status: "active", department: "动力部", bound_skill_ids: ["SKILL-ENERGY-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 占用类资源 - 设备 */
export const OCCUPIABLE_EQUIPMENT: IndustrialResource[] = [
  {
    id: "RES-EQ-001", name: "自动焊接机器人工作站", category: "occupiable", sub_type: "equipment",
    tags: ["welding", "robot", "automated", "cnc"],
    attributes: { description: "六轴焊接机器人", manufacturer: "ABB", model: "IRB 2600", power_kw: 35, capacity: "10m/h", utilization_rate: 0.85 },
    cost_type: "fixed", unit: "小时", unit_cost: 308, currency: "CNY", time_unit: "hour",
    status: "active", department: "制造部", location: "A车间-01", bound_skill_ids: ["SKILL-EQP-DEPR-001", "SKILL-EQP-ENERGY-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-EQ-002", name: "五轴联动加工中心", category: "occupiable", sub_type: "equipment",
    tags: ["machining", "cnc", "5_axis", "precision"],
    attributes: { description: "高精度五轴加工中心", manufacturer: "德玛吉", model: "DMU 80", power_kw: 55, capacity: "2000×1000mm", utilization_rate: 0.8 },
    cost_type: "fixed", unit: "小时", unit_cost: 424, currency: "CNY", time_unit: "hour",
    status: "active", department: "机加部", location: "B车间-03", bound_skill_ids: ["SKILL-EQP-DEPR-001", "SKILL-EQP-ENERGY-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-EQ-003", name: "X射线探伤机", category: "occupiable", sub_type: "equipment",
    tags: ["ndt", "xray", "inspection", "quality"],
    attributes: { description: "工业X射线探伤设备", manufacturer: "丹东奥龙", model: "XXG-3005", power_kw: 8, utilization_rate: 0.6 },
    cost_type: "fixed", unit: "小时", unit_cost: 156.4, currency: "CNY", time_unit: "hour",
    status: "active", department: "质检部", location: "检测中心", bound_skill_ids: ["SKILL-EQP-DEPR-001", "SKILL-EQP-ENERGY-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 占用类资源 - 生产线/工位 */
export const OCCUPIABLE_LINES: IndustrialResource[] = [
  {
    id: "RES-LN-001", name: "铆焊生产线A", category: "occupiable", sub_type: "production_line",
    tags: ["welding", "assembly", "line", "heavy"],
    attributes: { description: "重型铆焊生产线", capacity: "50吨/班", max_load: 100, utilization_rate: 0.75 },
    cost_type: "fixed", unit: "班", unit_cost: 3500, currency: "CNY", time_unit: "day",
    status: "active", department: "制造部", location: "A车间", bound_skill_ids: ["SKILL-LINE-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-WS-001", name: "装配工位-01", category: "occupiable", sub_type: "workstation",
    tags: ["assembly", "station", "fixed"],
    attributes: { description: "总装专用工位", capacity: "20吨", utilization_rate: 0.9 },
    cost_type: "fixed", unit: "小时", unit_cost: 85, currency: "CNY", time_unit: "hour",
    status: "active", department: "装配部", location: "装配车间-A1", bound_skill_ids: ["SKILL-WS-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 人工类资源 - 技工 */
export const LABOR_SKILLED: IndustrialResource[] = [
  {
    id: "RES-LB-001", name: "高级焊工", category: "labor", sub_type: "skilled_labor",
    tags: ["welding", "certified", "high_skill"],
    attributes: { description: "持有压力容器焊接资质", skill_level: "高级", efficiency: 1.4, hourly_rate: 450, certification: ["AWS D1.1", "特种设备焊工证"] },
    cost_type: "variable", unit: "小时", unit_cost: 450, currency: "CNY", time_unit: "hour",
    status: "active", department: "制造部", bound_skill_ids: ["SKILL-LABOR-COST-001", "SKILL-WELD-EFF-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-LB-002", name: "中级焊工", category: "labor", sub_type: "skilled_labor",
    tags: ["welding", "certified", "medium_skill"],
    attributes: { description: "熟练焊工", skill_level: "中级", efficiency: 1.2, hourly_rate: 380, certification: ["特种设备焊工证"] },
    cost_type: "variable", unit: "小时", unit_cost: 380, currency: "CNY", time_unit: "hour",
    status: "active", department: "制造部", bound_skill_ids: ["SKILL-LABOR-COST-001", "SKILL-WELD-EFF-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-LB-003", name: "结构工程师", category: "labor", sub_type: "skilled_labor",
    tags: ["design", "structure", "engineering"],
    attributes: { description: "非标设备结构设计", skill_level: "高级", efficiency: 1.3, hourly_rate: 500, certification: ["注册机械工程师"] },
    cost_type: "variable", unit: "小时", unit_cost: 500, currency: "CNY", time_unit: "hour",
    status: "active", department: "设计部", bound_skill_ids: ["SKILL-LABOR-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-LB-004", name: "工艺总监", category: "labor", sub_type: "management",
    tags: ["process", "management", "planning"],
    attributes: { description: "工艺规划与审核", skill_level: "专家", efficiency: 1.3, hourly_rate: 550, certification: ["高级工程师"] },
    cost_type: "variable", unit: "小时", unit_cost: 550, currency: "CNY", time_unit: "hour",
    status: "active", department: "工艺部", bound_skill_ids: ["SKILL-LABOR-COST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 摊销类资源 */
export const ALLOCATABLE_COSTS: IndustrialResource[] = [
  {
    id: "RES-AL-001", name: "设备折旧-焊接设备", category: "allocatable", sub_type: "depreciation",
    tags: ["depreciation", "equipment", "welding"],
    attributes: { description: "焊接设备折旧分摊", depreciation_period: 10, salvage_value: 0.05, allocation_base: "设备使用时长" },
    cost_type: "fixed", unit: "小时", unit_cost: 45, currency: "CNY", time_unit: "hour",
    status: "active", department: "财务部", bound_skill_ids: ["SKILL-ALLOC-DEPR-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-AL-002", name: "制造费用分摊", category: "allocatable", sub_type: "overhead",
    tags: ["overhead", "manufacturing", "indirect"],
    attributes: { description: "间接制造费用分摊", allocation_base: "直接人工成本" },
    cost_type: "hybrid", unit: "元", unit_cost: 0.35, currency: "CNY", time_unit: "piece",
    status: "active", department: "财务部", bound_skill_ids: ["SKILL-ALLOC-OH-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-AL-003", name: "质量成本", category: "allocatable", sub_type: "quality_cost",
    tags: ["quality", "cost", "prevention", "appraisal"],
    attributes: { description: "预防+鉴定成本", allocation_base: "产值比例" },
    cost_type: "hybrid", unit: "元", unit_cost: 0.02, currency: "CNY", time_unit: "piece",
    status: "active", department: "质检部", bound_skill_ids: ["SKILL-ALLOC-QC-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 外部成本资源 */
export const EXTERNAL_COSTS: IndustrialResource[] = [
  {
    id: "RES-EX-001", name: "第三方检测费", category: "external", sub_type: "certification",
    tags: ["inspection", "third_party", "certification"],
    attributes: { description: "外协检测认证服务", service_provider: "SGS通标", contract_terms: "按项目结算" },
    cost_type: "variable", unit: "批次", unit_cost: 8500, currency: "CNY", time_unit: "piece",
    status: "active", department: "质检部", bound_skill_ids: ["SKILL-EXT-CERT-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-EX-002", name: "现场安装服务费", category: "external", sub_type: "installation",
    tags: ["installation", "field", "service"],
    attributes: { description: "客户现场安装调试", service_provider: "工程部外包", contract_terms: "按天计费" },
    cost_type: "variable", unit: "人天", unit_cost: 1200, currency: "CNY", time_unit: "day",
    status: "active", department: "工程部", bound_skill_ids: ["SKILL-EXT-INST-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-EX-003", name: "项目差旅费", category: "external", sub_type: "travel",
    tags: ["travel", "project", "expense"],
    attributes: { description: "项目相关人员差旅", service_provider: "员工垫付报销", contract_terms: "实报实销" },
    cost_type: "variable", unit: "次", unit_cost: 2500, currency: "CNY", time_unit: "piece",
    status: "active", department: "财务部", bound_skill_ids: ["SKILL-EXT-TRAVEL-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  },
  {
    id: "RES-EX-004", name: "特种运输费", category: "external", sub_type: "logistics",
    tags: ["logistics", "oversized", "transport"],
    attributes: { description: "超限设备运输", service_provider: "专业物流", contract_terms: "按吨公里" },
    cost_type: "variable", unit: "吨公里", unit_cost: 3.5, currency: "CNY", time_unit: "piece",
    status: "active", department: "物流部", bound_skill_ids: ["SKILL-EXT-LOG-001"],
    metadata: { created_at: "2026-01-01", updated_at: "2026-03-20", version: "1.0", source: "system" }
  }
];

/** 统一资源库 - 包含所有4大类12子类资源 */
export const INDUSTRIAL_RESOURCES: IndustrialResource[] = [
  ...CONSUMABLE_RAW_MATERIALS,
  ...CONSUMABLE_SUPPLIES,
  ...CONSUMABLE_ENERGY,
  ...OCCUPIABLE_EQUIPMENT,
  ...OCCUPIABLE_LINES,
  ...LABOR_SKILLED,
  ...ALLOCATABLE_COSTS,
  ...EXTERNAL_COSTS
];

// ============ Binding Rule (绑定规则) ============

/** 示例 Binding Rules */
export const BINDING_RULES: BindingRule[] = [
  // Rule 1: 焊接设备自动绑定能耗、折旧、效率计算Skill
  {
    id: "RULE-001",
    name: "焊接设备Skill自动绑定",
    description: "自动为焊接设备绑定能耗成本、设备折旧、焊接效率计算Skill",
    version: "1.0",
    enabled: true,
    priority: 100,
    conditions: [
      { field: "resource.category", operator: "equals", value: "occupiable" },
      { field: "resource.sub_type", operator: "equals", value: "equipment" },
      { field: "resource.tags", operator: "contains", value: "welding" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-EQP-ENERGY-001", params: { auto_calculate: true } },
      { type: "bind_skill", target: "SKILL-EQP-DEPR-001", params: { auto_calculate: true } },
      { type: "bind_skill", target: "SKILL-WELD-EFF-001", params: { auto_calculate: true } }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "设备绑定" }
  },
  // Rule 2: 机加设备自动绑定能耗、折旧Skill
  {
    id: "RULE-002",
    name: "机加设备Skill自动绑定",
    description: "自动为机加工设备绑定能耗成本、设备折旧Skill",
    version: "1.0",
    enabled: true,
    priority: 100,
    conditions: [
      { field: "resource.category", operator: "equals", value: "occupiable" },
      { field: "resource.sub_type", operator: "equals", value: "equipment" },
      { field: "resource.tags", operator: "contains", value: "machining" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-EQP-ENERGY-001", params: { auto_calculate: true } },
      { type: "bind_skill", target: "SKILL-EQP-DEPR-001", params: { auto_calculate: true } }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "设备绑定" }
  },
  // Rule 3: 原材料自动绑定材料成本计算Skill
  {
    id: "RULE-003",
    name: "原材料Skill自动绑定",
    description: "自动为原材料绑定材料成本计算Skill",
    version: "1.0",
    enabled: true,
    priority: 200,
    conditions: [
      { field: "resource.category", operator: "equals", value: "consumable" },
      { field: "resource.sub_type", operator: "equals", value: "raw_material" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-MAT-COST-001", params: { include_loss_rate: true } }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "物料绑定" }
  },
  // Rule 4: 焊接耗材自动绑定焊接成本Skill
  {
    id: "RULE-004",
    name: "焊接耗材Skill自动绑定",
    description: "自动为焊接耗材绑定焊接成本计算Skill",
    version: "1.0",
    enabled: true,
    priority: 150,
    conditions: [
      { field: "resource.category", operator: "equals", value: "consumable" },
      { field: "resource.sub_type", operator: "equals", value: "consumable" },
      { field: "resource.tags", operator: "contains", value: "welding" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-WELD-COST-001", params: { auto_calculate: true } }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "物料绑定" }
  },
  // Rule 5: 人工类资源自动绑定人工成本Skill
  {
    id: "RULE-005",
    name: "人工Skill自动绑定",
    description: "自动为人工类资源绑定人工成本计算Skill",
    version: "1.0",
    enabled: true,
    priority: 100,
    conditions: [
      { field: "resource.category", operator: "equals", value: "labor" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-LABOR-COST-001", params: { include_overhead: true } }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "人工绑定" }
  },
  // Rule 6: 铆焊工序自动绑定焊接相关Skill组合
  {
    id: "RULE-006",
    name: "铆焊工序Skill组合绑定",
    description: "为铆焊组对工序自动绑定完整的焊接成本计算Skill组合",
    version: "1.0",
    enabled: true,
    priority: 50,
    conditions: [
      { field: "task.node_type", operator: "equals", value: "铆焊组对" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-WELD-COST-001", params: { required: true } },
      { type: "bind_skill", target: "SKILL-WELD-EFF-001", params: { required: true } },
      { type: "bind_skill", target: "SKILL-ALLOC-QC-001", params: { required: false } }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "工序绑定" }
  },
  // Rule 7: 摊销类资源自动绑定
  {
    id: "RULE-007",
    name: "摊销成本自动绑定",
    description: "自动为摊销类资源绑定相应的分摊计算Skill",
    version: "1.0",
    enabled: true,
    priority: 100,
    conditions: [
      { field: "resource.category", operator: "equals", value: "allocatable" }
    ],
    actions: [
      { type: "bind_skill", target: "SKILL-ALLOC-DEPR-001", params: {} },
      { type: "bind_skill", target: "SKILL-ALLOC-OH-001", params: {} }
    ],
    metadata: { created_by: "system", created_at: "2026-01-01", updated_at: "2026-03-20", category: "摊销绑定" }
  }
];

// ============ 增强版 Skills ============

/** 工业级Skill定义 */
export const INDUSTRIAL_SKILLS: Skill[] = [
  // 材料成本计算Skill
  {
    id: "SKILL-MAT-COST-001",
    code: "MAT_COST_CALC",
    name: "材料成本计算",
    description: "计算材料成本，含损耗率",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "quantity", type: "number", required: true, source: "node" },
      { name: "unit_price", type: "number", required: true, source: "resource" },
      { name: "loss_rate", type: "number", required: false, source: "resource", default_value: 0.05 }
    ],
    outputs: [
      { name: "material_cost", type: "cost", unit: "CNY", description: "材料总成本(含损耗)" },
      { name: "net_cost", type: "cost", unit: "CNY", description: "材料净成本" },
      { name: "loss_cost", type: "cost", unit: "CNY", description: "损耗成本" }
    ],
    logic: {
      type: "formula",
      content: "material_cost = quantity * unit_price * (1 + loss_rate); net_cost = quantity * unit_price; loss_cost = quantity * unit_price * loss_rate"
    },
    binding_rules: ["RULE-003", "RULE-004"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "material"] }
  },
  // 焊接成本计算Skill
  {
    id: "SKILL-WELD-COST-001",
    code: "WELD_COST_CALC",
    name: "焊接成本综合计算",
    description: "计算焊接工序总成本：人工+材料+能耗+折旧",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "duration", type: "number", required: true, source: "node" },
      { name: "labor_rate", type: "number", required: true, source: "resource" },
      { name: "power_kw", type: "number", required: true, source: "resource" },
      { name: "electricity_price", type: "number", required: false, source: "system", default_value: 0.8 },
      { name: "depreciation_rate", type: "number", required: true, source: "resource" },
      { name: "material_cost", type: "number", required: false, source: "skill_output" }
    ],
    outputs: [
      { name: "total_cost", type: "cost", unit: "CNY", description: "焊接总成本" },
      { name: "labor_cost", type: "cost", unit: "CNY", description: "人工成本" },
      { name: "energy_cost", type: "cost", unit: "CNY", description: "能耗成本" },
      { name: "depreciation_cost", type: "cost", unit: "CNY", description: "折旧成本" }
    ],
    logic: {
      type: "formula",
      content: "labor_cost = duration * labor_rate; energy_cost = power_kw * duration * electricity_price; depreciation_cost = depreciation_rate * duration; total_cost = labor_cost + energy_cost + depreciation_cost + (material_cost || 0)"
    },
    binding_rules: ["RULE-001", "RULE-004", "RULE-006"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "welding", "comprehensive"] }
  },
  // 焊接效率计算Skill
  {
    id: "SKILL-WELD-EFF-001",
    code: "WELD_EFF_CALC",
    name: "焊接效率计算",
    description: "根据焊工等级计算实际工时效率",
    category: "duration",
    version: "1.0",
    inputs: [
      { name: "base_duration", type: "number", required: true, source: "node" },
      { name: "skill_level", type: "string", required: true, source: "resource" }
    ],
    outputs: [
      { name: "actual_duration", type: "time", unit: "hour", description: "实际工时" },
      { name: "efficiency_factor", type: "efficiency", unit: "ratio", description: "效率系数" }
    ],
    logic: {
      type: "condition",
      content: [
        { condition: "skill_level == '专家'", efficiency_factor: 1.5 },
        { condition: "skill_level == '高级'", efficiency_factor: 1.3 },
        { condition: "skill_level == '中级'", efficiency_factor: 1.0 },
        { condition: "skill_level == '初级'", efficiency_factor: 0.8 },
        { condition: "default", efficiency_factor: 1.0 }
      ]
    },
    binding_rules: ["RULE-001", "RULE-005", "RULE-006"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["efficiency", "welding", "labor"] }
  },
  // 设备能耗成本Skill
  {
    id: "SKILL-EQP-ENERGY-001",
    code: "EQP_ENERGY_COST",
    name: "设备能耗成本计算",
    description: "计算设备运行期间的能耗成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "power_kw", type: "number", required: true, source: "resource" },
      { name: "duration", type: "number", required: true, source: "node" },
      { name: "electricity_price", type: "number", required: false, source: "system", default_value: 0.8 }
    ],
    outputs: [
      { name: "energy_cost", type: "cost", unit: "CNY", description: "能耗成本" },
      { name: "energy_consumption", type: "quantity", unit: "kWh", description: "耗电量" }
    ],
    logic: {
      type: "formula",
      content: "energy_consumption = power_kw * duration; energy_cost = energy_consumption * electricity_price"
    },
    binding_rules: ["RULE-001", "RULE-002"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "energy", "equipment"] }
  },
  // 设备折旧Skill
  {
    id: "SKILL-EQP-DEPR-001",
    code: "EQP_DEPR_CALC",
    name: "设备折旧成本计算",
    description: "计算设备使用期间的折旧成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "unit_cost_per_hour", type: "number", required: true, source: "resource" },
      { name: "duration", type: "number", required: true, source: "node" }
    ],
    outputs: [
      { name: "depreciation_cost", type: "cost", unit: "CNY", description: "折旧成本" }
    ],
    logic: {
      type: "formula",
      content: "depreciation_cost = unit_cost_per_hour * duration"
    },
    binding_rules: ["RULE-001", "RULE-002"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "depreciation", "equipment"] }
  },
  // 人工成本Skill
  {
    id: "SKILL-LABOR-COST-001",
    code: "LABOR_COST_CALC",
    name: "人工成本计算",
    description: "计算人工工时成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "duration", type: "number", required: true, source: "node" },
      { name: "hourly_rate", type: "number", required: true, source: "resource" },
      { name: "efficiency", type: "number", required: false, source: "resource", default_value: 1.0 }
    ],
    outputs: [
      { name: "labor_cost", type: "cost", unit: "CNY", description: "人工成本" },
      { name: "adjusted_duration", type: "time", unit: "hour", description: "调整后工时" }
    ],
    logic: {
      type: "formula",
      content: "adjusted_duration = duration / efficiency; labor_cost = adjusted_duration * hourly_rate"
    },
    binding_rules: ["RULE-005"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "labor"] }
  },
  // 摊销折旧Skill
  {
    id: "SKILL-ALLOC-DEPR-001",
    code: "ALLOC_DEPR_CALC",
    name: "摊销折旧计算",
    description: "计算摊销类资源的折旧分摊",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "unit_cost", type: "number", required: true, source: "resource" },
      { name: "allocation_base", type: "number", required: true, source: "node" }
    ],
    outputs: [
      { name: "allocated_cost", type: "cost", unit: "CNY", description: "分摊成本" }
    ],
    logic: {
      type: "formula",
      content: "allocated_cost = unit_cost * allocation_base"
    },
    binding_rules: ["RULE-007"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "allocation", "depreciation"] }
  },
  // 制造费用分摊Skill
  {
    id: "SKILL-ALLOC-OH-001",
    code: "ALLOC_OH_CALC",
    name: "制造费用分摊计算",
    description: "计算间接制造费用分摊",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "base_cost", type: "number", required: true, source: "skill_output" },
      { name: "overhead_rate", type: "number", required: false, source: "system", default_value: 0.35 }
    ],
    outputs: [
      { name: "overhead_cost", type: "cost", unit: "CNY", description: "制造费用" }
    ],
    logic: {
      type: "formula",
      content: "overhead_cost = base_cost * overhead_rate"
    },
    binding_rules: ["RULE-007"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "allocation", "overhead"] }
  },
  // 质量成本Skill
  {
    id: "SKILL-ALLOC-QC-001",
    code: "QC_COST_CALC",
    name: "质量成本计算",
    description: "计算预防和鉴定质量成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "total_value", type: "number", required: true, source: "node" },
      { name: "qc_rate", type: "number", required: false, source: "system", default_value: 0.02 }
    ],
    outputs: [
      { name: "qc_cost", type: "cost", unit: "CNY", description: "质量成本" }
    ],
    logic: {
      type: "formula",
      content: "qc_cost = total_value * qc_rate"
    },
    binding_rules: ["RULE-006", "RULE-007"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "quality"] }
  },
  // 能源成本Skill (消耗类)
  {
    id: "SKILL-ENERGY-COST-001",
    code: "ENERGY_COST_CALC",
    name: "能源成本计算",
    description: "计算电力、燃气等能源消耗成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "consumption", type: "number", required: true, source: "resource" },
      { name: "unit_price", type: "number", required: true, source: "resource" },
      { name: "duration", type: "number", required: false, source: "node", default_value: 1 }
    ],
    outputs: [
      { name: "energy_cost", type: "cost", unit: "CNY", description: "能源成本" },
      { name: "total_consumption", type: "quantity", unit: "kWh", description: "总消耗量" }
    ],
    logic: {
      type: "formula",
      content: "total_consumption = consumption * duration; energy_cost = total_consumption * unit_price"
    },
    binding_rules: ["RULE-003"],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "energy", "consumable"] }
  },
  // 产线成本Skill
  {
    id: "SKILL-LINE-COST-001",
    code: "LINE_COST_CALC",
    name: "产线占用成本计算",
    description: "计算生产线占用期间的成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "unit_cost_per_hour", type: "number", required: true, source: "resource" },
      { name: "duration", type: "number", required: true, source: "node" },
      { name: "utilization_rate", type: "number", required: false, source: "resource", default_value: 0.85 }
    ],
    outputs: [
      { name: "line_cost", type: "cost", unit: "CNY", description: "产线占用成本" }
    ],
    logic: {
      type: "formula",
      content: "line_cost = unit_cost_per_hour * duration / utilization_rate"
    },
    binding_rules: [],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "line", "occupiable"] }
  },
  // 工位成本Skill
  {
    id: "SKILL-WS-COST-001",
    code: "WS_COST_CALC",
    name: "工位占用成本计算",
    description: "计算工位占用期间的成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "unit_cost_per_hour", type: "number", required: true, source: "resource" },
      { name: "duration", type: "number", required: true, source: "node" }
    ],
    outputs: [
      { name: "workstation_cost", type: "cost", unit: "CNY", description: "工位占用成本" }
    ],
    logic: {
      type: "formula",
      content: "workstation_cost = unit_cost_per_hour * duration"
    },
    binding_rules: [],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "workstation", "occupiable"] }
  },
  // 外部认证成本Skill
  {
    id: "SKILL-EXT-CERT-001",
    code: "EXT_CERT_COST",
    name: "外部认证成本计算",
    description: "计算第三方检测认证成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "base_fee", type: "number", required: true, source: "resource" },
      { name: "item_count", type: "number", required: true, source: "node" },
      { name: "unit_fee", type: "number", required: false, source: "resource", default_value: 0 }
    ],
    outputs: [
      { name: "cert_cost", type: "cost", unit: "CNY", description: "认证成本" }
    ],
    logic: {
      type: "formula",
      content: "cert_cost = base_fee + (item_count * unit_fee)"
    },
    binding_rules: [],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "external", "certification"] }
  },
  // 外部安装成本Skill
  {
    id: "SKILL-EXT-INST-001",
    code: "EXT_INST_COST",
    name: "外部安装调试成本计算",
    description: "计算现场安装调试服务成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "daily_rate", type: "number", required: true, source: "resource" },
      { name: "days", type: "number", required: true, source: "node" },
      { name: "personnel_count", type: "number", required: false, source: "node", default_value: 1 }
    ],
    outputs: [
      { name: "install_cost", type: "cost", unit: "CNY", description: "安装调试成本" }
    ],
    logic: {
      type: "formula",
      content: "install_cost = daily_rate * days * personnel_count"
    },
    binding_rules: [],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "external", "installation"] }
  },
  // 外部差旅成本Skill
  {
    id: "SKILL-EXT-TRAVEL-001",
    code: "EXT_TRAVEL_COST",
    name: "外部差旅成本计算",
    description: "计算项目差旅费用",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "trip_count", type: "number", required: true, source: "node" },
      { name: "cost_per_trip", type: "number", required: true, source: "resource" }
    ],
    outputs: [
      { name: "travel_cost", type: "cost", unit: "CNY", description: "差旅成本" }
    ],
    logic: {
      type: "formula",
      content: "travel_cost = trip_count * cost_per_trip"
    },
    binding_rules: [],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "external", "travel"] }
  },
  // 外部物流成本Skill
  {
    id: "SKILL-EXT-LOG-001",
    code: "EXT_LOG_COST",
    name: "外部物流成本计算",
    description: "计算运输物流成本",
    category: "cost",
    version: "1.0",
    inputs: [
      { name: "weight_kg", type: "number", required: true, source: "node" },
      { name: "distance_km", type: "number", required: true, source: "node" },
      { name: "unit_price_per_kg_km", type: "number", required: true, source: "resource" }
    ],
    outputs: [
      { name: "logistics_cost", type: "cost", unit: "CNY", description: "物流成本" }
    ],
    logic: {
      type: "formula",
      content: "logistics_cost = weight_kg * distance_km * unit_price_per_kg_km"
    },
    binding_rules: [],
    metadata: { author: "system", created_at: "2026-01-01", updated_at: "2026-03-20", tags: ["cost", "external", "logistics"] }
  }
];

// ============ 资源绑定引擎辅助函数 ============

/**
 * 匹配资源与Binding Rules
 * @param resource 资源对象
 * @param context 上下文信息 (task, project等)
 * @returns 匹配的规则列表
 */
export function matchBindingRules(
  resource: IndustrialResource,
  context?: { task?: any; project?: any; node?: any }
): BindingRule[] {
  return BINDING_RULES.filter(rule => {
    if (!rule.enabled) return false;

    return rule.conditions.every(condition => {
      let fieldValue: any;

      // 解析字段路径
      if (condition.field.startsWith('resource.')) {
        const field = condition.field.replace('resource.', '');
        fieldValue = resource[field as keyof IndustrialResource];
      } else if (condition.field.startsWith('task.') && context?.task) {
        const field = condition.field.replace('task.', '');
        fieldValue = context.task[field];
      } else if (condition.field.startsWith('project.') && context?.project) {
        const field = condition.field.replace('project.', '');
        fieldValue = context.project[field];
      }

      // 执行比较
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return Array.isArray(fieldValue) && fieldValue.includes(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        case 'gt':
          return Number(fieldValue) > Number(condition.value);
        case 'lt':
          return Number(fieldValue) < Number(condition.value);
        case 'gte':
          return Number(fieldValue) >= Number(condition.value);
        case 'lte':
          return Number(fieldValue) <= Number(condition.value);
        default:
          return false;
      }
    });
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * 为资源自动绑定Skills
 * @param resource 资源对象
 * @param context 上下文
 * @returns 创建的绑定关系列表
 */
export function autoBindSkills(
  resource: IndustrialResource,
  context?: { task?: any; project?: any; node?: any }
): ResourceSkillBinding[] {
  const matchedRules = matchBindingRules(resource, context);
  const bindings: ResourceSkillBinding[] = [];

  matchedRules.forEach(rule => {
    rule.actions.forEach(action => {
      if (action.type === 'bind_skill') {
        const binding: ResourceSkillBinding = {
          id: `BIND-${resource.id}-${action.target}-${Date.now()}`,
          resource_id: resource.id,
          skill_id: action.target,
          rule_id: rule.id,
          project_id: context?.project?.id,
          node_id: context?.node?.id,
          input_overrides: action.params || {},
          status: 'active'
        };
        bindings.push(binding);
      }
    });
  });

  return bindings;
}

/**
 * 计算资源成本 (通过Skill)
 * @param resource 资源对象
 * @param binding 绑定关系
 * @param inputs 输入参数
 * @returns 执行结果
 */
export function calculateResourceCost(
  resource: IndustrialResource,
  binding: ResourceSkillBinding,
  inputs: Record<string, any>
): SkillExecutionResult {
  const skill = INDUSTRIAL_SKILLS.find(s => s.id === binding.skill_id);

  if (!skill) {
    return {
      skill_id: binding.skill_id,
      binding_id: binding.id,
      status: 'error',
      outputs: {},
      cost_breakdown: [],
      execution_time: 0,
      error_message: `Skill not found: ${binding.skill_id}`
    };
  }

  const startTime = performance.now();

  try {
    // 合并输入参数
    const mergedInputs = { ...inputs, ...binding.input_overrides };

    // 执行Skill逻辑 (简化版)
    const outputs: Record<string, any> = {};

    if (skill.logic.type === 'formula') {
      // 公式计算
      const formula = skill.logic.content as string;
      // 简单公式解析执行 (实际项目中应使用安全的公式引擎)
      outputs.total_cost = mergedInputs.duration * mergedInputs.unit_cost || 0;
    } else if (skill.logic.type === 'condition') {
      // 条件计算
      const conditions = skill.logic.content as Array<{ condition: string; [key: string]: any }>;
      const matched = conditions.find(c => {
        if (c.condition === 'default') return true;
        // 简化条件判断
        return false;
      });
      if (matched) {
        Object.assign(outputs, matched);
      }
    }

    const executionTime = performance.now() - startTime;

    // 构建成本追溯项
    const costBreakdown: CostTraceabilityItem[] = Object.entries(outputs)
      .filter(([key]) => key.includes('cost'))
      .map(([key, value]) => ({
        cost_type: key,
        amount: Number(value) || 0,
        unit: 'CNY',
        trace: {
          resource_id: resource.id,
          resource_name: resource.name,
          binding_rule_id: binding.rule_id,
          binding_rule_name: BINDING_RULES.find(r => r.id === binding.rule_id)?.name || '',
          skill_id: skill.id,
          skill_name: skill.name,
          skill_code: skill.code
        },
        calculation_details: {
          formula: skill.logic.type === 'formula' ? String(skill.logic.content) : 'condition-based',
          inputs: mergedInputs
        }
      }));

    return {
      skill_id: skill.id,
      binding_id: binding.id,
      status: 'success',
      outputs,
      cost_breakdown: costBreakdown,
      execution_time: executionTime
    };

  } catch (error) {
    return {
      skill_id: skill.id,
      binding_id: binding.id,
      status: 'error',
      outputs: {},
      cost_breakdown: [],
      execution_time: performance.now() - startTime,
      error_message: String(error)
    };
  }
}

// ============ 默认导出 ============
export default {
  mockGraph,
  mockRules,
  mockGanttTasks,
  mockOntologyGraph,
  mockTaskNodePacks,
  mockProcessLibrary,
  mockProjects,
  mockSimulationScenarios,
  STAGE_ONTOLOGY_LIST,
  PERSONNEL_LIST,
  EQUIPMENT_LIST,
  MATERIAL_LIST,
  INDUSTRIAL_RESOURCES,
  BINDING_RULES,
  INDUSTRIAL_SKILLS
};
