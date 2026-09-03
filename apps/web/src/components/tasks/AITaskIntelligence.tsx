import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Clock,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  RecommendationPriority,
  RecommendationCategory,
} from '@taskflow/shared';
import { taskApi } from '../../lib/api';

interface AITaskIntelligenceProps {
  organizationId: string;
  projectId: string;
  taskId: string;
  taskKey?: string;
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
  DEPENDENCY: { label: 'Dependency', icon: <Layers className="w-3.5 h-3.5 text-blue-400" /> },
  DEADLINE: { label: 'Deadline', icon: <Clock className="w-3.5 h-3.5 text-rose-400" /> },
  UNBLOCK: { label: 'Unblock', icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> },
  EXECUTION: {
    label: 'Execution',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
};

export const AITaskIntelligence: React.FC<AITaskIntelligenceProps> = ({
  organizationId,
  projectId,
  taskId,
  taskKey,
}) => {
  const [data, setData] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  const runAnalysis = useCallback(
    async (customPrompt?: string) => {
      if (loading) return;
      setLoading(true);
      setError(null);

      try {
        const promptToUse = customPrompt !== undefined ? customPrompt : userPrompt;
        const response = await taskApi.analyzeTask(organizationId, projectId, taskId, {
          user_prompt: promptToUse.trim() || undefined,
        });
        setData(response);
        setHasRun(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'AI task analysis is temporarily unavailable.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [organizationId, projectId, taskId, userPrompt, loading]
  );

  return (
    <div
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden transition-all duration-200 mt-4"
      data-testid="ai-task-intelligence"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Task Intelligence
              {taskKey && <span className="text-xs text-indigo-400 font-mono">[{taskKey}]</span>}
            </h4>
          </div>
        </div>

        {hasRun && !loading && (
          <button
            onClick={() => runAnalysis()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-md transition-colors"
            data-testid="ai-task-refresh-btn"
            title="Re-run AI task analysis"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-analyze</span>
          </button>
        )}
      </div>

      {/* 1. Idle State */}
      {!hasRun && !loading && !error && (
        <div className="text-center py-5 px-4 relative z-10" data-testid="ai-task-idle">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4">
            Synthesize task progress, evaluate dependency blockers, and uncover recommended actions.
          </p>

          {/* Optional Prompt Toggle */}
          <div className="mb-4 text-left max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setShowPromptInput(!showPromptInput)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-1.5 transition-colors"
            >
              {showPromptInput ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {showPromptInput ? 'Hide guidance prompt' : 'Add guidance or focus area (optional)'}
            </button>
            {showPromptInput && (
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={e => setUserPrompt(e.target.value)}
                  placeholder="e.g. Focus on deployment dependencies"
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  data-testid="ai-task-prompt-input"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => runAnalysis()}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
            data-testid="ai-task-analyze-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze Task with AI</span>
          </button>
        </div>
      )}

      {/* 2. Loading State */}
      {loading && (
        <div className="space-y-3.5 py-3 relative z-10" data-testid="ai-task-loading">
          <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse mb-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing task telemetry, dependencies, and subtasks...</span>
          </div>
          <div className="h-4 bg-slate-800/80 rounded animate-pulse w-3/4" />
          <div className="h-14 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-800/40 rounded-lg animate-pulse" />
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {error && !loading && (
        <div
          className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3.5 text-center relative z-10"
          data-testid="ai-task-error"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
          <p className="text-xs text-rose-300 mb-3">{error}</p>
          <button
            onClick={() => runAnalysis()}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
            data-testid="ai-task-retry-btn"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Analysis</span>
          </button>
        </div>
      )}

      {/* 4. Success State */}
      {data && !loading && !error && (
        <div className="space-y-4 relative z-10" data-testid="ai-task-success">
          {/* Advisory banner */}
          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2 text-[11px] text-indigo-300/80 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>AI suggestions are strictly advisory and do not alter task properties.</span>
          </div>

          {/* Executive Summary */}
          <div className="bg-slate-800/40 border border-slate-800/80 rounded-lg p-3.5">
            <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Task Assessment
            </h5>
            <p className="text-xs text-slate-200 leading-relaxed" data-testid="ai-task-summary">
              {data.summary}
            </p>
          </div>

          {/* Dependency Impact Section */}
          {data.dependency_impact && (
            <div
              className={`rounded-lg p-3 border text-xs transition-colors ${
                data.dependency_impact.has_blocking_dependencies
                  ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                  : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
              }`}
              data-testid="ai-task-dependency-impact"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold flex items-center gap-1.5">
                  {data.dependency_impact.has_blocking_dependencies ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  Dependency Impact
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    data.dependency_impact.has_blocking_dependencies
                      ? 'bg-rose-900/60 text-rose-300 border-rose-700/50'
                      : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
                  }`}
                >
                  {data.dependency_impact.has_blocking_dependencies
                    ? 'BLOCKED BY DEPENDENCIES'
                    : 'NO BLOCKERS'}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {data.dependency_impact.description}
              </p>
            </div>
          )}

          {/* Key Risks / Attention Areas */}
          {data.attention_areas && data.attention_areas.length > 0 && (
            <div data-testid="ai-task-attention-areas">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Key Attention Areas ({data.attention_areas.length})
              </h5>
              <div className="space-y-2">
                {data.attention_areas.map((area, idx) => {
                  const style = PRIORITY_BADGES[area.severity] || PRIORITY_BADGES.MEDIUM;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border ${style.bg} ${style.border} text-xs`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${style.text}`}>{area.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${style.bg} ${style.border} ${style.text}`}
                        >
                          {area.severity}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {area.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div data-testid="ai-task-recommendations">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                Recommended Next Actions ({data.recommendations.length})
              </h5>
              <div className="space-y-2">
                {data.recommendations.map((rec, idx) => {
                  const pStyle = PRIORITY_BADGES[rec.priority] || PRIORITY_BADGES.MEDIUM;
                  const catMeta = CATEGORY_LABELS[rec.category] || {
                    label: rec.category,
                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />,
                  };
                  return (
                    <div
                      key={idx}
                      className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-2.5 hover:border-slate-600/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-slate-100 text-xs">{rec.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            {catMeta.icon}
                            {catMeta.label}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${pStyle.bg} ${pStyle.border} ${pStyle.text}`}
                          >
                            {rec.priority}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {rec.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty Fallback */}
          {(!data.recommendations || data.recommendations.length === 0) &&
            (!data.attention_areas || data.attention_areas.length === 0) && (
              <div
                className="bg-slate-800/20 border border-slate-800 rounded-lg p-3 text-center text-xs text-slate-400"
                data-testid="ai-task-empty"
              >
                No active delivery risks or blocking issues identified for this task.
              </div>
            )}

          {/* Telemetry Footer */}
          {data.metadata && (
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Model: {String(data.metadata.model || 'OpenAI')}</span>
              {data.metadata.total_tokens ? (
                <span>Tokens: {String(data.metadata.total_tokens)}</span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
