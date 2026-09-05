/**
 * TaskFlow PR31: Load-Testing Harness Engine
 *
 * Deterministic concurrent worker pool with high-resolution latency tracking.
 */

import { RequestMetric, LatencyPercentiles, LoadTestReport, ScenarioName } from './types.js';

export function calculatePercentiles(latencies: number[]): LatencyPercentiles {
  if (latencies.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = Math.round((sum / sorted.length) * 100) / 100;

  const getPercentile = (p: number): number => {
    const rank = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const weight = rank - lower;
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 100) / 100;
  };

  return {
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    mean,
    p50: getPercentile(50),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}

export async function runLoadEngine(options: {
  scenario: ScenarioName;
  concurrency: number;
  totalRequests: number;
  timeoutMs: number;
  executeRequest: (
    index: number,
    signal: AbortSignal
  ) => Promise<{ status: number; success: boolean }>;
}): Promise<LoadTestReport> {
  const { scenario, concurrency, totalRequests, timeoutMs, executeRequest } = options;
  const metrics: RequestMetric[] = [];
  let currentIndex = 0;
  let activeWorkers = 0;

  const startTime = performance.now();

  return new Promise<LoadTestReport>(resolve => {
    const worker = async () => {
      while (currentIndex < totalRequests) {
        const reqIndex = currentIndex++;
        const reqStart = performance.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await executeRequest(reqIndex, controller.signal);
          clearTimeout(timer);
          const durationMs = performance.now() - reqStart;
          metrics.push({
            index: reqIndex,
            durationMs,
            status: res.status,
            success: res.success,
          });
        } catch (err: unknown) {
          clearTimeout(timer);
          const durationMs = performance.now() - reqStart;
          const isTimeout =
            controller.signal.aborted || (err instanceof Error && err.name === 'AbortError');

          metrics.push({
            index: reqIndex,
            durationMs,
            status: isTimeout ? 408 : 500,
            success: false,
            error: err instanceof Error ? err.message : String(err),
            timedOut: isTimeout,
          });
        }
      }

      activeWorkers--;
      if (activeWorkers === 0) {
        const totalDurationMs = performance.now() - startTime;
        const successfulRequests = metrics.filter(m => m.success).length;
        const failedRequests = metrics.filter(m => !m.success).length;
        const timedOutRequests = metrics.filter(m => m.timedOut).length;
        const errorRatePercent =
          totalRequests > 0 ? Math.round((failedRequests / totalRequests) * 10000) / 100 : 0;
        const throughputRps =
          totalDurationMs > 0
            ? Math.round((totalRequests / (totalDurationMs / 1000)) * 100) / 100
            : 0;

        const latencies = metrics.map(m => m.durationMs);
        const percentiles = calculatePercentiles(latencies);

        const report: LoadTestReport = {
          scenario,
          concurrency,
          totalRequests,
          successfulRequests,
          failedRequests,
          timedOutRequests,
          errorRatePercent,
          totalDurationMs: Math.round(totalDurationMs * 100) / 100,
          throughputRps,
          latency: percentiles,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'test',
        };

        resolve(report);
      }
    };

    const workerCount = Math.min(concurrency, totalRequests);
    activeWorkers = workerCount;
    for (let i = 0; i < workerCount; i++) {
      worker();
    }
  });
}
