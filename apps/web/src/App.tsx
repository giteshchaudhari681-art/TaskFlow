import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  GitBranch,
  Brain,
  ShieldCheck,
  Server,
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Boxes,
  Workflow,
  Sparkles,
} from 'lucide-react';
import type { HealthCheckData } from '@taskflow/shared';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setHealth(json.data);
      } else {
        throw new Error(json.error?.message || 'Unexpected response format');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to API server';
      setError(msg);
      setHealth(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-taskflow-bg text-taskflow-text flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-taskflow-border px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-0.5 shadow-glow-cyan flex items-center justify-center">
              <div className="w-full h-full bg-taskflow-surface rounded-[10px] flex items-center justify-center">
                <Workflow className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">TaskFlow</span>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded-md">
                  v0.1.0 • PR 1
                </span>
              </div>
              <p className="text-xs text-taskflow-muted">AI-Powered Project Operations Platform</p>
            </div>
          </div>

          {/* System Health Indicator Badge */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-xs">
              <span className="text-taskflow-muted">API Status:</span>
              {loading && !health ? (
                <span className="flex items-center text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Connecting...
                </span>
              ) : health?.status === 'healthy' ? (
                <span className="flex items-center text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5 shadow-[0_0_8px_#34d399]" />
                  Operational
                </span>
              ) : (
                <span className="flex items-center text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Disconnected
                </span>
              )}
            </div>

            <button
              onClick={fetchHealth}
              disabled={loading}
              title="Refresh Health Status"
              className="p-2 rounded-lg bg-taskflow-surface hover:bg-taskflow-card-hover border border-taskflow-border text-taskflow-muted hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Hero & Vision Banner */}
        <section className="relative overflow-hidden rounded-2xl glass-panel p-8 border border-taskflow-border">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/10 to-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Foundation Architecture Blueprint</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              A serious operations engine for modern engineering teams.
            </h1>
            <p className="text-taskflow-text-dim text-base leading-relaxed">
              TaskFlow goes beyond generic task management. It combines deterministic dependency
              graphs, real-time collaboration, and proactive AI delivery intelligence to help teams
              ship complex projects on time.
            </p>
          </div>
        </section>

        {/* System Health Card */}
        <section className="glass-card rounded-xl p-6 border border-taskflow-border space-y-4">
          <div className="flex items-center justify-between border-b border-taskflow-border pb-4">
            <div className="flex items-center space-x-2.5">
              <Server className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-white text-base">Backend Health Probe</h2>
            </div>
            <span className="text-xs text-taskflow-muted font-mono">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          </div>

          {error ? (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Backend connection offline</p>
                <p className="text-xs text-rose-400/80 mt-1">
                  Start the API server using{' '}
                  <code className="bg-rose-900/60 px-1.5 py-0.5 rounded font-mono">
                    npm run dev:api
                  </code>{' '}
                  to establish live telemetry.
                </p>
              </div>
            </div>
          ) : health ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">Service</span>
                <span className="font-mono text-sm font-semibold text-cyan-300">
                  {health.service}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">Status</span>
                <span className="font-semibold text-sm text-emerald-400 uppercase flex items-center mt-0.5">
                  <CheckCircle2 className="w-4 h-4 mr-1 inline" />
                  {health.status}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">Environment</span>
                <span className="font-mono text-sm font-medium text-white capitalize">
                  {health.environment}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">Uptime</span>
                <span className="font-mono text-sm font-medium text-white">
                  {health.uptimeSeconds}s
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-taskflow-muted">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-cyan-400" />
              Verifying backend status...
            </div>
          )}
        </section>

        {/* Planned Product Architecture Pillars */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">
              Platform Pillars (Roadmap Blueprint)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1 */}
            <div className="glass-card p-5 rounded-xl border border-taskflow-border hover:border-cyan-500/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">Project Execution</h3>
              <p className="text-xs text-taskflow-muted mt-2 leading-relaxed">
                Multi-tier work hierarchy: Projects, Objectives, Tasks, Subtasks, and Milestones
                with fine-grained status lifecycle.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="glass-card p-5 rounded-xl border border-taskflow-border hover:border-indigo-500/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">Dependency Graphs</h3>
              <p className="text-xs text-taskflow-muted mt-2 leading-relaxed">
                Deterministic DAG blocking dependencies, critical path detection, and cascade delay
                warnings across timeline views.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="glass-card p-5 rounded-xl border border-taskflow-border hover:border-purple-500/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">Real-Time Operations</h3>
              <p className="text-xs text-taskflow-muted mt-2 leading-relaxed">
                Low-latency state synchronization via Socket.IO, live presence, collaborative task
                updates, and instant notification stream.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="glass-card p-5 rounded-xl border border-taskflow-border hover:border-emerald-500/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">AI Delivery Intelligence</h3>
              <p className="text-xs text-taskflow-muted mt-2 leading-relaxed">
                Automated task breakdowns, workload balancing, risk detection, schedule compression
                recommendations, and daily digests.
              </p>
            </div>
          </div>
        </section>

        {/* Design System Baseline Showcase */}
        <section className="glass-card rounded-xl p-6 border border-taskflow-border space-y-4">
          <div className="flex items-center justify-between border-b border-taskflow-border pb-4">
            <div className="flex items-center space-x-2.5">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white text-base">
                Design System & Semantic Tokens
              </h2>
            </div>
            <span className="text-xs text-taskflow-muted">Tailwind CSS + Custom Tokens</span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-taskflow-muted uppercase tracking-wider block mb-2 font-medium">
                Task Status Tokens
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  Backlog
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-sky-950/70 text-sky-300 border border-sky-800/60">
                  Todo
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-amber-950/70 text-amber-300 border border-amber-800/60">
                  In Progress
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
                  In Review
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-rose-950/70 text-rose-300 border border-rose-800/60">
                  Blocked
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                  Done
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-taskflow-muted uppercase tracking-wider block mb-2 font-medium">
                Priority Scale
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-xs rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                  Urgent (P0)
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  High (P1)
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Medium (P2)
                </span>
                <span className="px-2.5 py-1 text-xs rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Low (P3)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PR 1 Scope Boundary Notice */}
        <section className="rounded-xl border border-taskflow-border bg-taskflow-surface/60 p-5 flex items-start space-x-3.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-white">PR 1 Scope Boundary</span>
            <p className="text-taskflow-muted leading-relaxed">
              This milestone intentionally implements only the core foundation, build pipeline,
              health probes, monorepo packages, and architecture documentation. Authentication,
              database schema migrations, project workspaces, and AI operations are scheduled for
              upcoming PRs.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-taskflow-border py-4 px-6 text-center text-xs text-taskflow-muted">
        TaskFlow Monorepo Architecture • PR 1 Complete • Ready for PR 2
      </footer>
    </div>
  );
};
