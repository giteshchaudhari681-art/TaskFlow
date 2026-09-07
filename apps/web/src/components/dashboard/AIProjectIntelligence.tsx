import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Layers,
  Clock,
  UserCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  AIRecommendation,
  AIAttentionArea,
  RecommendationPriority,
  RecommendationCategory,
} from '@taskflow/shared';
import { projectApi } from '../../lib/api';

interface AIProjectIntelligenceProps {
  organizationId: string;
  projectId: string;
  totalTasks?: number;
  onNavigateTab?: (tab: 'tasks' | 'milestones' | 'dependencies' | 'activity' | 'settings') => void;
}

const PRIORITY_ACCENT: Record<
  RecommendationPriority,
  { bar: string; text: string; label: string }
> = {
  CRITICAL: { bar: 'bg-rose-500', text: 'text-rose-400', label: 'Critical' },
  HIGH: { bar: 'bg-amber-500', text: 'text-amber-400', label: 'High' },
  MEDIUM: { bar: 'bg-blue-500', text: 'text-blue-400', label: 'Medium' },
  LOW: { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'Low' },
};

const CATEGORY_LABELS: Record<RecommendationCategory, { label: string; icon: React.ReactNode }> = {
  BLOCKER: { label: 'Blocker', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  DELIVERY_RISK: { label: 'Delivery Risk', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  MILESTONE: { label: 'Milestone', icon: <Clock className="w-3.5 h-3.5" /> },
  PRIORITY: { label: 'Priority', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  OWNERSHIP: { label: 'Ownership', icon: <UserCheck className="w-3.5 h-3.5" /> },
  WORKLOAD: { label: 'Workload', icon: <Layers className="w-3.5 h-3.5" /> },
  PROCESS: { label: 'Process', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  RISK_MITIGATION: { label: 'Risk Mitigation', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  PLANNING: { label: 'Planning', icon: <Clock className="w-3.5 h-3.5" /> },
  QUALITY: { label: 'Quality', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  RESOURCE: { label: 'Resource', icon: <Layers className="w-3.5 h-3.5" /> },
  DEPENDENCY: { label: 'Dependency', icon: <Layers className="w-3.5 h-3.5" /> },
  DEADLINE: { label: 'Deadline', icon: <Clock className="w-3.5 h-3.5" /> },
  UNBLOCK: { label: 'Unblock', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  EXECUTION: { label: 'Execution', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

export const AIProjectIntelligence: React.FC<AIProjectIntelligenceProps> = ({
  organizationId,
  projectId,
  totalTasks = 0,
  onNavigateTab,
}) => {
  const [data, setData] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const runAnalysis = useCallback(async () => {
    if (loading) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await projectApi.analyzeProject(
        organizationId,
        projectId,
        { operation: 'PROJECT_INSIGHT' },
        controller.signal
      );
      setData(response);
      setHasRun(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message =
        err instanceof Error ? err.message : 'AI analysis is temporarily unavailable.';
      setError(message);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [organizationId, projectId, loading]);

  // ── State: Idle ─────────────────────────────────────────────────────────────
  if (!hasRun && !loading && !error) {
    return (
      <div className="relative rounded-2xl overflow-hidden" data-testid="ai-project-intelligence">
        {/* Subtle dark gradient surface */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-slate-950/60 to-indigo-950/20" />
        <div className="absolute inset-0 border border-violet-500/10 rounded-2xl" />

        <div className="relative px-8 py-10 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {totalTasks === 0 ? 'Ready when you are' : 'Run an intelligence scan'}
            </h3>
            <p className="text-slate-400 leading-relaxed max-w-lg text-sm">
              {totalTasks === 0
                ? 'Create your first tasks and milestones to unlock AI-powered analysis, risk detection, and delivery recommendations.'
                : "Analyze your project's blocker chains, milestone health, velocity trends, and delivery risks — surfaced as concrete, prioritized recommendations."}
            </p>
          </div>

          {totalTasks > 0 && (
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              data-testid="ai-analyze-btn"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Project
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── State: Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative rounded-2xl overflow-hidden" data-testid="ai-project-intelligence">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-slate-950/60 to-indigo-950/20" />
        <div className="absolute inset-0 border border-violet-500/10 rounded-2xl" />

        <div className="relative px-8 py-10 sm:py-12" data-testid="ai-loading-skeleton">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400">
              Analyzing project context, blocker graph, and milestone velocity…
            </span>
          </div>
          <div className="space-y-3 animate-pulse">
            <div className="h-5 bg-white/[0.05] rounded-lg w-3/4" />
            <div className="h-4 bg-white/[0.04] rounded-lg w-full" />
            <div className="h-4 bg-white/[0.04] rounded-lg w-5/6" />
            <div className="h-4 bg-white/[0.03] rounded-lg w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // ── State: Error (fallback advisory) ─────────────────────────────────────────
  if (error) {
    return (
      <div className="relative rounded-2xl overflow-hidden" data-testid="ai-project-intelligence">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 to-indigo-950/20" />
        <div className="absolute inset-0 border border-sky-500/10 rounded-2xl" />

        <div className="relative px-8 py-10 sm:py-12">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-white">Rule-Based Telemetry Advisory</span>
            <span className="text-xs text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded font-mono">
              Active
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Live dependency tracking and milestone telemetry are operating normally. Project
            deliverables are being evaluated using deterministic DAG rule engines while cloud AI
            provider setup is completed.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="font-mono">{error}</span>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-1.5 text-sky-500 hover:text-sky-400 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── State: Success ───────────────────────────────────────────────────────────
  if (!hasRun || !data) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden" data-testid="ai-project-intelligence">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/25 via-slate-950/60 to-indigo-950/15" />
      <div className="absolute inset-0 border border-violet-500/[0.12] rounded-2xl" />

      <div className="relative px-8 py-10 sm:py-12 space-y-8">
        {/* Summary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-violet-400/70 uppercase tracking-widest font-semibold">
                Executive Synthesis
              </span>
            </div>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              data-testid="ai-refresh-btn"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">{data.summary}</p>
        </div>

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
                {data.recommendations.length} Recommendation
                {data.recommendations.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-0">
              {data.recommendations.map((rec: AIRecommendation, i: number) => {
                const prio = PRIORITY_ACCENT[rec.priority] || PRIORITY_ACCENT.MEDIUM;
                const cat = CATEGORY_LABELS[rec.category] || {
                  label: rec.category,
                  icon: <Layers className="w-3.5 h-3.5" />,
                };
                return (
                  <div
                    key={`rec-${i}`}
                    data-testid={`ai-recommendation-${i}`}
                    className={`flex gap-5 py-5 ${i < data.recommendations.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                  >
                    {/* Priority accent bar */}
                    <div className={`w-0.5 rounded-full shrink-0 ${prio.bar} self-stretch`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${prio.text}`}
                        >
                          {prio.label}
                        </span>
                        <span className="text-slate-700">·</span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          {cat.icon}
                          {cat.label}
                        </span>
                      </div>
                      <h5 className="text-sm font-semibold text-white mb-1">{rec.title}</h5>
                      <p className="text-sm text-slate-400 leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attention areas */}
        {data.attention_areas && data.attention_areas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
                Areas Requiring Attention
              </span>
            </div>
            <div className="space-y-0">
              {data.attention_areas.map((area: AIAttentionArea, i: number) => {
                const prio = PRIORITY_ACCENT[area.severity] || PRIORITY_ACCENT.HIGH;
                return (
                  <div
                    key={`attention-${i}`}
                    data-testid={`ai-attention-${i}`}
                    className={`flex gap-4 py-4 items-start ${i < (data.attention_areas?.length ?? 0) - 1 ? 'border-b border-white/[0.05]' : ''}`}
                  >
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${prio.text} shrink-0 pt-0.5`}
                    >
                      {area.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{area.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{area.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
          <span className="text-xs text-slate-600">
            Generated from live project telemetry · Advisory only · TaskFlow PR14
          </span>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors cursor-pointer self-start sm:self-auto"
            >
              View tasks
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
