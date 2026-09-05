/**
 * TaskFlow PR31: Load-Testing Harness CLI Runner
 *
 * Usage:
 *   npx tsx scripts/load/runner.ts --scenario health --concurrency 10 --requests 100
 */

import { runLoadEngine } from './engine.js';
import { scenarios, setupAuthContext } from './scenarios.js';
import { LoadScenarioOptions, ScenarioName, LoadTestReport } from './types.js';

function parseArgs(args: string[]): LoadScenarioOptions {
  const options: LoadScenarioOptions = {
    scenario: 'health',
    concurrency: 5,
    totalRequests: 25,
    timeoutMs: 10000,
    baseUrl: process.env.LOAD_BASE_URL || 'http://localhost:5000',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--scenario' && args[i + 1]) {
      options.scenario = args[++i] as ScenarioName;
    } else if (arg === '--concurrency' && args[i + 1]) {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--requests' && args[i + 1]) {
      options.totalRequests = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeoutMs = parseInt(args[++i], 10);
    } else if (arg === '--baseUrl' && args[i + 1]) {
      options.baseUrl = args[++i];
    }
  }

  return options;
}

export function formatReportTable(report: LoadTestReport): string {
  const lines: string[] = [
    '========================================================================',
    '                 TASKFLOW LOAD TEST HARNESS REPORT (PR31)              ',
    '========================================================================',
    `Scenario:            ${report.scenario.toUpperCase()}`,
    `Base URL:            ${process.env.LOAD_BASE_URL || 'http://localhost:5000'}`,
    `Environment:         ${report.environment}`,
    `Timestamp:           ${report.timestamp}`,
    '------------------------------------------------------------------------',
    `Concurrency:         ${report.concurrency} workers`,
    `Total Requests:      ${report.totalRequests}`,
    `Successful Requests: ${report.successfulRequests}`,
    `Failed Requests:     ${report.failedRequests}`,
    `Timed Out Requests:  ${report.timedOutRequests}`,
    `Error Rate:          ${report.errorRatePercent.toFixed(2)}%`,
    `Total Duration:      ${report.totalDurationMs.toFixed(2)} ms (${(report.totalDurationMs / 1000).toFixed(2)}s)`,
    `Throughput:          ${report.throughputRps.toFixed(2)} req/sec`,
    '------------------------------------------------------------------------',
    'LATENCY DISTRIBUTION (Milliseconds):',
    `  Min:               ${report.latency.min.toFixed(2)} ms`,
    `  Mean:              ${report.latency.mean.toFixed(2)} ms`,
    `  p50 (Median):      ${report.latency.p50.toFixed(2)} ms`,
    `  p90:               ${report.latency.p90.toFixed(2)} ms`,
    `  p95:               ${report.latency.p95.toFixed(2)} ms`,
    `  p99:               ${report.latency.p99.toFixed(2)} ms`,
    `  Max:               ${report.latency.max.toFixed(2)} ms`,
    '========================================================================',
    'NOTE: These measurements are environment-specific and capture resource  ',
    'behavior under local/CI conditions. They do not constitute universal    ',
    'production capacity guarantees or hardware-agnostic SLA boundaries.      ',
    '========================================================================',
  ];
  return lines.join('\n');
}

import http from 'http';
import { createServer } from '../../apps/api/src/server.js';

async function isServerReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/v1/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const definition = scenarios[options.scenario];
  if (!definition) {
    console.error(`Unknown scenario: ${options.scenario}`);
    console.error(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
    process.exit(1);
  }

  let ephemeralServer: http.Server | null = null;
  const isTargetLive = await isServerReachable(options.baseUrl);

  if (
    !isTargetLive &&
    (options.baseUrl.includes('localhost') || options.baseUrl.includes('127.0.0.1'))
  ) {
    console.log(
      `[Load Runner] Target ${options.baseUrl} is not currently running. Starting standalone in-process TaskFlow server...`
    );
    const app = createServer();
    await new Promise<void>(resolve => {
      ephemeralServer = app.listen(0, '127.0.0.1', () => {
        const address = ephemeralServer?.address();
        if (address && typeof address === 'object') {
          options.baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
    console.log(`[Load Runner] Standalone in-process server listening on ${options.baseUrl}`);
  }

  console.log(`\nInitializing TaskFlow load test: [${options.scenario}]`);
  console.log(
    `Target: ${options.baseUrl} | Concurrency: ${options.concurrency} | Total Requests: ${options.totalRequests}`
  );

  let context: any = {
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
  };

  try {
    if (definition.requiresAuth) {
      console.log('Bootstrapping isolated test tenant and session...');
      try {
        context = await setupAuthContext(options.baseUrl, options.timeoutMs);
        console.log(`Authenticated as user: ${context.user?.email} (Org: ${context.orgId})`);
      } catch (err) {
        console.error('Failed to setup auth context for scenario:', err);
        process.exit(1);
      }
    }

    console.log('Running load engine...\n');
    const report = await runLoadEngine({
      scenario: options.scenario,
      concurrency: options.concurrency,
      totalRequests: options.totalRequests,
      timeoutMs: options.timeoutMs,
      executeRequest: (index, signal) => definition.execute(index, signal, context),
    });

    console.log(formatReportTable(report));

    if (report.failedRequests > 0) {
      if (report.errorRatePercent > 50) {
        process.exit(1);
      }
    }
  } finally {
    if (ephemeralServer) {
      await new Promise<void>(res => (ephemeralServer as http.Server).close(() => res()));
    }
  }
}

main().catch(err => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
