/**
 * Skill Store - Zustand state management for Skill execution
 *
 * Features:
 * - Real-time skill result updates
 * - Node-level state management
 * - Simulation state management
 * - Debounced recalculation
 * - WebSocket-ready architecture
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  AggregatedResult,
  ExecutionContext,
  SimulationScenario,
  SimulationBatch,
} from '../engine/types';
import {
  SkillExecutionEngine,
  skillExecutionEngine,
} from '../engine/SkillExecutionEngine';
import { SimulationEngine, simulationEngine } from '../engine/SimulationEngine';
import { skillCache } from '../engine/SkillCache';
import type { IndustrialResource, ResourceSkillBinding } from '../types';

// ============ State Types ============

export interface NodeSkillState {
  nodeId: string;
  status: 'idle' | 'calculating' | 'success' | 'error' | 'partial';
  result?: AggregatedResult;
  lastUpdated: number;
  error?: string;
}

export interface SimulationState {
  activeBatchId?: string;
  scenarios: SimulationScenario[];
  results: Record<string, AggregatedResult>;
  comparing: boolean;
  selectedScenarioIds: string[];
}

export interface SkillStoreState {
  // Node skill results
  nodeResults: Record<string, NodeSkillState>;

  // Simulation state
  simulation: SimulationState;

  // Global settings
  config: {
    autoRecalculate: boolean;
    debounceMs: number;
    showExplanations: boolean;
  };

  // Execution engines (singletons)
  executionEngine: SkillExecutionEngine;
  simulationEngine: SimulationEngine;

  // Loading states
  isCalculating: boolean;
  calculatingNodes: Set<string>;
}

export interface SkillStoreActions {
  // Node result actions
  setNodeResult: (nodeId: string, result: AggregatedResult) => void;
  setNodeError: (nodeId: string, error: string) => void;
  setNodeCalculating: (nodeId: string, calculating: boolean) => void;
  clearNodeResult: (nodeId: string) => void;

  // Execution actions
  executeNode: (
    nodeId: string,
    context: ExecutionContext,
    bindings: ResourceSkillBinding[]
  ) => Promise<AggregatedResult>;

  executeMultipleNodes: (
    nodeConfigs: Array<{
      nodeId: string;
      context: ExecutionContext;
      bindings: ResourceSkillBinding[];
    }>
  ) => Promise<Record<string, AggregatedResult>>;

  // Simulation actions
  createSimulation: (
    nodeId: string,
    baseContext: ExecutionContext,
    scenarios: Array<{
      name: string;
      description?: string;
      resourceOverrides: IndustrialResource[];
      contextOverrides?: Partial<ExecutionContext>;
    }>
  ) => Promise<SimulationBatch>;

  runSimulation: (batchId: string) => Promise<SimulationBatch>;
  selectScenario: (scenarioId: string, selected: boolean) => void;
  clearSimulation: () => void;

  // Cache actions
  invalidateCache: (nodeId?: string) => void;
  getCacheStats: () => ReturnType<typeof skillCache.getStats>;

  // Config actions
  setAutoRecalculate: (enabled: boolean) => void;
  setDebounceMs: (ms: number) => void;
  setShowExplanations: (show: boolean) => void;

  // Batch operations
  recalculateAll: (
    nodes: Array<{
      nodeId: string;
      context: ExecutionContext;
      bindings: ResourceSkillBinding[];
    }>
  ) => Promise<void>;

  // Reset
  reset: () => void;
}

// ============ Initial State ============

const initialState: Omit<
  SkillStoreState,
  'executionEngine' | 'simulationEngine'
> = {
  nodeResults: {},
  simulation: {
    scenarios: [],
    results: {},
    comparing: false,
    selectedScenarioIds: [],
  },
  config: {
    autoRecalculate: true,
    debounceMs: 300,
    showExplanations: true,
  },
  isCalculating: false,
  calculatingNodes: new Set(),
};

// ============ Store Creation ============

export const useSkillStore = create<
  SkillStoreState & SkillStoreActions
>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      executionEngine: skillExecutionEngine,
      simulationEngine: simulationEngine,

      // ============ Node Result Actions ============

      setNodeResult: (nodeId, result) => {
        set(
          (state) => ({
            nodeResults: {
              ...state.nodeResults,
              [nodeId]: {
                nodeId,
                status: result.status,
                result,
                lastUpdated: Date.now(),
              },
            },
          }),
          false,
          'skill/setNodeResult'
        );
      },

      setNodeError: (nodeId, error) => {
        set(
          (state) => ({
            nodeResults: {
              ...state.nodeResults,
              [nodeId]: {
                nodeId,
                status: 'error',
                error,
                lastUpdated: Date.now(),
              },
            },
          }),
          false,
          'skill/setNodeError'
        );
      },

      setNodeCalculating: (nodeId, calculating) => {
        set(
          (state) => {
            const newCalculatingNodes = new Set(state.calculatingNodes);
            if (calculating) {
              newCalculatingNodes.add(nodeId);
            } else {
              newCalculatingNodes.delete(nodeId);
            }
            return {
              calculatingNodes: newCalculatingNodes,
              isCalculating: newCalculatingNodes.size > 0,
              nodeResults: {
                ...state.nodeResults,
                [nodeId]: {
                  ...state.nodeResults[nodeId],
                  nodeId,
                  status: calculating ? 'calculating' : state.nodeResults[nodeId]?.status || 'idle',
                  lastUpdated: Date.now(),
                },
              },
            };
          },
          false,
          'skill/setNodeCalculating'
        );
      },

      clearNodeResult: (nodeId) => {
        set(
          (state) => {
            const { [nodeId]: _, ...rest } = state.nodeResults;
            return { nodeResults: rest };
          },
          false,
          'skill/clearNodeResult'
        );
      },

      // ============ Execution Actions ============

      executeNode: async (nodeId, context, bindings) => {
        const { executionEngine, setNodeResult, setNodeError, setNodeCalculating } = get();

        setNodeCalculating(nodeId, true);

        try {
          // Check cache first
          const resourceIds = context.resources.map((r) => r.id);
          const cacheKey = {
            nodeId,
            resourceHash: skillCache.constructor.name + resourceIds.sort().join(','),
            skillVersion: context.metadata.version,
          };

          const cached = skillCache.get(cacheKey);
          if (cached) {
            setNodeResult(nodeId, cached);
            setNodeCalculating(nodeId, false);
            return cached;
          }

          // Build and execute DAG
          const dag = executionEngine.buildDAG(context, bindings);
          const result = await executionEngine.executeDAG(dag, context);

          // Cache result
          skillCache.set(cacheKey, result);

          setNodeResult(nodeId, result);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Execution failed';
          setNodeError(nodeId, errorMessage);
          throw error;
        } finally {
          setNodeCalculating(nodeId, false);
        }
      },

      executeMultipleNodes: async (nodeConfigs) => {
        const { executeNode } = get();
        const results: Record<string, AggregatedResult> = {};

        // Execute in parallel
        const promises = nodeConfigs.map(async (config) => {
          try {
            const result = await executeNode(
              config.nodeId,
              config.context,
              config.bindings
            );
            results[config.nodeId] = result;
          } catch (error) {
            console.error(`Failed to execute node ${config.nodeId}:`, error);
          }
        });

        await Promise.all(promises);
        return results;
      },

      // ============ Simulation Actions ============

      createSimulation: async (nodeId, baseContext, scenarios) => {
        const { simulationEngine } = get();
        const batch = simulationEngine.createBatch(nodeId, baseContext, scenarios);

        set(
          (state) => ({
            simulation: {
              ...state.simulation,
              activeBatchId: batch.id,
              scenarios: batch.scenarios,
            },
          }),
          false,
          'skill/createSimulation'
        );

        return batch;
      },

      runSimulation: async (batchId) => {
        const { simulationEngine } = get();

        set(
          (state) => ({
            simulation: { ...state.simulation, comparing: true },
          }),
          false,
          'skill/runSimulation/start'
        );

        try {
          const batch = await simulationEngine.executeBatch(batchId);

          // Update results
          const results: Record<string, AggregatedResult> = {};
          batch.results?.forEach((result, index) => {
            const scenarioId = batch.scenarios[index]?.id;
            if (scenarioId) {
              results[scenarioId] = result;
            }
          });

          set(
            (state) => ({
              simulation: {
                ...state.simulation,
                results,
                comparing: false,
              },
            }),
            false,
            'skill/runSimulation/complete'
          );

          return batch;
        } catch (error) {
          set(
            (state) => ({
              simulation: { ...state.simulation, comparing: false },
            }),
            false,
            'skill/runSimulation/error'
          );
          throw error;
        }
      },

      selectScenario: (scenarioId, selected) => {
        set(
          (state) => {
            const selectedIds = new Set(state.simulation.selectedScenarioIds);
            if (selected) {
              selectedIds.add(scenarioId);
            } else {
              selectedIds.delete(scenarioId);
            }
            return {
              simulation: {
                ...state.simulation,
                selectedScenarioIds: Array.from(selectedIds),
              },
            };
          },
          false,
          'skill/selectScenario'
        );
      },

      clearSimulation: () => {
        set(
          (state) => ({
            simulation: {
              scenarios: [],
              results: {},
              comparing: false,
              selectedScenarioIds: [],
            },
          }),
          false,
          'skill/clearSimulation'
        );
      },

      // ============ Cache Actions ============

      invalidateCache: (nodeId) => {
        if (nodeId) {
          skillCache.invalidateByNode(nodeId);
        } else {
          skillCache.clear();
        }
      },

      getCacheStats: () => {
        return skillCache.getStats();
      },

      // ============ Config Actions ============

      setAutoRecalculate: (enabled) => {
        set(
          (state) => ({
            config: { ...state.config, autoRecalculate: enabled },
          }),
          false,
          'skill/setAutoRecalculate'
        );
      },

      setDebounceMs: (ms) => {
        set(
          (state) => ({
            config: { ...state.config, debounceMs: ms },
          }),
          false,
          'skill/setDebounceMs'
        );
      },

      setShowExplanations: (show) => {
        set(
          (state) => ({
            config: { ...state.config, showExplanations: show },
          }),
          false,
          'skill/setShowExplanations'
        );
      },

      // ============ Batch Operations ============

      recalculateAll: async (nodes) => {
        const { executeMultipleNodes } = get();
        await executeMultipleNodes(nodes);
      },

      // ============ Reset ============

      reset: () => {
        skillCache.clear();
        set(initialState, false, 'skill/reset');
      },
    })),
    {
      name: 'SkillStore',
    }
  )
);

// ============ Selectors ============

export const selectNodeResult = (nodeId: string) => (state: SkillStoreState) =>
  state.nodeResults[nodeId];

export const selectNodeCost = (nodeId: string) => (state: SkillStoreState) =>
  state.nodeResults[nodeId]?.result?.totalCost;

export const selectNodeDuration = (nodeId: string) => (state: SkillStoreState) =>
  state.nodeResults[nodeId]?.result?.duration;

export const selectNodeBreakdown = (nodeId: string) => (state: SkillStoreState) =>
  state.nodeResults[nodeId]?.result?.breakdown;

export const selectIsNodeCalculating = (nodeId: string) => (state: SkillStoreState) =>
  state.calculatingNodes.has(nodeId);

export const selectSimulationResults = (state: SkillStoreState) =>
  state.simulation.results;

export const selectSimulationComparison = (state: SkillStoreState) => {
  const { results, selectedScenarioIds } = state.simulation;
  if (selectedScenarioIds.length < 2) return null;

  const baseResult = results[selectedScenarioIds[0]];
  const comparisons = selectedScenarioIds.slice(1).map((id) => ({
    scenarioId: id,
    result: results[id],
    delta: {
      cost: (results[id]?.totalCost || 0) - (baseResult?.totalCost || 0),
      duration: (results[id]?.duration || 0) - (baseResult?.duration || 0),
    },
  }));

  return { baseResult, comparisons };
};

// ============ Hooks ============

export function useNodeSkillResult(nodeId: string) {
  return useSkillStore(selectNodeResult(nodeId));
}

export function useNodeCost(nodeId: string) {
  return useSkillStore(selectNodeCost(nodeId));
}

export function useNodeDuration(nodeId: string) {
  return useSkillStore(selectNodeDuration(nodeId));
}

export function useNodeBreakdown(nodeId: string) {
  return useSkillStore(selectNodeBreakdown(nodeId));
}

export function useIsNodeCalculating(nodeId: string) {
  return useSkillStore(selectIsNodeCalculating(nodeId));
}
