import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Sparkles,
  Users,
  FolderGit2,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usageApi } from '../../lib/api';
import { OrganizationUsage, Plan, UserRole } from '@taskflow/shared';

export const UsageSettings: React.FC = () => {
  const { activeOrg } = useAuth();
  const [usage, setUsage] = useState<OrganizationUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(Plan.FREE);

  const isOwner = activeOrg?.role === UserRole.OWNER;
  const isAdmin = activeOrg?.role === UserRole.ADMIN || isOwner;

  const fetchUsage = async () => {
    if (!activeOrg || !isAdmin) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await usageApi.getUsage(activeOrg.organizationId);
      setUsage(data);
      setSelectedPlan(data.plan);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load organization usage';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [activeOrg]);

  const handleUpdatePlan = async () => {
    if (!activeOrg || !isOwner || selectedPlan === usage?.plan) return;
    try {
      setUpdatingPlan(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await usageApi.updatePlan(activeOrg.organizationId, selectedPlan);
      setSuccessMsg(`Workspace subscription plan updated to ${selectedPlan}`);
      await fetchUsage();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update workspace plan';
      setErrorMsg(msg);
    } finally {
      setUpdatingPlan(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6" data-testid="usage-unauthorized">
        <div className="flex items-center space-x-3 pb-4 border-b border-taskflow-border">
          <Gauge className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Usage & Plan</h2>
            <p className="text-xs text-taskflow-muted">
              Workspace resource utilization and plan capacity
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Restricted Access: Workspace usage and subscription controls are restricted to workspace
            Owners and Administrators.
          </span>
        </div>
      </div>
    );
  }

  if (loading && !usage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-taskflow-border">
          <div className="flex items-center space-x-3">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Usage & Plan</h2>
              <p className="text-xs text-taskflow-muted">Loading workspace capacity...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12 text-taskflow-muted text-xs space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Retrieving authoritative usage metrics...</span>
        </div>
      </div>
    );
  }

  const renderMeter = (
    label: string,
    current: number,
    limit: number,
    remaining: number,
    icon: React.ReactNode,
    testId: string
  ) => {
    const pct = Math.min(Math.round((current / limit) * 100), 100);
    const isFull = remaining <= 0;

    return (
      <div
        className={`p-4 rounded-xl border transition-all ${
          isFull
            ? 'bg-rose-500/5 border-rose-500/30'
            : 'bg-taskflow-surface/40 border-taskflow-border hover:border-taskflow-border/80'
        }`}
        data-testid={testId}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs font-medium text-white">
            {icon}
            <span>{label}</span>
          </div>
          <span
            className={`text-xs font-mono font-semibold ${
              isFull ? 'text-rose-400' : pct > 80 ? 'text-amber-400' : 'text-cyan-400'
            }`}
          >
            {current} / {limit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-taskflow-bg rounded-full overflow-hidden border border-taskflow-border/40 mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFull
                ? 'bg-rose-500 shadow-glow-rose'
                : pct > 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-taskflow-muted">
          <span>{pct}% utilized</span>
          {isFull ? (
            <span className="text-rose-400 font-medium flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 inline" />
              <span>Limit Reached (0 left)</span>
            </span>
          ) : (
            <span>{remaining} remaining</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="usage-settings-panel">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-taskflow-border">
        <div className="flex items-center space-x-3">
          <Gauge className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Usage & Plan</h2>
            <p className="text-xs text-taskflow-muted">
              Authoritative workspace capacity, quota consumption, and subscription features
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchUsage}
          disabled={loading}
          className="p-1.5 rounded-lg border border-taskflow-border text-taskflow-muted hover:text-white hover:bg-taskflow-surface transition-colors"
          title="Refresh Usage Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {usage && (
        <>
          {/* Subscription Overview Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/20 via-taskflow-surface/60 to-indigo-950/20 border border-taskflow-border relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-taskflow-muted uppercase tracking-wider font-semibold">
                    Current Plan
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${
                      usage.plan === Plan.BUSINESS
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : usage.plan === Plan.PRO
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
                    }`}
                    data-testid="current-plan-badge"
                  >
                    {usage.plan}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      usage.subscriptionStatus === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : usage.subscriptionStatus === 'TRIALING'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {usage.subscriptionStatus}
                  </span>
                </div>
                <p className="text-xs text-taskflow-muted">
                  {usage.currentPeriodStart && usage.currentPeriodEnd ? (
                    <span>
                      Active period: {new Date(usage.currentPeriodStart).toLocaleDateString()} –{' '}
                      {new Date(usage.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>Internal deterministic usage period active</span>
                  )}
                </p>
              </div>

              {/* Owner internal plan changer */}
              {isOwner && (
                <div className="flex items-center space-x-2 pt-2 md:pt-0">
                  <select
                    value={selectedPlan}
                    onChange={e => setSelectedPlan(e.target.value as Plan)}
                    className="bg-taskflow-bg border border-taskflow-border text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                    data-testid="plan-select"
                  >
                    <option value={Plan.FREE}>FREE</option>
                    <option value={Plan.PRO}>PRO</option>
                    <option value={Plan.BUSINESS}>BUSINESS</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdatePlan}
                    disabled={updatingPlan || selectedPlan === usage.plan}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                    data-testid="change-plan-btn"
                  >
                    {updatingPlan ? 'Updating...' : 'Change Plan'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Any limit reached warning */}
          {(usage.members.remaining <= 0 ||
            usage.projects.remaining <= 0 ||
            usage.activeTasks.remaining <= 0 ||
            usage.aiRequests.remaining <= 0) && (
            <div
              className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-3"
              data-testid="limit-reached-banner"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Capacity Limit Reached</span>
                <p className="text-taskflow-muted text-[11px]">
                  One or more resource limits for your {usage.plan} plan have been reached. New
                  creations or AI operations will be restricted until existing items are removed or
                  your plan is upgraded.
                </p>
              </div>
            </div>
          )}

          {/* Resource Meters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderMeter(
              'Workspace Members',
              usage.members.current,
              usage.members.limit,
              usage.members.remaining,
              <Users className="w-4 h-4 text-cyan-400" />,
              'meter-members'
            )}
            {renderMeter(
              'Projects',
              usage.projects.current,
              usage.projects.limit,
              usage.projects.remaining,
              <FolderGit2 className="w-4 h-4 text-indigo-400" />,
              'meter-projects'
            )}
            {renderMeter(
              'Active Tasks',
              usage.activeTasks.current,
              usage.activeTasks.limit,
              usage.activeTasks.remaining,
              <CheckSquare className="w-4 h-4 text-emerald-400" />,
              'meter-tasks'
            )}
            {renderMeter(
              'AI Operations (Per Period)',
              usage.aiRequests.current,
              usage.aiRequests.limit,
              usage.aiRequests.remaining,
              <Sparkles className="w-4 h-4 text-purple-400" />,
              'meter-ai'
            )}
          </div>

          {/* Feature Matrix Card */}
          <div className="glass-card p-5 rounded-xl border border-taskflow-border space-y-4">
            <div className="flex items-center space-x-2 text-xs font-semibold text-white">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Plan Feature Capabilities</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(usage.features).map(([key, enabled]) => (
                <div
                  key={key}
                  className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-taskflow-surface/30 border border-taskflow-border/50 text-xs"
                >
                  {enabled ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-taskflow-muted shrink-0" />
                  )}
                  <span
                    className={
                      enabled ? 'text-zinc-200 font-medium' : 'text-taskflow-muted line-through'
                    }
                  >
                    {key.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Notice */}
          <div className="p-4 rounded-xl bg-taskflow-surface/20 border border-taskflow-border/40 text-[11px] text-taskflow-muted flex items-start space-x-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-300 font-medium block">
                Subscription Architecture Notice
              </span>
              <span>
                TaskFlow operates on a subscription-ready domain model with deterministic internal
                quotas. External automated payment gateways (Stripe/Razorpay) are intentionally not
                coupled to this environment.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
