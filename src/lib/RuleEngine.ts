import { GraphNode, Rule, Project } from '../types';

export interface ValidationResult {
  nodeId: string;
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message: string;
  severity: 'warning' | 'error' | 'info';
}

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();

  constructor(rules: Rule[]) {
    rules.forEach(rule => this.rules.set(rule.id, rule));
  }

  evaluateNode(node: GraphNode, project: Project): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Evaluate rules bound to the node
    node.rules.forEach(ruleId => {
      const rule = this.rules.get(ruleId) || this.rules.get(this.findRuleByName(ruleId));
      if (rule && rule.isActive) {
        results.push(this.evaluateRule(rule, node, project));
      }
    });

    // Evaluate global rules
    Array.from(this.rules.values())
      .filter(r => r.scope === '全局' && r.isActive)
      .forEach(rule => {
        // Avoid duplicate evaluation if already bound specifically
        if (!node.rules.includes(rule.id) && !node.rules.includes(rule.name)) {
           results.push(this.evaluateRule(rule, node, project));
        }
      });

    return results;
  }

  evaluateProject(project: Project): ValidationResult[] {
    let allResults: ValidationResult[] = [];
    project.nodes.forEach(node => {
      allResults = allResults.concat(this.evaluateNode(node, project));
    });
    return allResults;
  }

  private findRuleByName(name: string): string {
    const rule = Array.from(this.rules.values()).find(r => r.name === name);
    return rule ? rule.id : '';
  }

  private evaluateRule(rule: Rule, node: GraphNode, project: Project): ValidationResult {
    // In a real system, this would use a proper expression parser (e.g., AST, jsep, or a rules engine library)
    // Here we simulate the evaluation based on the rule name/expression for demonstration.
    
    let passed = true;
    let message = `Rule ${rule.name} passed.`;
    let severity: 'warning' | 'error' | 'info' = 'info';

    if (rule.name === 'RULE_WELD_TIME') {
      // "IF material == '不锈钢' THEN duration = base_duration * 1.2"
      if (node.materials.includes('M_STEEL') && node.duration < 10) {
        passed = false;
        message = `焊接工时不足: 包含钢材/不锈钢，建议工期至少10天 (当前 ${node.duration}天)`;
        severity = 'warning';
      }
    } else if (rule.name === 'RULE_ENERGY_WELD') {
      // "energy_cost = 25kW * duration * electricity_rate"
      if (node.plannedCost.energy === undefined || node.plannedCost.energy < node.duration * 100) {
         passed = false;
         message = `能耗预估偏低: 焊接设备能耗可能超过预算`;
         severity = 'warning';
      }
    } else if (rule.name === 'RULE_PRESSURE_VESSEL') {
      if (node.name.includes('压力容器') || project.name.includes('压力容器')) {
         const hasTesting = project.nodes.some(n => n.name.includes('测试') || n.name.includes('检测'));
         if (!hasTesting) {
            passed = false;
            message = `合规性缺失: 压力容器项目必须包含无损检测或压力测试节点`;
            severity = 'error';
         }
      }
    } else if (rule.name === 'RULE_SCHEDULE_WELD') {
       // "ASSERT start(焊接) >= end(装配)" -> Mock logic
       const weldTasks = project.ganttTasks.filter(t => t.name.includes('焊接'));
       const assyTasks = project.ganttTasks.filter(t => t.name.includes('装配'));
       
       weldTasks.forEach(w => {
         assyTasks.forEach(a => {
           if (new Date(w.start) < new Date(a.end)) {
             passed = false;
             message = `排产冲突: 焊接 (${w.name}) 不能在装配 (${a.name}) 完成前开始`;
             severity = 'error';
           }
         });
       });
    } else if (rule.name === 'RULE_LOGIC_PREHEAT') {
      if (node.name.includes('焊接') && node.materials.includes('M_STEEL')) {
        const hasPreheat = project.edges.some(e => e.to === node.id && project.nodes.find(n => n.id === e.from)?.name.includes('预热'));
        if (!hasPreheat) {
          passed = false;
          message = `工艺逻辑缺失: 钢材焊接必须包含前置预热工序`;
          severity = 'error';
        }
      }
    } else if (rule.name === 'RULE_RESOURCE_LIMIT') {
      // Check concurrent usage of R_WELD_01
      const weldTasks = project.ganttTasks.filter(t => t.resource === 'R_WELD_01');
      // A simple mock check for overlapping tasks
      let maxConcurrent = 0;
      for (let i = 0; i < weldTasks.length; i++) {
        let concurrent = 1;
        for (let j = 0; j < weldTasks.length; j++) {
          if (i !== j) {
            const start1 = new Date(weldTasks[i].start);
            const end1 = new Date(weldTasks[i].end);
            const start2 = new Date(weldTasks[j].start);
            const end2 = new Date(weldTasks[j].end);
            if (start1 < end2 && start2 < end1) {
              concurrent++;
            }
          }
        }
        if (concurrent > maxConcurrent) maxConcurrent = concurrent;
      }
      if (maxConcurrent > 2) {
        passed = false;
        message = `资源超载: R_WELD_01 并发使用量 (${maxConcurrent}) 超过上限 (2)`;
        severity = 'error';
      }
    }

    return {
      nodeId: node.id,
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      message,
      severity
    };
  }
}
