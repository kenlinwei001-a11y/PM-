/**
 * Skill Cache System
 * Provides caching for Skill execution results to improve performance
 *
 * Features:
 * - Node-level strong caching
 * - Simulation temporary caching
 * - LRU eviction policy
 * - TTL-based expiration
 */

import type { CacheKey, CacheEntry, AggregatedResult } from './types';

export interface CacheOptions {
  maxSize: number;
  defaultTTL: number; // seconds
  checkInterval: number; // ms
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  maxSize: 1000,
  defaultTTL: 300, // 5 minutes
  checkInterval: 60000, // 1 minute
};

export class SkillCache {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private hits = 0;
  private misses = 0;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
    this.startCleanup();
  }

  /**
   * Generate cache key from components
   */
  static generateKey(key: CacheKey): string {
    const parts = [
      key.nodeId,
      key.resourceHash,
      key.skillVersion,
      key.scenarioId || 'default',
    ];
    return parts.join('::');
  }

  /**
   * Hash resources for cache key
   */
  static hashResources(resourceIds: string[]): string {
    return resourceIds.sort().join(',');
  }

  /**
   * Get cached result
   */
  get(key: CacheKey): AggregatedResult | null {
    const cacheKey = SkillCache.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl * 1000) {
      this.cache.delete(cacheKey);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.result;
  }

  /**
   * Store result in cache
   */
  set(key: CacheKey, result: AggregatedResult, customTTL?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const cacheKey = SkillCache.generateKey(key);
    const entry: CacheEntry = {
      key,
      result,
      timestamp: Date.now(),
      ttl: customTTL ?? this.options.defaultTTL,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Invalidate cache entries by node ID
   */
  invalidateByNode(nodeId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.key.nodeId === nodeId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache entries by project
   */
  invalidateByProject(projectId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.result.executionTrace.context.metadata.projectId === projectId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.checkInterval);
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const skillCache = new SkillCache();

// Factory function
export function createSkillCache(options: Partial<CacheOptions>): SkillCache {
  return new SkillCache(options);
}
