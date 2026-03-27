/**
 * Simulation Engine
 * Supports multiple virtual contexts for what-if analysis
 *
 * Features:
 * - Multiple scenario management
 * - Parallel execution of scenarios
 * - Result comparison and diff analysis
 * - Impact path visualization
 */

import type {
  SimulationScenario,
  SimulationBatch,
  ExecutionContext,
  AggregatedResult,
} from './types';
import {
  SkillExecutionEngine,
  skillExecutionEngine,
} from './SkillExecutionEngine';
import { SkillCache, skillCache } from './SkillCache';
import type { IndustrialResource, ResourceSkillBinding } from '../types';

export interface SimulationOptions {
  maxScenarios: number;
  parallelExecution: boolean;
  preserveBaseContext: boolean;
}

const DEFAULT_SIMULATION_OPTIONS: SimulationOptions = {
  maxScenarios: 5,
  parallelExecution: true,
  preserveBaseContext: true,
};

export interface ScenarioComparison {
  baseScenario: SimulationScenario;
  compareScenarios: Array<{
    scenario: SimulationScenario;
    differences: {
      costDelta: number;
      durationDelta: number;
      profitDelta: number;
    };
    impactPath: string[];
  }>;
}

export class SimulationEngine {
  private executionEngine: SkillExecutionEngine;
  private cache: SkillCache;
  private options: SimulationOptions;
  private activeBatches: Map<string, SimulationBatch> = new Map();

  constructor(
    executionEngine: SkillExecutionEngine = skillExecutionEngine,
    cache: SkillCache = skillCache,
    options: Partial<SimulationOptions> = {}
  ) {
    this.executionEngine = executionEngine;
    this.cache = cache;
    this.options = { ...DEFAULT_SIMULATION_OPTIONS, ...options };
  }

  /**
   * Create a new simulation batch
   */
  createBatch(
    nodeId: string,
    baseContext: ExecutionContext,
    scenarioConfigs: Array<{
      name: string;
      description?: string;
      resourceOverrides: IndustrialResource[];
      contextOverrides?: Partial<ExecutionContext>;
    }>
  ): SimulationBatch {
    if (scenarioConfigs.length > this.options.maxScenarios) {
      throw new Error(
        `Maximum ${this.options.maxScenarios} scenarios allowed`
      );
    }

    const scenarios: SimulationScenario[] = scenarioConfigs.map((config, index) => ({
      id: `scenario_${nodeId}_${index}_${Date.now()}`,
      name: config.name,
      description: config.description,
      resourceOverrides: config.resourceOverrides,
      contextOverrides: config.contextOverrides || {},
    }));

    const batch: SimulationBatch = {
      id: `batch_${nodeId}_${Date.now()}`,
      nodeId,
      baseContext,
      scenarios,
      status: 'pending',
    };

    this.activeBatches.set(batch.id, batch);
    return batch;
  }

  /**
   * Execute a simulation batch
   */
  async executeBatch(batchId: string): Promise<SimulationBatch> {
    const batch = this.activeBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    batch.status = 'running';

    try {
      if (this.options.parallelExecution) {
        // Execute all scenarios in parallel
        const scenarioPromises = batch.scenarios.map((scenario) =>
          this.executeScenario(batch.baseContext, scenario)
        );
        batch.results = await Promise.all(scenarioPromises);
      } else {
        // Execute sequentially
        batch.results = [];
        for (const scenario of batch.scenarios) {
          const result = await this.executeScenario(batch.baseContext, scenario);
          batch.results.push(result);
        }
      }

      // Calculate metrics for each scenario
      const baseResult = batch.results[0];
      if (baseResult) {
        batch.scenarios.forEach((scenario, index) => {
          const result = batch.results?.[index];
          if (result && baseResult) {
            scenario.metrics = {
              costDelta: result.totalCost ? result.totalCost - (baseResult.totalCost || 0) : 0,
              durationDelta: result.duration ? result.duration - (baseResult.duration || 0) : 0,
              profitDelta: result.profit ? result.profit - (baseResult.profit || 0) : 0,
            };
          }
        });
      }

      batch.status = 'completed';
    } catch (error) {
      batch.status = 'pending';
      throw error;
    }

    return batch;
  }

