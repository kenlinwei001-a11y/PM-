export type NodeType = 'project' | 'phase' | 'process' | 'task' | 'material' | 'resource';

export interface CostBreakdown {
  material: number;
  labor: number;
  equipment: number;
  overhead: number;
  energy?: number;
  total: number;
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
  status: 'not_started' | 'running' | 'completed' | 'delayed';
  riskScore?: number;
  subTasks?: { id: string; name: string; duration: number; status: string }[];
  // Calculated fields for Critical Path Method
  es?: number; // Early Start
  ef?: number; // Early Finish
  ls?: number; // Late Start
  lf?: number; // Late Finish
  isCritical?: boolean;
}

export type EdgeType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'lag';

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
  type: 'resource_add' | 'resource_remove' | 'duration_change' | 'rule_toggle';
  targetId: string;
  value?: any;
}

export interface Scenario {
  id: string;
  name: string;
  changes: SimulationChange[];
  results?: {
    totalCost: number;
    totalDuration: number;
    profit: number;
  };
}

export interface AgentResponse {
  analysis: string;
  recommendations: string[];
  expected_impact: {
    profit: string;
    duration: string;
  };
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
}

// Mock Data
export const mockGraph: ProjectGraph = {
  project_id: "P001",
  nodes: [
    {
      id: "N0",
      type: "phase",
      name: "设计与准备",
      duration: 5,
      resources: ["R_ENG_01"],
      machines: ["PC_CAD_01"],
      materials: [],
      rules: ["COST_DESIGN"],
      plannedCost: { material: 0, labor: 5000, equipment: 1000, overhead: 500, energy: 200, total: 6700 },
      status: "completed",
      riskScore: 5,
      es: 0, ef: 5, ls: 0, lf: 5, isCritical: true
    },
    {
      id: "N1",
      type: "process",
      name: "焊接工序",
      duration: 10,
      resources: ["R_WELD_01"],
      machines: ["WELD_ROBOT_A", "WELD_MANUAL_B"],
      materials: ["M_STEEL"],
      rules: ["RULE_WELD_TIME", "RULE_ENERGY_WELD"],
      plannedCost: { material: 15000, labor: 8000, equipment: 4000, overhead: 1000, energy: 3000, total: 31000 },
      status: "running",
      riskScore: 60,
      subTasks: [
        { id: "N1-1", name: "焊接准备", duration: 2, status: "completed" },
        { id: "N1-2", name: "主焊接", duration: 5, status: "running" },
        { id: "N1-3", name: "焊后处理", duration: 2, status: "not_started" },
        { id: "N1-4", name: "UT检测", duration: 1, status: "not_started" }
      ],
      es: 5, ef: 15, ls: 5, lf: 15, isCritical: true
    },
    {
      id: "N2",
      type: "process",
      name: "CNC机加工",
      duration: 8,
      resources: ["R_CNC_01"],
      machines: ["CNC_5AXIS_01"],
      materials: ["M_ALLOY"],
      rules: ["RULE_DEPRECIATION"],
      plannedCost: { material: 12000, labor: 6000, equipment: 8000, overhead: 1500, energy: 2500, total: 30000 },
      status: "not_started",
      riskScore: 20,
      subTasks: [
        { id: "N2-1", name: "编程与对刀", duration: 2, status: "not_started" },
        { id: "N2-2", name: "粗加工", duration: 4, status: "not_started" },
        { id: "N2-3", name: "精加工", duration: 2, status: "not_started" }
      ],
      es: 5, ef: 13, ls: 7, lf: 15, isCritical: false
    },
    {
      id: "N3",
      type: "process",
      name: "总装测试",
      duration: 7,
      resources: ["R_ASSY_01", "R_TEST_01"],
      machines: ["TEST_RIG_01"],
      materials: [],
      rules: ["RULE_PRESSURE_VESSEL", "RULE_COMPLIANCE"],
      plannedCost: { material: 2000, labor: 10000, equipment: 3000, overhead: 800, energy: 1000, total: 16800 },
      status: "not_started",
      riskScore: 80,
      es: 15, ef: 22, ls: 15, lf: 22, isCritical: true
    }
  ],
  edges: [
    { from: "N0", to: "N1", type: "finish_to_start" },
    { from: "N0", to: "N2", type: "finish_to_start" },
    { from: "N1", to: "N3", type: "finish_to_start" },
    { from: "N2", to: "N3", type: "finish_to_start" }
  ]
};

