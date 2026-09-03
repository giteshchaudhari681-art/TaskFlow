import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Info,
  Layers,
  Clock,
  UserCheck,
  AlertCircle,
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

const PRIORITY_BADGES: Record<
  RecommendationPriority,
  { bg: string; border: string; text: string; dot: string }
> = {
  CRITICAL: {
    bg: 'bg-rose-950/50',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    dot: 'bg-rose-500',
  },
  HIGH: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    dot: 'bg-amber-500',
  },
  MEDIUM: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    dot: 'bg-blue-500',
  },
  LOW: {
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-500',
  },
};

const CATEGORY_LABELS: Record<RecommendationCategory, { label: string; icon: React.ReactNode }> = {
  BLOCKER: { label: 'Blocker', icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> },
  DELIVERY_RISK: {
    label: 'Delivery Risk',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  },
  MILESTONE: { label: 'Milestone', icon: <Clock className="w-3.5 h-3.5 text-cyan-400" /> },
  PRIORITY: { label: 'Priority', icon: <AlertCircle className="w-3.5 h-3.5 text-orange-400" /> },
  OWNERSHIP: { label: 'Ownership', icon: <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> },
  WORKLOAD: { label: 'Workload', icon: <Layers className="w-3.5 h-3.5 text-violet-400" /> },
  PROCESS: { label: 'Process', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
  RISK_MITIGATION: {
    label: 'Risk Mitigation',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
  },
  PLANNING: { label: 'Planning', icon: <Clock className="w-3.5 h-3.5 text-sky-400" /> },
  QUALITY: { label: 'Quality', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
  RESOURCE: { label: 'Resource', icon: <Layers className="w-3.5 h-3.5 text-purple-400" /> },
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

  const runAnalysis = useCallback(async () => {
    if (loading) return; // Prevent concurrent requests
    setLoading(true);
    setError(null);

    try {
      const response = await projectApi.analyzeProject(organizationId, projectId, {
        operation: 'PROJECT_INSIGHT',
      });
      setData(response);
      setHasRun(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'AI analysis is temporarily unavailable.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId, loading]);

  return (
    <div
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden transition-all duration-200"
      data-testid="ai-project-intelligence"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">AI Project Intelligence</h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                Advisory
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Actionable recommendations grounded in live telemetry • PR14 engine authoritative
            </p>
          </div>
        </div>

        {hasRun && (
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start sm:self-auto"
            data-testid="ai-refresh-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Refresh Analysis'}</span>
          </button>
        )}
      </div>

      {/* State 1: Error Notification */}
      {error && (
        <div className="mt-5 p-4 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-rose-200">AI Analysis Unavailable</p>
            <p className="text-xs text-rose-300/80 mt-1">{error}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={runAnalysis}
                disabled={loading}
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium rounded border border-rose-500/40 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 2: Idle (Unanalyzed) */}
      {!hasRun && !loading && !error && (
        <div className="mt-5 py-6 px-4 rounded-lg bg-slate-800/40 border border-dashed border-slate-700/60 flex flex-col items-center text-center">
          <div className="p-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">
            {totalTasks === 0
              ? 'No Tasks Logged in Project Yet'
              : 'Synthesize Real-Time Intelligence & Recommendations'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            {totalTasks === 0
              ? 'Create your first tasks and milestones to enable telemetry-backed AI project intelligence and delivery risk mitigation.'
              : 'Evaluate current blocker chains, milestone health, velocity metrics, and delivery risks to generate concrete, telemetry-backed actions.'}
          </p>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            data-testid="ai-analyze-btn"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Project Telemetry</span>
          </button>
        </div>
      )}

      {/* State 3: Loading Skeleton */}
      {loading && (
        <div className="mt-5 space-y-4 animate-pulse" data-testid="ai-loading-skeleton">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing project context, blocker graph, and milestone dates...</span>
            </div>
            <div className="h-4 bg-slate-700/60 rounded w-3/4" />
            <div className="h-4 bg-slate-700/40 rounded w-5/6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-24 bg-slate-800/30 rounded-lg border border-slate-800/60" />
            <div className="h-24 bg-slate-800/30 rounded-lg border border-slate-800/60" />
          </div>
        </div>
      )}

      {/* State 4: Success Results */}
      {hasRun && data && !loading && (
        <div className="mt-5 space-y-6">
          {/* Executive Summary Card */}
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/80 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Executive Synthesis</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">{data.summary}</p>
          </div>

          {/* Key Recommendations Grid */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Actionable Recommendations ({data.recommendations.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.recommendations.map((rec: AIRecommendation, index: number) => {
                  const prioStyle = PRIORITY_BADGES[rec.priority] || PRIORITY_BADGES.MEDIUM;
                  const catConfig = CATEGORY_LABELS[rec.category] || {
                    label: rec.category,
                    icon: <Layers className="w-3.5 h-3.5 text-slate-400" />,
                  };

                  return (
                    <div
                      key={`rec-${index}`}
                      className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
                      data-testid={`ai-recommendation-${index}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${prioStyle.bg} ${prioStyle.border} ${prioStyle.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${prioStyle.dot}`} />
                            {rec.priority}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            {catConfig.icon}
                            <span>{catConfig.label}</span>
                          </span>
                        </div>
                        <h5 className="text-xs font-semibold text-slate-200 mb-1">{rec.title}</h5>
                        <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attention Areas List */}
          {data.attention_areas && data.attention_areas.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Areas Requiring Attention ({data.attention_areas.length})</span>
              </h4>
              <div className="space-y-2">
                {data.attention_areas.map((area: AIAttentionArea, index: number) => {
                  const prioStyle = PRIORITY_BADGES[area.severity] || PRIORITY_BADGES.HIGH;

                  return (
                    <div
                      key={`attention-${index}`}
                      className="p-3 rounded-lg bg-slate-800/30 border border-slate-800/80 flex items-start gap-3"
                      data-testid={`ai-attention-${index}`}
                    >
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 mt-0.5 ${prioStyle.bg} ${prioStyle.border} ${prioStyle.text}`}
                      >
                        {area.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200">{area.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{area.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>
              Generated from project telemetry • Advisory only • Grounded in TaskFlow PR14 signals
            </span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View project tasks</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
