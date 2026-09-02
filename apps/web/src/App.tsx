import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  GitBranch,
  Brain,
  ShieldCheck,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Boxes,
  Workflow,
  LogOut,
  Building2,
} from 'lucide-react';
import type { HealthCheckData } from '@taskflow/shared';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';

const MainApp: React.FC = () => {
  const { user, activeOrg, organizations, setActiveOrg, isAuthenticated, isLoading, logout } =
    useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
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
      setHealthError(msg);
      setHealth(null);
    } finally {
      setHealthLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-taskflow-bg text-taskflow-text flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-sm text-taskflow-muted">Restoring secure session...</p>
        </div>
      </div>
    );
  }

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
                  v0.3.0 • PR 3
                </span>
              </div>
              <p className="text-xs text-taskflow-muted">AI-Powered Project Operations Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* System Health Indicator Badge */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-xs">
              <span className="text-taskflow-muted">API:</span>
              {healthLoading && !health ? (
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
                  Offline
                </span>
              )}
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                {/* Organization / Workspace Selector */}
                {organizations.length > 0 && activeOrg && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-xs">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <select
                      value={activeOrg.organizationId}
                      onChange={e => {
                        const found = organizations.find(o => o.organizationId === e.target.value);
                        if (found) setActiveOrg(found);
                      }}
                      className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                    >
                      {organizations.map(org => (
                        <option
                          key={org.organizationId}
                          value={org.organizationId}
                          className="bg-taskflow-surface text-white"
                        >
                          {org.organizationName} ({org.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Authenticated User Pill */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border text-xs text-white">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden md:inline font-medium">{user.name}</span>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  title="Sign out of current session"
                  className="p-2 rounded-lg bg-taskflow-surface hover:bg-rose-950/40 border border-taskflow-border hover:border-rose-800/60 text-taskflow-muted hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              title="Refresh Health Status"
              className="p-2 rounded-lg bg-taskflow-surface hover:bg-taskflow-card-hover border border-taskflow-border text-taskflow-muted hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {!isAuthenticated ? (
          <div className="py-6 space-y-8">
            {authView === 'login' ? (
              <LoginPage onSwitchToRegister={() => setAuthView('register')} />
            ) : (
              <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        ) : (
          <>
            {/* Authenticated Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl glass-panel p-8 border border-taskflow-border">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/10 to-indigo-600/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authenticated Session Active • PR 3</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Welcome back, {user?.name}.
                </h1>
                <p className="text-taskflow-text-dim text-base leading-relaxed">
                  Active workspace:{' '}
                  <span className="text-cyan-300 font-semibold">
                    {activeOrg?.organizationName || 'Personal Workspace'}
                  </span>{' '}
                  (Role:{' '}
                  <span className="text-indigo-300 font-mono font-medium">{activeOrg?.role}</span>).
                  Your access tokens are securely managed in client memory with automatic HTTP-only
                  refresh token rotation.
                </p>
              </div>
            </section>
          </>
        )}

        {/* System Health Card (Always visible to inspect live PostgreSQL status) */}
        <section className="glass-card rounded-xl p-6 border border-taskflow-border space-y-4">
          <div className="flex items-center justify-between border-b border-taskflow-border pb-4">
            <div className="flex items-center space-x-2.5">
              <Server className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-white text-base">
                Backend & Database Health Probe
              </h2>
            </div>
            <span className="text-xs text-taskflow-muted font-mono">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          </div>

          {healthError ? (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">Service</span>
                <span className="font-mono text-sm font-semibold text-cyan-300">
                  {health.service}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">API Status</span>
                <span className="font-semibold text-sm text-emerald-400 uppercase flex items-center mt-0.5">
                  <CheckCircle2 className="w-4 h-4 mr-1 inline" />
                  {health.status}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-taskflow-surface border border-taskflow-border">
                <span className="text-xs text-taskflow-muted block">Database</span>
                <span
                  className={`font-semibold text-sm flex items-center mt-0.5 ${
                    health.database?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {health.database?.status === 'connected' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1 inline" />
                      Connected
                      {health.database.latencyMs !== undefined
                        ? ` (${health.database.latencyMs}ms)`
                        : ''}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-1 inline" />
                      Offline
                    </>
                  )}
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

        {/* PR 3 Scope Boundary Notice */}
        <section className="rounded-xl border border-taskflow-border bg-taskflow-surface/60 p-5 flex items-start space-x-3.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-white">
              PR 3 Authentication & Authorization Foundation
            </span>
            <p className="text-taskflow-muted leading-relaxed">
              This milestone establishes the complete authentication engine: Dual-token JWT
              architecture, cryptographically hashed session rotation in PostgreSQL, transactional
              registration with automatic OWNER workspace provisioning, and multi-tenant RBAC
              middleware. Project and task CRUD operations are scheduled for upcoming PRs.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-taskflow-border py-4 px-6 text-center text-xs text-taskflow-muted">
        TaskFlow Operations Platform • PR 3 Authentication Complete • Ready for PR 4
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};