export const mockRules: Rule[] = [
  {
    id: "R1",
    name: "焊接时间规则",
    expression: "IF material == '不锈钢' THEN duration = base_duration * 1.2",
    ruleType: "time",
    scope: "焊接工序",
    isActive: true
  },
  {
    id: "R2",
    name: "压力容器规则",
    expression: "IF type == '压力容器' THEN require(['无损检测', '压力测试'])",
    ruleType: "quality",
    scope: "全局",
    isActive: true
  },
  {
    id: "R3",
    name: "焊接能耗规则",
    expression: "energy_cost = 25kW * duration * electricity_rate",
    ruleType: "cost",
    scope: "焊接机器人",
    isActive: true
  },
  {
    id: "R4",
    name: "设备折旧规则",
    expression: "depreciation = equipment_cost / lifecycle_hours * duration",
    ruleType: "cost",
    scope: "数控设备",
    isActive: true
  },
  {
    id: "R5",
    name: "钛合金物料规则",
    expression: "IF material == '钛合金' THEN loss_rate = 0.08; price = fetch_market_price()",
    ruleType: "cost",
    scope: "物料",
    isActive: true
  },
  {
    id: "R6",
    name: "焊接排产规则",
    expression: "ASSERT start(焊接) >= end(装配)",
    ruleType: "time",
    scope: "排产",
    isActive: true
  },
  {
    id: "R7",
    name: "合规认证规则",
    expression: "IF type == '压力容器' THEN require_process('ISO认证')",
    ruleType: "compliance",
    scope: "全局",
    isActive: true
  },
  {
    id: "R8",
    name: "预热逻辑规则",
    expression: "IF process == '主体焊接' AND material == 'M_STEEL' THEN require_predecessor('焊前预热')",
    ruleType: "logic",
    scope: "焊接工序",
    isActive: true
  },
  {
    id: "R9",
    name: "资源限制规则",
    expression: "ASSERT concurrent_usage(R_WELD_01) <= 2",
    ruleType: "resource",
    scope: "全局",
    isActive: true
  },
  {
    id: "R10",
    name: "定制化特殊材料成本分摊规则",
    expression: "IF material_type == '定制特殊材料' THEN material_cost = base_price * quantity * 1.5 + custom_processing_fee",
    ruleType: "cost",
    scope: "物料成本",
    isActive: true
  },
  {
    id: "R11",
    name: "非标工艺研发成本归集规则",
    expression: "IF process_category == '非标工艺' THEN R&D_cost = design_hours * engineer_rate + trial_cost + validation_cost",
    ruleType: "cost",
    scope: "研发成本",
    isActive: true
  },
  {
    id: "R12",
    name: "重型设备定制化使用的折旧分摊规则",
    expression: "IF equipment_type == '重型设备' AND usage_type == '定制' THEN depreciation_cost = (equipment_value * customization_factor) / custom_lifecycle_hours * usage_hours",
    ruleType: "cost",
    scope: "设备折旧",
    isActive: true
  }
];

export const mockGanttTasks: GanttTask[] = [
  { id: "N0", name: "设计与准备", start: "2026-03-15", end: "2026-03-20", resource: "R_ENG_01", progress: 100, dependencies: [], status: "completed" },
  { id: "N1", name: "焊接工序", start: "2026-03-21", end: "2026-03-30", resource: "R_WELD_01", progress: 40, dependencies: ["N0"], status: "delayed" },
  { id: "N2", name: "CNC机加工", start: "2026-03-21", end: "2026-03-28", resource: "R_CNC_01", progress: 60, dependencies: ["N0"], status: "running" },
  { id: "N3", name: "总装测试", start: "2026-03-31", end: "2026-04-06", resource: "R_ASSY_01", progress: 0, dependencies: ["N1", "N2"], status: "not_started" },
  { id: "N4", name: "返工焊接", start: "2026-03-27", end: "2026-03-31", resource: "R_WELD_01", progress: 0, dependencies: ["N1"], status: "not_started" }
];

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