  /**
   * Execute a single scenario
   */
  private async executeScenario(
    baseContext: ExecutionContext,
    scenario: SimulationScenario
  ): Promise<AggregatedResult> {
    // Clone base context
    const context: ExecutionContext = {
      ...baseContext,
      inputs: { ...baseContext.inputs },
      outputs: {},
      resources: this.options.preserveBaseContext
        ? [...baseContext.resources, ...scenario.resourceOverrides]
        : scenario.resourceOverrides,
      metadata: {
        ...baseContext.metadata,
        scenarioId: scenario.id,
      },
    };

    // Apply context overrides
    if (scenario.contextOverrides.inputs) {
      context.inputs = { ...context.inputs, ...scenario.contextOverrides.inputs };
    }

    // Check cache for simulation results
    const resourceIds = context.resources.map((r) => r.id);
    const cacheKey = {
      nodeId: context.nodeId,
      resourceHash: SkillCache.hashResources(resourceIds),
      skillVersion: context.metadata.version,
      scenarioId: scenario.id,
    };

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build bindings for the scenario resources
    const bindings = this.buildBindings(context.resources);

    // Build and execute DAG
    const dag = this.executionEngine.buildDAG(context, bindings);
    const result = await this.executionEngine.executeDAG(dag, context);

    // Cache with shorter TTL for simulations
    this.cache.set(cacheKey, result, 60); // 1 minute TTL for simulations

    return result;
  }

  /**
   * Build resource bindings for simulation
   */
  private buildBindings(resources: IndustrialResource[]): ResourceSkillBinding[] {
    const bindings: ResourceSkillBinding[] = [];

    resources.forEach((resource) => {
      resource.bound_skill_ids.forEach((skillId) => {
        bindings.push({
          id: `binding_${resource.id}_${skillId}_${Date.now()}`,
          resource_id: resource.id,
          skill_id: skillId,
          rule_id: 'simulation',
          input_overrides: {},
          status: 'active',
        });
      });
    });

    return bindings;
  }

  /**
   * Compare scenarios and generate impact analysis
   */
  compareScenarios(batchId: string): ScenarioComparison | null {
    const batch = this.activeBatches.get(batchId);
    if (!batch || !batch.results || batch.results.length < 2) {
      return null;
    }

    const baseScenario = batch.scenarios[0];
    const baseResult = batch.results[0];

    const compareScenarios = batch.scenarios.slice(1).map((scenario, index) => {
      const result = batch.results?.[index + 1];

      return {
        scenario,
        differences: {
          costDelta: result?.totalCost
            ? result.totalCost - (baseResult?.totalCost || 0)
            : 0,
          durationDelta: result?.duration
            ? result.duration - (baseResult?.duration || 0)
            : 0,
          profitDelta: result?.profit
            ? result.profit - (baseResult?.profit || 0)
            : 0,
        },
        impactPath: this.analyzeImpactPath(baseResult, result),
      };
    });

    return {
      baseScenario,
      compareScenarios,
    };
  }

  /**
   * Analyze impact path between two results
   */
  private analyzeImpactPath(
    baseResult?: AggregatedResult,
    compareResult?: AggregatedResult
  ): string[] {
    const path: string[] = [];

    if (!baseResult || !compareResult) return path;

    // Compare breakdowns
    const baseBreakdown = baseResult.breakdown;
    const compareBreakdown = compareResult.breakdown;

    Object.keys(compareBreakdown).forEach((key) => {
      const baseValue = baseBreakdown[key] || 0;
      const compareValue = compareBreakdown[key] || 0;
      if (Math.abs(compareValue - baseValue) > 0.01) {
        path.push(`${key}: ${baseValue} → ${compareValue}`);
      }
    });

    return path;
  }

  /**
   * Quick simulation - single scenario execution
   */
  async quickSimulate(
    baseContext: ExecutionContext,
    resourceOverrides: IndustrialResource[],
    contextOverrides?: Partial<ExecutionContext>
  ): Promise<AggregatedResult> {
    const scenario: SimulationScenario = {
      id: `quick_${Date.now()}`,
      name: 'Quick Simulation',
      resourceOverrides,
      contextOverrides: contextOverrides || {},
    };

    return this.executeScenario(baseContext, scenario);
  }

  /**
   * Get active batch
   */
  getBatch(batchId: string): SimulationBatch | undefined {
    return this.activeBatches.get(batchId);
  }

  /**
   * Get all active batches
   */
  getAllBatches(): SimulationBatch[] {
    return Array.from(this.activeBatches.values());
  }

  /**
   * Clear completed batches
   */
  clearCompletedBatches(): void {
    for (const [id, batch] of this.activeBatches.entries()) {
      if (batch.status === 'completed') {
        this.activeBatches.delete(id);
      }
    }
  }

  /**
   * Cancel a running batch
   */
  cancelBatch(batchId: string): void {
    const batch = this.activeBatches.get(batchId);
    if (batch && batch.status === 'running') {
      batch.status = 'pending';
    }
  }
}

// Singleton instance
export const simulationEngine = new SimulationEngine();

// Factory function
export function createSimulationEngine(
  executionEngine?: SkillExecutionEngine,
  cache?: SkillCache,
  options?: Partial<SimulationOptions>
): SimulationEngine {
  return new SimulationEngine(executionEngine, cache, options);
}
