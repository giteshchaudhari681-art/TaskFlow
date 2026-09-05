/**
 * TaskFlow PR31: Load-Testing Harness Type Definitions
 */

export type ScenarioName =
  | 'health'
  | 'readiness'
  | 'projects'
  | 'tasks'
  | 'search'
  | 'dashboard'
  | 'notifications'
  | 'audit'
  | 'usage'
  | 'ai';

export interface LoadScenarioOptions {
  scenario: ScenarioName;
  concurrency: number;
  totalRequests: number;
  timeoutMs: number;
  baseUrl: string;
}

export interface ScenarioContext {
  baseUrl: string;
  timeoutMs: number;
  token?: string;
  orgId?: string;
  projectId?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface RequestMetric {
  index: number;
  durationMs: number;
  status: number;
  success: boolean;
  error?: string;
  timedOut?: boolean;
}

export interface LatencyPercentiles {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface LoadTestReport {
  scenario: ScenarioName;
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timedOutRequests: number;
  errorRatePercent: number;
  totalDurationMs: number;
  throughputRps: number;
  latency: LatencyPercentiles;
  timestamp: string;
  environment: string;
}
