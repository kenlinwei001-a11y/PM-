/**
 * Skill Execution Engine - Core Types
 * Industrial-grade computation engine for cost/duration/constraint calculation
 */

import type { Skill, IndustrialResource, ResourceSkillBinding } from '../types';

// ============ Execution Context ============

export interface ExecutionContext {
  nodeId: string;
  nodeType: string;
  resources: IndustrialResource[];
  bindings: ResourceSkillBinding[];
  // Input values from resources/node/system
  inputs: Record<string, any>;
  // Intermediate and final results
  outputs: Record<string, any>;
  // Metadata
  metadata: {
    projectId?: string;
    scenarioId?: string;
    startTime: number;
    version: string;
  };
}

// ============ Skill DAG ============

export interface SkillDAGNode {
  id: string;
  skillId: string;
  skillCode: string;
  name: string;
  // Dependencies: skill IDs that must execute before this one
  dependencies: string[];
  // Input mapping: parameter name -> source (context key or other skill output)
  inputMapping: Record<string, string>;
  // Output definitions
  outputs: string[];
  // Execution status
  status: 'pending' | 'running' | 'completed' | 'failed';
  // Execution result
  result?: SkillExecutionResult;
  // Error info
  error?: string;
}

export interface SkillDAG {
  id: string;
  nodeId: string;
  nodes: SkillDAGNode[];
  // Topological order for sequential execution
  executionOrder: string[];
  // Parallel groups: nodes that can execute concurrently
  parallelGroups: string[][];
}

// ============ Execution Results ============

export interface SkillExecutionResult {
  skillId: string;
  skillCode: string;
  status: 'success' | 'error' | 'partial';
  outputs: Record<string, any>;
  executionTime: number;
  timestamp: number;
  // Explainability
  explanation: SkillExplanation;
}

export interface SkillExplanation {
  formula: string;
  inputs: Record<string, any>;
  intermediateSteps?: Array<{
    step: number;
    description: string;
    value: any;
  }>;
  result: any;
}

export interface AggregatedResult {
  nodeId: string;
  status: 'success' | 'error' | 'partial';
  totalCost?: number;
  duration?: number;
  profit?: number;
  // Cost breakdown
  breakdown: {
    labor?: number;
    material?: number;
    energy?: number;
    depreciation?: number;
    overhead?: number;
    [key: string]: number | undefined;
  };
  // Full execution trace
  executionTrace: ExecutionTrace;
  // Timestamp
  timestamp: number;
  executionTime: number;
}

export interface ExecutionTrace {
  dagId: string;
  context: ExecutionContext;
  skillResults: SkillExecutionResult[];
  errors: Array<{
    skillId: string;
    error: string;
    timestamp: number;
  }>;
}

// ============ Cache ============

export interface CacheKey {
  nodeId: string;
  resourceHash: string;
  skillVersion: string;
  scenarioId?: string;
}

export interface CacheEntry {
  key: CacheKey;
  result: AggregatedResult;
  timestamp: number;
  ttl: number;
}

// ============ Simulation ============

export interface SimulationScenario {
  id: string;
  name: string;
  description?: string;
  // Modified context values
  contextOverrides: Partial<ExecutionContext>;
  // Modified resource selections
  resourceOverrides: IndustrialResource[];
  // Result
  result?: AggregatedResult;
  // Comparison metrics
  metrics?: {
    costDelta?: number;
    durationDelta?: number;
    profitDelta?: number;
  };
}

export interface SimulationBatch {
  id: string;
  nodeId: string;
  baseContext: ExecutionContext;
  scenarios: SimulationScenario[];
  status: 'pending' | 'running' | 'completed';
  results?: AggregatedResult[];
}

// ============ Executor Configuration ============

export interface ExecutorConfig {
  // Parallel execution
  maxConcurrency: number;
  // Timeout per skill (ms)
  skillTimeout: number;
  // Total DAG timeout (ms)
  dagTimeout: number;
  // Retry attempts
  maxRetries: number;
  // Cache configuration
  cache: {
    enabled: boolean;
    ttl: number; // seconds
  };
  // Explainability
  captureExplanation: boolean;
  // Debug mode
  debug: boolean;
}

export const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  maxConcurrency: 4,
  skillTimeout: 5000,
  dagTimeout: 30000,
  maxRetries: 2,
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
  },
  captureExplanation: true,
  debug: false,
};

// ============ Events ============

export type ExecutionEventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'skill.started'
  | 'skill.completed'
  | 'skill.failed'
  | 'cache.hit'
  | 'cache.miss';

export interface ExecutionEvent {
  type: ExecutionEventType;
  timestamp: number;
  dagId: string;
  nodeId: string;
  skillId?: string;
  data?: any;
}

export type ExecutionEventHandler = (event: ExecutionEvent) => void;