export const mockOntologyGraph: OntologyGraph = {
  nodes: [
    // 工序1：设计与准备
    { id: 'DESIGN_PROCESS', type: 'process', name: '设计与准备', properties: { defaultTime: 8, riskLevel: 'medium' } },
    { id: 'DESIGN_ENGINEER', type: 'man', name: '设计工程师', properties: { unitPrice: 400, type: 'Senior' } },
    { id: 'CAD_SOFTWARE', type: 'machine', name: 'CAD工作站', properties: { power: 8, depreciation: 30 } },
    { id: 'BLUEPRINT', type: 'material', name: '设计图纸', properties: { unitPrice: 100, lossRate: 0 } },
    { id: 'DESIGN_RULE', type: 'rule', name: '设计规范', properties: { expression: 'compliance = ISO9001' } },
    { id: 'DESIGN_REVIEW', type: 'measurement', name: '设计评审', properties: { cost: 800, mandatory: true } },

    // 工序2：CNC机加工
    { id: 'CNC_PROCESS', type: 'process', name: 'CNC机加工', properties: { defaultTime: 15, riskLevel: 'high' } },
    { id: 'CNC_OPERATOR', type: 'man', name: 'CNC操作员', properties: { unitPrice: 250, type: 'Skilled' } },
    { id: 'CNC_MACHINE', type: 'machine', name: '五轴CNC机床', properties: { power: 45, depreciation: 120 } },
    { id: 'RAW_STEEL', type: 'material', name: '钢材原料', properties: { unitPrice: 80, lossRate: 0.1 } },
    { id: 'CNC_RULE', type: 'rule', name: 'CNC加工规范', properties: { expression: 'precision = 0.01mm' } },
    { id: 'QC_CNC', type: 'measurement', name: '尺寸检测', properties: { cost: 600, mandatory: true } },

    // 工序3：焊接工序（原有）
    { id: 'WELD_PROCESS', type: 'process', name: '焊接工序', properties: { defaultTime: 10, riskLevel: 'high' } },
    { id: 'WELDER', type: 'man', name: '高级焊工', properties: { unitPrice: 300, type: 'Senior' } },
    { id: 'WELD_MACHINE', type: 'machine', name: '焊机A', properties: { power: 15, depreciation: 50 } },
    { id: 'STEEL', type: 'material', name: '不锈钢', properties: { unitPrice: 50, lossRate: 0.05 } },
    { id: 'WELD_RULE', type: 'rule', name: '焊接效率规则', properties: { expression: 'efficiency = 0.8' } },
    { id: 'UT_TEST', type: 'measurement', name: 'UT检测', properties: { cost: 500, mandatory: true } },

    // 工序4：总装测试
    { id: 'ASSY_PROCESS', type: 'process', name: '总装测试', properties: { defaultTime: 12, riskLevel: 'medium' } },
    { id: 'ASSEMBLER', type: 'man', name: '装配钳工', properties: { unitPrice: 200, type: 'Skilled' } },
    { id: 'CRANE', type: 'machine', name: '行车', properties: { power: 30, depreciation: 80 } },
    { id: 'FASTENER', type: 'material', name: '紧固件', properties: { unitPrice: 5, lossRate: 0.03 } },
    { id: 'ASSY_RULE', type: 'rule', name: '装配SOP', properties: { expression: 'torque = standard' } },
    { id: 'LEAK_TEST', type: 'measurement', name: '气密性测试', properties: { cost: 1200, mandatory: true } },

    // 工序5：返工焊接
    { id: 'REWORK_PROCESS', type: 'process', name: '返工焊接', properties: { defaultTime: 6, riskLevel: 'high' } },
    { id: 'REWORK_WELDER', type: 'man', name: '返工焊工', properties: { unitPrice: 350, type: 'Expert' } },
    { id: 'REWORK_WELDER_MACHINE', type: 'machine', name: '手工焊机', properties: { power: 10, depreciation: 40 } },
    { id: 'FILLER_METAL', type: 'material', name: '焊丝', properties: { unitPrice: 30, lossRate: 0.15 } },
    { id: 'REWORK_RULE', type: 'rule', name: '返工规范', properties: { expression: 'only_if_defect = true' } },
    { id: 'REWORK_INSPECTION', type: 'measurement', name: '返工检验', properties: { cost: 700, mandatory: true } }
  ],
  edges: [
    // 设计与准备关联
    { id: 'e1_d', source: 'DESIGN_PROCESS', target: 'DESIGN_ENGINEER', type: 'uses' },
    { id: 'e2_d', source: 'DESIGN_PROCESS', target: 'CAD_SOFTWARE', type: 'uses' },
    { id: 'e3_d', source: 'DESIGN_PROCESS', target: 'BLUEPRINT', type: 'consumes' },
    { id: 'e4_d', source: 'DESIGN_PROCESS', target: 'DESIGN_RULE', type: 'constrained_by' },
    { id: 'e5_d', source: 'DESIGN_PROCESS', target: 'DESIGN_REVIEW', type: 'requires' },

    // CNC机加工关联
    { id: 'e1_c', source: 'CNC_PROCESS', target: 'CNC_OPERATOR', type: 'uses' },
    { id: 'e2_c', source: 'CNC_PROCESS', target: 'CNC_MACHINE', type: 'uses' },
    { id: 'e3_c', source: 'CNC_PROCESS', target: 'RAW_STEEL', type: 'consumes' },
    { id: 'e4_c', source: 'CNC_PROCESS', target: 'CNC_RULE', type: 'constrained_by' },
    { id: 'e5_c', source: 'CNC_PROCESS', target: 'QC_CNC', type: 'requires' },

    // 焊接工序关联（原有）
    { id: 'e1', source: 'WELD_PROCESS', target: 'WELDER', type: 'uses', constraints: { unique: true, no_parallel: true } },
    { id: 'e2', source: 'WELD_PROCESS', target: 'WELD_MACHINE', type: 'uses' },
    { id: 'e3', source: 'WELD_PROCESS', target: 'STEEL', type: 'consumes' },
    { id: 'e4', source: 'WELD_PROCESS', target: 'WELD_RULE', type: 'constrained_by' },
    { id: 'e5', source: 'WELD_PROCESS', target: 'UT_TEST', type: 'requires' },

    // 总装测试关联
    { id: 'e1_a', source: 'ASSY_PROCESS', target: 'ASSEMBLER', type: 'uses' },
    { id: 'e2_a', source: 'ASSY_PROCESS', target: 'CRANE', type: 'uses' },
    { id: 'e3_a', source: 'ASSY_PROCESS', target: 'FASTENER', type: 'consumes' },
    { id: 'e4_a', source: 'ASSY_PROCESS', target: 'ASSY_RULE', type: 'constrained_by' },
    { id: 'e5_a', source: 'ASSY_PROCESS', target: 'LEAK_TEST', type: 'requires' },

    // 返工焊接关联
    { id: 'e1_r', source: 'REWORK_PROCESS', target: 'REWORK_WELDER', type: 'uses' },
    { id: 'e2_r', source: 'REWORK_PROCESS', target: 'REWORK_WELDER_MACHINE', type: 'uses' },
    { id: 'e3_r', source: 'REWORK_PROCESS', target: 'FILLER_METAL', type: 'consumes' },
    { id: 'e4_r', source: 'REWORK_PROCESS', target: 'REWORK_RULE', type: 'constrained_by' },
    { id: 'e5_r', source: 'REWORK_PROCESS', target: 'REWORK_INSPECTION', type: 'requires' },

    // 工序间流程关系
    { id: 'flow1', source: 'DESIGN_PROCESS', target: 'CNC_PROCESS', type: 'follows' },
    { id: 'flow2', source: 'CNC_PROCESS', target: 'WELD_PROCESS', type: 'follows' },
    { id: 'flow3', source: 'WELD_PROCESS', target: 'ASSY_PROCESS', type: 'follows' },
    { id: 'flow4', source: 'ASSY_PROCESS', target: 'REWORK_PROCESS', type: 'affects' }
  ]
};

