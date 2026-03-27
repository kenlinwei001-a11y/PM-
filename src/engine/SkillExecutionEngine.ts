/**
 * Skill Execution Engine
 * Industrial-grade computation engine for executing Skill DAGs
 *
 * Features:
 * - DAG construction from resources and skills
 * - Topological sorting for dependency resolution
 * - Parallel execution of independent skills
 * - Context sharing and data flow
 * - Error handling and retry logic
 * - Event emission for monitoring
 */

import type {
  Skill,
  IndustrialResource,
  ResourceSkillBinding,
} from '../types';
import {
  type ExecutionContext,
  type SkillDAG,
  type SkillDAGNode,
  type SkillExecutionResult,
  type AggregatedResult,
  type ExecutionTrace,
  type SkillExplanation,
  type ExecutorConfig,
  type ExecutionEvent,
  type ExecutionEventHandler,
  DEFAULT_EXECUTOR_CONFIG,
} from './types';
import { INDUSTRIAL_SKILLS } from '../types';

export class SkillExecutionEngine {
  private config: ExecutorConfig;
  private eventHandlers: ExecutionEventHandler[] = [];
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
  }

  // ============ Event System ============

  onEvent(handler: ExecutionEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private emit(event: Omit<ExecutionEvent, 'timestamp'>): void {
    const fullEvent: ExecutionEvent = {
      ...event,
      timestamp: Date.now(),
    };
    this.eventHandlers.forEach((handler) => handler(fullEvent));
  }

  // ============ DAG Builder ============

  /**
   * Build a Skill DAG from resources and bindings
   */
  buildDAG(
    context: ExecutionContext,
    bindings: ResourceSkillBinding[]
  ): SkillDAG {
    const dagId = `dag_${context.nodeId}_${Date.now()}`;
    const nodes: SkillDAGNode[] = [];
    const skillMap = new Map<string, Skill>();

    // Load skills from bindings
    bindings.forEach((binding) => {
      const skill = INDUSTRIAL_SKILLS.find((s) => s.id === binding.skill_id);
      if (skill && !skillMap.has(skill.id)) {
        skillMap.set(skill.id, skill);
      }
    });

    // Create DAG nodes
    skillMap.forEach((skill, skillId) => {
      const binding = bindings.find((b) => b.skill_id === skillId);
      const node: SkillDAGNode = {
        id: `node_${skillId}`,
        skillId: skill.id,
        skillCode: skill.code,
        name: skill.name,
        dependencies: this.resolveDependencies(skill, skillMap),
        inputMapping: this.buildInputMapping(skill, context),
        outputs: skill.outputs.map((o) => o.name),
        status: 'pending',
      };
      nodes.push(node);
    });

    // Calculate topological order
    const executionOrder = this.topologicalSort(nodes);
    const parallelGroups = this.identifyParallelGroups(nodes, executionOrder);

    return {
      id: dagId,
      nodeId: context.nodeId,
      nodes,
      executionOrder,
      parallelGroups,
    };
  }

  /**
   * Resolve dependencies between skills based on input/output relationships
   */
  private resolveDependencies(
    skill: Skill,
    allSkills: Map<string, Skill>
  ): string[] {
    const dependencies: string[] = [];

    skill.inputs.forEach((input) => {
      // Check if input comes from another skill's output
      if (input.source === 'skill_output') {
        allSkills.forEach((otherSkill, otherId) => {
          if (
            otherSkill.id !== skill.id &&
            otherSkill.outputs.some((o) => o.name === input.name)
          ) {
            dependencies.push(`node_${otherId}`);
          }
        });
      }
    });

    return [...new Set(dependencies)];
  }

  /**
   * Build input mapping for a skill
   */
  private buildInputMapping(
    skill: Skill,
    context: ExecutionContext
  ): Record<string, string> {
    const mapping: Record<string, string> = {};

    skill.inputs.forEach((input) => {
      switch (input.source) {
        case 'node':
          mapping[input.name] = `context.inputs.${input.name}`;
          break;
        case 'resource':
          mapping[input.name] = `context.resources.${input.name}`;
          break;
        case 'system':
          mapping[input.name] = `context.system.${input.name}`;
          break;
        case 'user':
          mapping[input.name] = `context.user.${input.name}`;
          break;
        case 'skill_output':
          // Will be resolved from previous skill outputs
          mapping[input.name] = `skill_output.${input.name}`;
          break;
      }
    });

    return mapping;
  }

  // ============ Topological Sort ============

  /**
   * Perform topological sort on DAG nodes
   */
  private topologicalSort(nodes: SkillDAGNode[]): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const visit = (nodeId: string, path: string[] = []): void => {
      if (temp.has(nodeId)) {
        // Circular dependency detected
        const cycle = [...path, nodeId].slice(path.indexOf(nodeId));
        throw new Error(
          `Circular dependency detected: ${cycle.join(' -> ')}`
        );
      }

      if (visited.has(nodeId)) return;

      temp.add(nodeId);
      const node = nodeMap.get(nodeId);

      if (node) {
        node.dependencies.forEach((depId) => {
          visit(depId, [...path, nodeId]);
        });
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    });

    return order;
  }

  /**
   * Identify groups of nodes that can execute in parallel
   */
  private identifyParallelGroups(
    nodes: SkillDAGNode[],
    executionOrder: string[]
  ): string[][] {
    const groups: string[][] = [];
    const completed = new Set<string>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    let remaining = [...executionOrder];

    while (remaining.length > 0) {
      const group: string[] = [];
      const nextRemaining: string[] = [];

      for (const nodeId of remaining) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // Check if all dependencies are completed
        const allDepsCompleted = node.dependencies.every((depId) =>
          completed.has(depId)
        );

        if (allDepsCompleted) {
          group.push(nodeId);
        } else {
          nextRemaining.push(nodeId);
        }
      }

      if (group.length === 0 && nextRemaining.length > 0) {
        // This shouldn't happen if topological sort is correct
        throw new Error('Unable to resolve dependencies');
      }

      if (group.length > 0) {
        groups.push(group);
        group.forEach((id) => completed.add(id));
      }

      remaining = nextRemaining;
    }

    return groups;
  }

  // ============ Execution ============

  /**
   * Execute a complete DAG
   */
  async executeDAG(
    dag: SkillDAG,
    context: ExecutionContext
  ): Promise<AggregatedResult> {
    const abortController = new AbortController();
    this.abortControllers.set(dag.id, abortController);

    const startTime = performance.now();
    const skillResults: SkillExecutionResult[] = [];
    const errors: ExecutionTrace['errors'] = [];

    try {
      this.emit({
        type: 'execution.started',
        dagId: dag.id,
        nodeId: context.nodeId,
      });

      // Execute by parallel groups
      for (const group of dag.parallelGroups) {
        if (abortController.signal.aborted) {
          throw new Error('Execution aborted');
        }

        // Execute group in parallel
        const groupPromises = group.map(async (nodeId) => {
          const node = dag.nodes.find((n) => n.id === nodeId);
          if (!node) return null;

          return this.executeSkillNode(node, context, abortController.signal);
        });

        const results = await Promise.all(groupPromises);

        // Process results
        results.forEach((result) => {
          if (result) {
            skillResults.push(result);

            if (result.status === 'error') {
              errors.push({
                skillId: result.skillId,
                error: result.explanation?.formula || 'Unknown error',
                timestamp: Date.now(),
              });
            }

            // Update context outputs for downstream skills
            Object.entries(result.outputs).forEach(([key, value]) => {
              context.outputs[key] = value;
            });

            // Update node status
            const node = dag.nodes.find((n) => n.id === result.skillId);
            if (node) {
              node.status = result.status === 'success' ? 'completed' : 'failed';
              node.result = result;
            }
          }
        });
      }

      const executionTime = performance.now() - startTime;

      // Aggregate results
      const aggregated = this.aggregateResults(
        dag,
        context,
        skillResults,
        errors,
        executionTime
      );

      this.emit({
        type: errors.length > 0 ? 'execution.failed' : 'execution.completed',
        dagId: dag.id,
        nodeId: context.nodeId,
        data: { result: aggregated },
      });

      return aggregated;
    } finally {
      this.abortControllers.delete(dag.id);
    }
  }

  /**
   * Execute a single skill node
   */
  private async executeSkillNode(
    node: SkillDAGNode,
    context: ExecutionContext,
    signal: AbortSignal
  ): Promise<SkillExecutionResult> {
    const skill = INDUSTRIAL_SKILLS.find((s) => s.id === node.skillId);
    if (!skill) {
      return {
        skillId: node.skillId,
        skillCode: node.skillCode,
        status: 'error',
        outputs: {},
        executionTime: 0,
        timestamp: Date.now(),
        explanation: {
          formula: 'Skill not found',
          inputs: {},
          result: null,
        },
      };
    }

    this.emit({
      type: 'skill.started',
      dagId: context.nodeId,
      nodeId: context.nodeId,
      skillId: node.skillId,
    });

    const startTime = performance.now();
    node.status = 'running';

    try {
      // Prepare inputs
      const inputs = this.resolveInputs(node, context);

      // Execute skill logic
      const outputs = await this.runSkillLogic(skill, inputs, signal);

      const executionTime = performance.now() - startTime;

      const result: SkillExecutionResult = {
        skillId: node.skillId,
        skillCode: skill.code,
        status: 'success',
        outputs,
        executionTime,
        timestamp: Date.now(),
        explanation: this.buildExplanation(skill, inputs, outputs),
      };

      this.emit({
        type: 'skill.completed',
        dagId: context.nodeId,
        nodeId: context.nodeId,
        skillId: node.skillId,
        data: { result },
      });

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      const result: SkillExecutionResult = {
        skillId: node.skillId,
        skillCode: skill.code,
        status: 'error',
        outputs: {},
        executionTime,
        timestamp: Date.now(),
        explanation: {
          formula: error instanceof Error ? error.message : 'Execution failed',
          inputs: this.resolveInputs(node, context),
          result: null,
        },
      };

      this.emit({
        type: 'skill.failed',
        dagId: context.nodeId,
        nodeId: context.nodeId,
        skillId: node.skillId,
        data: { error },
      });

      return result;
    }
  }

  /**
   * Resolve inputs for a skill from context
   */
  private resolveInputs(
    node: SkillDAGNode,
    context: ExecutionContext
  ): Record<string, any> {
    const inputs: Record<string, any> = {};
    const skill = INDUSTRIAL_SKILLS.find((s) => s.id === node.skillId);

    Object.entries(node.inputMapping).forEach(([param, source]) => {
      if (source.startsWith('context.')) {
        const path = source.replace('context.', '');
        // Handle resources array specially
        if (path.startsWith('resources.')) {
          const attrName = path.replace('resources.', '');
          // Find the resource that has this attribute
          const resource = context.resources.find((r) => {
            // Check direct property
            if ((r as any)[attrName] !== undefined) return true;
            // Check attributes object
            if (r.attributes && r.attributes[attrName as keyof typeof r.attributes] !== undefined) return true;
            // Check unit_cost as fallback for unit_price
            if (attrName === 'unit_price' && r.unit_cost !== undefined) return true;
            return false;
          });
          if (resource) {
            inputs[param] = (resource as any)[attrName] ??
              resource.attributes?.[attrName as keyof typeof resource.attributes] ??
              (attrName === 'unit_price' ? resource.unit_cost : undefined);
          } else {
            // Use default value from skill input definition
            const inputDef = skill?.inputs.find((i) => i.name === param);
            inputs[param] = inputDef?.default_value;
          }
        } else if (path.startsWith('inputs.')) {
          const inputName = path.replace('inputs.', '');
          inputs[param] = context.inputs[inputName];
        } else if (path.startsWith('system.')) {
          const systemName = path.replace('system.', '');
          // System defaults
          const systemDefaults: Record<string, any> = {
            electricity_price: 0.8,
            overhead_rate: 0.35,
            qc_rate: 0.02,
          };
          inputs[param] = systemDefaults[systemName];
        } else {
          inputs[param] = this.getValueFromPath(context, path);
        }
      } else if (source.startsWith('skill_output.')) {
        const outputKey = source.replace('skill_output.', '');
        inputs[param] = context.outputs[outputKey];
      }
    });

    return inputs;
  }

  /**
   * Get value from nested path
   */
  private getValueFromPath(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Execute skill logic based on type
   */
  private async runSkillLogic(
    skill: Skill,
    inputs: Record<string, any>,
    signal: AbortSignal
  ): Promise<Record<string, any>> {
    if (signal.aborted) {
      throw new Error('Execution aborted');
    }

    const outputs: Record<string, any> = {};

    switch (skill.logic.type) {
      case 'formula': {
        const formula = skill.logic.content as string;
        // Parse and execute formula
        // This is a simplified version - in production, use a proper formula engine
        const result = this.evaluateFormula(formula, inputs);
        Object.assign(outputs, result);
        break;
      }

      case 'condition': {
        const conditions = skill.logic.content as Array<{
          condition: string;
          [key: string]: any;
        }>;

        for (const cond of conditions) {
          if (cond.condition === 'default' || this.evaluateCondition(cond.condition, inputs)) {
            Object.assign(outputs, cond);
            delete (outputs as any).condition;
            break;
          }
        }
        break;
      }

      case 'subskill': {
        // Subskills would be handled by the DAG builder
        // This is just for leaf skills
        outputs.result = inputs;
        break;
      }

      default:
        outputs.result = inputs;
    }

    return outputs;
  }

  /**
   * Evaluate a mathematical formula
   * Note: In production, use a proper formula parser like mathjs
   */
  private evaluateFormula(
    formula: string,
    inputs: Record<string, any>
  ): Record<string, any> {
    const outputs: Record<string, any> = {};

    // Simple formula parsing for common patterns
    // Format: "output_name = expression"
    const lines = formula.split(';').map((l) => l.trim());

    const context = { ...inputs, ...outputs };

    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        const [, outputName, expression] = match;

        // Simple expression evaluation
        // Replace variable names with values
        let evaluatedExpr = expression;
        Object.entries(context).forEach(([key, value]) => {
          evaluatedExpr = evaluatedExpr.replace(
            new RegExp(`\\b${key}\\b`, 'g'),
            String(value ?? 0)
          );
        });

        try {
          // Safe evaluation - only allow math operations
          // eslint-disable-next-line no-new-func
          const result = new Function(`return (${evaluatedExpr})`)();
          outputs[outputName] = result;
          context[outputName] = result;
        } catch {
          outputs[outputName] = 0;
        }
      }
    }

    return outputs;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: string,
    inputs: Record<string, any>
  ): boolean {
    // Simple condition evaluation
    // Format: "field == value" or "field > value" etc.
    try {
      let expr = condition;

      // Replace input references
      Object.entries(inputs).forEach(([key, value]) => {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      });

      // eslint-disable-next-line no-new-func
      return new Function(`return (${expr})`)();
    } catch {
      return false;
    }
  }

  /**
   * Build explanation for a skill execution
   */
  private buildExplanation(
    skill: Skill,
    inputs: Record<string, any>,
    outputs: Record<string, any>
  ): SkillExplanation {
    const formula =
      skill.logic.type === 'formula'
        ? String(skill.logic.content)
        : `${skill.logic.type} based`;

    const steps: SkillExplanation['intermediateSteps'] = [];

    if (skill.logic.type === 'formula') {
      Object.entries(outputs).forEach(([key, value], index) => {
        steps.push({
          step: index + 1,
          description: `Calculate ${key}`,
          value,
        });
      });
    }

    return {
      formula,
      inputs,
      intermediateSteps: steps,
      result: outputs,
    };
  }

  // ============ Result Aggregation ============

  /**
   * Aggregate all skill results into final output
   */
  private aggregateResults(
    dag: SkillDAG,
    context: ExecutionContext,
    skillResults: SkillExecutionResult[],
    errors: ExecutionTrace['errors'],
    executionTime: number
  ): AggregatedResult {
    const breakdown: AggregatedResult['breakdown'] = {};
    let totalCost = 0;
    let duration = 0;

    // Aggregate cost components
    skillResults.forEach((result) => {
      if (result.status === 'success') {
        // Check for cost outputs
        if (result.outputs.material_cost !== undefined) {
          breakdown.material = (breakdown.material || 0) + result.outputs.material_cost;
          totalCost += result.outputs.material_cost;
        }
        if (result.outputs.labor_cost !== undefined) {
          breakdown.labor = (breakdown.labor || 0) + result.outputs.labor_cost;
          totalCost += result.outputs.labor_cost;
        }
        if (result.outputs.energy_cost !== undefined) {
          breakdown.energy = (breakdown.energy || 0) + result.outputs.energy_cost;
          totalCost += result.outputs.energy_cost;
        }
        if (result.outputs.depreciation_cost !== undefined) {
          breakdown.depreciation = (breakdown.depreciation || 0) + result.outputs.depreciation_cost;
          totalCost += result.outputs.depreciation_cost;
        }
        // Additional cost types from new skills
        if (result.outputs.line_cost !== undefined) {
          breakdown.line = (breakdown.line || 0) + result.outputs.line_cost;
          totalCost += result.outputs.line_cost;
        }
        if (result.outputs.workstation_cost !== undefined) {
          breakdown.workstation = (breakdown.workstation || 0) + result.outputs.workstation_cost;
          totalCost += result.outputs.workstation_cost;
        }
        if (result.outputs.cert_cost !== undefined) {
          breakdown.certification = (breakdown.certification || 0) + result.outputs.cert_cost;
          totalCost += result.outputs.cert_cost;
        }
        if (result.outputs.install_cost !== undefined) {
          breakdown.installation = (breakdown.installation || 0) + result.outputs.install_cost;
          totalCost += result.outputs.install_cost;
        }
        if (result.outputs.travel_cost !== undefined) {
          breakdown.travel = (breakdown.travel || 0) + result.outputs.travel_cost;
          totalCost += result.outputs.travel_cost;
        }
        if (result.outputs.logistics_cost !== undefined) {
          breakdown.logistics = (breakdown.logistics || 0) + result.outputs.logistics_cost;
          totalCost += result.outputs.logistics_cost;
        }
        if (result.outputs.allocated_cost !== undefined) {
          breakdown.allocated = (breakdown.allocated || 0) + result.outputs.allocated_cost;
          totalCost += result.outputs.allocated_cost;
        }
        if (result.outputs.overhead_cost !== undefined) {
          breakdown.overhead = (breakdown.overhead || 0) + result.outputs.overhead_cost;
          totalCost += result.outputs.overhead_cost;
        }
        if (result.outputs.qc_cost !== undefined) {
          breakdown.quality = (breakdown.quality || 0) + result.outputs.qc_cost;
          totalCost += result.outputs.qc_cost;
        }
        // Comprehensive total_cost override
        if (result.outputs.total_cost !== undefined) {
          totalCost = result.outputs.total_cost;
        }
        if (result.outputs.duration !== undefined) {
          duration = result.outputs.duration;
        }
      }
    });

    const status: AggregatedResult['status'] =
      errors.length > 0
        ? errors.length === skillResults.length
          ? 'error'
          : 'partial'
        : 'success';

    return {
      nodeId: context.nodeId,
      status,
      totalCost,
      duration,
      breakdown,
      executionTrace: {
        dagId: dag.id,
        context,
        skillResults,
        errors,
      },
      timestamp: Date.now(),
      executionTime,
    };
  }

  // ============ Control ============

  /**
   * Abort a running execution
   */
  abort(dagId: string): void {
    const controller = this.abortControllers.get(dagId);
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Abort all running executions
   */
  abortAll(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }
}

// Singleton instance
export const skillExecutionEngine = new SkillExecutionEngine();

// Factory function for custom configs
export function createSkillExecutionEngine(
  config: Partial<ExecutorConfig>
): SkillExecutionEngine {
  return new SkillExecutionEngine(config);
}
