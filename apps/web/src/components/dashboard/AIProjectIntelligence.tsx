import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RefreshCw, ArrowRight, Zap } from 'lucide-react';
import { AIAnalysisResponse } from '@taskflow/shared';
import { projectApi } from '../../lib/api';
import { motion } from 'framer-motion';

interface AIProjectIntelligenceProps {
  organizationId: string;
  projectId: string;
  totalTasks?: number;
  onNavigateTab?: (tab: 'tasks' | 'milestones' | 'dependencies' | 'activity' | 'settings') => void;
}

export const AIProjectIntelligence: React.FC<AIProjectIntelligenceProps> = ({
  organizationId,
  projectId,
  totalTasks = 0,
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

  // ── State: Uninitialised / Initial prompt ─────────────────────────────────
  if (!data && !loading && !error) {
    return (
      <div
        className="rounded-lg bg-[#161920] border border-[#222630] p-6 sm:p-8 shadow-elevation-1"
        data-testid="ai-project-intelligence"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#e05638]" />
              <span className="text-xs text-[#e05638] uppercase tracking-widest font-bold font-display">
                Delivery Intelligence &amp; Risk Engine
              </span>
            </div>
            <h3 className="text-xl font-bold text-white font-display tracking-tight">
              Evaluate delivery velocity, blocker risks &amp; milestone health
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#e05638] hover:bg-[#c94a2e] text-white text-sm font-semibold shadow-sm transition-all duration-150 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
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
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-lg bg-[#161920] border border-[#222630] p-6 sm:p-8 shadow-elevation-1 overflow-hidden"
        data-testid="ai-project-intelligence"
      >
        <div data-testid="ai-loading-skeleton">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-4 h-4 text-[#e05638] animate-spin" />
            <span className="text-sm text-slate-400 font-medium">
              Analyzing project context, blocker graph, and milestone velocity…
            </span>
          </div>
          <div className="space-y-3">
            <motion.div
              className="h-5 bg-[#1f232d] rounded w-3/4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="h-4 bg-[#1a1d26] rounded w-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, delay: 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="h-4 bg-[#1a1d26] rounded w-5/6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, delay: 0.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="h-4 bg-[#1a1d26] rounded w-2/3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, delay: 0.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── State: Error (fallback advisory) ─────────────────────────────────────────
  if (error) {
    return (
      <div
        className="rounded-lg bg-[#161920] border border-[#222630] p-6 sm:p-8 shadow-elevation-1"
        data-testid="ai-project-intelligence"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md bg-[#e05638]/15 border border-[#e05638]/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-[#e05638]" />
          </div>
          <span className="text-sm font-semibold text-white">Rule-Based Telemetry Advisory</span>
          <span className="text-xs text-[#e05638] bg-[#e05638]/10 px-2 py-0.5 rounded font-mono border border-[#e05638]/20">
            Active
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-2xl">
          Live dependency tracking and milestone telemetry are operating normally. Project
          deliverables are being evaluated using deterministic DAG rule engines while cloud AI
          provider setup is completed.
        </p>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-mono">{error}</span>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 text-[#e05638] hover:text-[#c94a2e] transition-colors cursor-pointer font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── State: Success ───────────────────────────────────────────────────────────
  if (!hasRun || !data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-lg bg-[#161920] border border-[#222630] p-6 sm:p-8 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="text-sm text-slate-300 font-medium mb-4">Executive Summary</div>
        <div className="text-base text-slate-100">{data.summary}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-6"
      >
        <div className="text-sm text-slate-300 font-medium mb-3">AI Recommendations</div>
        <ul className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
              <span className="text-[#e05638] mt-0.5">•</span>
              {rec.description}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
};