export interface SixMNode {
  id: string;
  type: SixMType;
  name: string;
  // Man
  count?: number;
  hourly_rate?: number;
  efficiency?: number;
  work_hours?: number;
  // Machine
  power_kw?: number;
  duration?: number;
  depreciation_per_hour?: number;
  // Material
  quantity?: number;
  unit_price?: number;
  loss_rate?: number;
  // Method
  standard_time?: number;
  constraints?: string[];
  // Environment
  temperature?: number;
  humidity?: number;
  impact_factor?: number;
  // Measurement
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

export const mockTaskNodePacks: TaskNodePack[] = [
  {
    task_id: "WELD_001",
    task_name: "压力容器焊接",
    node_pack: [
      {
        type: "man",
        nodes: [
          { id: "m1", type: "man", name: "高级焊工", count: 3, hourly_rate: 120, efficiency: 1.3, work_hours: 12 }
        ]
      },
      {
        type: "machine",
        nodes: [
          { id: "mc1", type: "machine", name: "焊接机器人A12", power_kw: 25, duration: 10, depreciation_per_hour: 250 }
        ]
      },
      {
        type: "material",
        nodes: [
          { id: "mat1", type: "material", name: "不锈钢板", quantity: 200, unit_price: 25, loss_rate: 0.08 }
        ]
      },
      {
        type: "method",
        nodes: [
          { id: "meth1", type: "method", name: "WPS焊接工艺", standard_time: 10, constraints: ["预热", "顺序焊接"] }
        ]
      },
      {
        type: "environment",
        nodes: [
          { id: "env1", type: "environment", name: "车间环境", temperature: 20, humidity: 60, impact_factor: 0.95 }
        ]
      },
      {
        type: "measurement",
        nodes: [
          { id: "meas1", type: "measurement", name: "UT检测", cost: 2000, mandatory: true }
        ]
      }
    ]
  },
  {
    task_id: "ASSY_001",
    task_name: "系统总装",
    node_pack: [
      { type: "man", nodes: [{ id: "m2", type: "man", name: "装配钳工", count: 5, hourly_rate: 80, efficiency: 1.0, work_hours: 16 }] },
      { type: "machine", nodes: [{ id: "mc2", type: "machine", name: "行车", power_kw: 50, duration: 4, depreciation_per_hour: 100 }] },
      { type: "material", nodes: [{ id: "mat2", type: "material", name: "紧固件套装", quantity: 1000, unit_price: 2, loss_rate: 0.05 }] },
      { type: "method", nodes: [{ id: "meth2", type: "method", name: "标准装配SOP", standard_time: 16, constraints: ["扭矩校验"] }] },
      { type: "environment", nodes: [{ id: "env2", type: "environment", name: "无尘车间", temperature: 22, humidity: 50, impact_factor: 1.0 }] },
      { type: "measurement", nodes: [{ id: "meas2", type: "measurement", name: "气密性测试", cost: 1500, mandatory: true }] }
    ]
  }
];

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
  {
    id: "PROC_WELD",
    name: "标准焊接工序",
    category: "制造",
    defaultDuration: 10,
    defaultResources: ["R_WELD_01"],
    defaultRules: ["RULE_WELD_TIME", "RULE_ENERGY_WELD"],
    subNodes: [
      { id: "sub_1", type: "process", name: "焊前预热", duration: 1, resources: ["R_HEAT_01"], materials: [], rules: [], plannedCost: { material: 0, labor: 500, equipment: 200, overhead: 100, energy: 500, total: 1300 }, riskScore: 10 },
      { id: "sub_2", type: "process", name: "主体焊接", duration: 7, resources: ["R_WELD_01"], materials: ["M_STEEL", "M_GAS"], rules: ["RULE_WELD_TIME", "RULE_ENERGY_WELD"], plannedCost: { material: 10000, labor: 6000, equipment: 3000, overhead: 800, energy: 2000, total: 21800 }, riskScore: 60 },
      { id: "sub_3", type: "process", name: "探伤检测(NDT)", duration: 2, resources: ["R_NDT_01"], materials: [], rules: ["RULE_QUALITY_NDT"], plannedCost: { material: 500, labor: 1500, equipment: 800, overhead: 100, energy: 100, total: 3000 }, riskScore: 30 }
    ],
    subEdges: [
      { from: "sub_1", to: "sub_2", type: "finish_to_start" },
      { from: "sub_2", to: "sub_3", type: "finish_to_start" }
    ]
  },
  {
    id: "PROC_ASSY",
    name: "标准总装测试",
    category: "装配",
    defaultDuration: 7,
    defaultResources: ["R_ASSY_01", "R_TEST_01"],
    defaultRules: ["RULE_PRESSURE_VESSEL", "RULE_COMPLIANCE"],
    subNodes: [
      { id: "sub_1", type: "process", name: "机械组装", duration: 4, resources: ["R_ASSY_01"], materials: ["M_FASTENERS"], rules: [], plannedCost: { material: 1000, labor: 4000, equipment: 1000, overhead: 400, energy: 200, total: 6600 }, riskScore: 20 },
      { id: "sub_2", type: "process", name: "电气接线", duration: 2, resources: ["R_ELEC_01"], materials: ["M_CABLE"], rules: ["RULE_ELEC_SAFETY"], plannedCost: { material: 800, labor: 3000, equipment: 500, overhead: 200, energy: 100, total: 4600 }, riskScore: 40 },
      { id: "sub_3", type: "process", name: "系统联调", duration: 1, resources: ["R_TEST_01"], materials: [], rules: ["RULE_PRESSURE_VESSEL"], plannedCost: { material: 200, labor: 3000, equipment: 1500, overhead: 200, energy: 700, total: 5600 }, riskScore: 80 }
    ],
    subEdges: [
      { from: "sub_1", to: "sub_2", type: "finish_to_start" },
      { from: "sub_2", to: "sub_3", type: "finish_to_start" }
    ]
  }
];

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
    description: '为钢铁厂定制的 500,000 m³/h 滤筒除尘器项目',
    template: '环保设备制造',
    nodes: mockGraph.nodes,
    edges: mockGraph.edges,
    ganttTasks: mockGanttTasks
  },
  {
    id: 'P002',
    name: '工业废水处理系统',
    description: '化工园区高浓度废水零排放处理系统',
    template: '水处理系统',
    nodes: [],
    edges: [],
    ganttTasks: []
  }
];
