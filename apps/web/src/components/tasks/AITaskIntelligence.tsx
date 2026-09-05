import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  ListTree,
  CheckSquare,
  Square,
  PlusCircle,
  X,
  Loader2,
  SlidersHorizontal,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  RecommendationPriority,
  RecommendationCategory,
  AIDecomposedSubtask,
  AITaskActionProposal,
  TaskStatus,
  TaskPriority,
} from '@taskflow/shared';
import { taskApi } from '../../lib/api';

interface AITaskIntelligenceProps {
  organizationId: string;
  projectId: string;
  taskId: string;
  taskKey?: string;
  currentStatus?: TaskStatus;
  currentPriority?: TaskPriority;
  currentDueDate?: string | null;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  existingSubtaskTitles?: string[];
  onSubtasksCreated?: () => void;
  onTaskUpdated?: () => void;
}

type TabMode = 'intelligence' | 'decomposition' | 'actions';

interface EditableProposedSubtask extends AIDecomposedSubtask {
  selected: boolean;
  isDuplicate: boolean;
}

const CONFIDENCE_BADGES: Record<string, { bg: string; border: string; text: string }> = {
  HIGH: {
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
  },
  MEDIUM: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
  },
  LOW: {
    bg: 'bg-slate-800/60',
    border: 'border-slate-700/50',
    text: 'text-slate-400',
  },
};

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
  currentStatus,
  currentPriority,
  currentDueDate,
  currentAssigneeId,
  currentAssigneeName,
  existingSubtaskTitles = [],
  onSubtasksCreated,
  onTaskUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('intelligence');

  // Intelligence State
  const [intelData, setIntelData] = useState<AIAnalysisResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelHasRun, setIntelHasRun] = useState(false);
  const [intelPrompt, setIntelPrompt] = useState('');
  const [showIntelPrompt, setShowIntelPrompt] = useState(false);

  // Decomposition State
  const [decompData, setDecompData] = useState<AIAnalysisResponse | null>(null);
  const [decompLoading, setDecompLoading] = useState(false);
  const [decompError, setDecompError] = useState<string | null>(null);
  const [decompHasRun, setDecompHasRun] = useState(false);
  const [decompPrompt, setDecompPrompt] = useState('');
  const [showDecompPrompt, setShowDecompPrompt] = useState(false);
  const [proposedSubtasks, setProposedSubtasks] = useState<EditableProposedSubtask[]>([]);
  const [creatingSubtasks, setCreatingSubtasks] = useState(false);
  const [creationResult, setCreationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Actions State
  const [actionsData, setActionsData] = useState<AIAnalysisResponse | null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [actionsHasRun, setActionsHasRun] = useState(false);
  const [actionsPrompt, setActionsPrompt] = useState('');
  const [showActionsPrompt, setShowActionsPrompt] = useState(false);
  const [actionStatusMap, setActionStatusMap] = useState<
    Record<string, 'proposed' | 'applying' | 'applied' | 'dismissed' | 'failed'>
  >({});
  const [actionErrorMap, setActionErrorMap] = useState<Record<string, string>>({});
  const [actionSuccessMap, setActionSuccessMap] = useState<Record<string, string>>({});

  const actionsAbortRef = useRef<AbortController | null>(null);
  const intelAbortRef = useRef<AbortController | null>(null);
  const decompAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      actionsAbortRef.current?.abort();
      intelAbortRef.current?.abort();
      decompAbortRef.current?.abort();
    };
  }, []);

  // Run Actions Proposal
  const runActions = useCallback(
    async (customPrompt?: string) => {
      if (actionsLoading) return;
      actionsAbortRef.current?.abort();
      const controller = new AbortController();
      actionsAbortRef.current = controller;

      setActionsLoading(true);
      setActionsError(null);

      try {
        const promptToUse = customPrompt !== undefined ? customPrompt : actionsPrompt;
        const response = await taskApi.proposeActions(organizationId, projectId, taskId, {
          user_prompt: promptToUse.trim() || undefined,
          signal: controller.signal,
        });
        setActionsData(response);
        setActionsHasRun(true);
        setActionStatusMap({});
        setActionErrorMap({});
        setActionSuccessMap({});
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'AI task actions are temporarily unavailable.';
        setActionsError(message);
      } finally {
        if (actionsAbortRef.current === controller) {
          setActionsLoading(false);
        }
      }
    },
    [organizationId, projectId, taskId, actionsPrompt, actionsLoading]
  );

  // Stale check
  const isActionStale = useCallback(
    (action: AITaskActionProposal): boolean => {
      const exp = action.expectedCurrentState;
      if (!exp) return false;

      if (action.type === 'UPDATE_STATUS') {
        if (exp.status && currentStatus && exp.status !== currentStatus) {
          return true;
        }
      } else if (action.type === 'UPDATE_PRIORITY') {
        if (exp.priority && currentPriority && exp.priority !== currentPriority) {
          return true;
        }
      } else if (action.type === 'UPDATE_DUE_DATE') {
        if (exp.dueDate !== undefined && currentDueDate !== undefined) {
          const expDate = exp.dueDate ? new Date(exp.dueDate).toISOString().split('T')[0] : null;
          const curDate = currentDueDate
            ? new Date(currentDueDate).toISOString().split('T')[0]
            : null;
          if (expDate !== curDate) {
            return true;
          }
        }
      } else if (action.type === 'ASSIGN_TASK') {
        if (exp.assigneeId !== undefined && currentAssigneeId !== undefined) {
          if ((exp.assigneeId || null) !== (currentAssigneeId || null)) {
            return true;
          }
        }
      }

      return false;
    },
    [currentStatus, currentPriority, currentDueDate, currentAssigneeId]
  );

  // Apply Action
  const handleApplyAction = async (action: AITaskActionProposal) => {
    if (isActionStale(action)) {
      setActionErrorMap(prev => ({
        ...prev,
        [action.actionId]: 'This recommendation was generated from an older version of the task.',
      }));
      return;
    }

    setActionStatusMap(prev => ({ ...prev, [action.actionId]: 'applying' }));
    setActionErrorMap(prev => {
      const next = { ...prev };
      delete next[action.actionId];
      return next;
    });

    try {
      const payload: Record<string, unknown> = {
        expectedCurrentState: action.expectedCurrentState,
      };

      if (action.type === 'UPDATE_STATUS') {
        payload.status = action.parameters.status;
      } else if (action.type === 'UPDATE_PRIORITY') {
        payload.priority = action.parameters.priority;
      } else if (action.type === 'UPDATE_DUE_DATE') {
        payload.dueDate = action.parameters.dueDate;
      } else if (action.type === 'ASSIGN_TASK') {
        payload.assigneeId = action.parameters.assigneeId ?? action.parameters.assigneeUserId;
      }

      await taskApi.updateTask(organizationId, projectId, taskId, payload);

      setActionStatusMap(prev => ({ ...prev, [action.actionId]: 'applied' }));
      setActionSuccessMap(prev => ({
        ...prev,
        [action.actionId]: `${action.title} applied successfully.`,
      }));
      onTaskUpdated?.();
    } catch (err: unknown) {
      const isStaleErr =
        (err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'STALE_TASK_STATE') ||
        (err instanceof Error &&
          (err.message.includes('409') || err.message.toLowerCase().includes('stale')));

      const message = isStaleErr
        ? 'This recommendation was generated from an older version of the task.'
        : err instanceof Error
          ? err.message
          : 'Could not apply this action.';

      setActionStatusMap(prev => ({ ...prev, [action.actionId]: 'failed' }));
      setActionErrorMap(prev => ({
        ...prev,
        [action.actionId]: message,
      }));
    }
  };

  // Dismiss Action
  const handleDismissAction = (actionId: string) => {
    setActionStatusMap(prev => ({ ...prev, [actionId]: 'dismissed' }));
  };

  // Normalize existing titles for duplicate checking
  const normalizedExistingTitles = useMemo(() => {
    return new Set(existingSubtaskTitles.map(t => t.trim().toLowerCase()));
  }, [existingSubtaskTitles]);

  // Run Intelligence Analysis
  const runIntelligence = useCallback(
    async (customPrompt?: string) => {
      if (intelLoading) return;
      intelAbortRef.current?.abort();
      const controller = new AbortController();
      intelAbortRef.current = controller;

      setIntelLoading(true);
      setIntelError(null);

      try {
        const promptToUse = customPrompt !== undefined ? customPrompt : intelPrompt;
        const response = await taskApi.analyzeTask(organizationId, projectId, taskId, {
          user_prompt: promptToUse.trim() || undefined,
          signal: controller.signal,
        });
        setIntelData(response);
        setIntelHasRun(true);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'AI task analysis is temporarily unavailable.';
        setIntelError(message);
      } finally {
        if (intelAbortRef.current === controller) {
          setIntelLoading(false);
        }
      }
    },
    [organizationId, projectId, taskId, intelPrompt, intelLoading]
  );

  // Run Decomposition Analysis
  const runDecomposition = useCallback(
    async (customPrompt?: string) => {
      if (decompLoading) return;
      decompAbortRef.current?.abort();
      const controller = new AbortController();
      decompAbortRef.current = controller;

      setDecompLoading(true);
      setDecompError(null);
      setCreationResult(null);

      try {
        const promptToUse = customPrompt !== undefined ? customPrompt : decompPrompt;
        const response = await taskApi.decomposeTask(organizationId, projectId, taskId, {
          user_prompt: promptToUse.trim() || undefined,
          signal: controller.signal,
        });
        setDecompData(response);
        setDecompHasRun(true);

        // Map subtasks to editable proposals with duplicate checks
        const mapped: EditableProposedSubtask[] = (response.subtasks || []).map(st => {
          const isDup = normalizedExistingTitles.has(st.title.trim().toLowerCase());
          return {
            ...st,
            selected: !isDup, // Pre-select non-duplicates
            isDuplicate: isDup,
          };
        });
        setProposedSubtasks(mapped);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'AI task decomposition is temporarily unavailable.';
        setDecompError(message);
      } finally {
        if (decompAbortRef.current === controller) {
          setDecompLoading(false);
        }
      }
    },
    [organizationId, projectId, taskId, decompPrompt, decompLoading, normalizedExistingTitles]
  );

  // Toggle subtask selection
  const toggleSubtaskSelection = (index: number) => {
    setProposedSubtasks(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  // Update proposed subtask title
  const updateSubtaskTitle = (index: number, newTitle: string) => {
    setProposedSubtasks(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, title: newTitle } : item))
    );
  };

  // Select/Deselect All
  const toggleSelectAll = () => {
    const allSelected = proposedSubtasks.every(st => st.selected);
    setProposedSubtasks(prev => prev.map(st => ({ ...st, selected: !allSelected })));
  };

  // Cancel / Discard Proposal
  const handleCancelDecomposition = () => {
    setDecompData(null);
    setProposedSubtasks([]);
    setDecompHasRun(false);
    setCreationResult(null);
  };

  // Execute Human-Approved Subtask Creation
  const handleCreateSelectedSubtasks = async () => {
    const selectedItems = proposedSubtasks.filter(st => st.selected && st.title.trim());
    if (selectedItems.length === 0 || creatingSubtasks) return;

    setCreatingSubtasks(true);
    setCreationResult(null);

    let createdCount = 0;
    let failedCount = 0;

    for (const item of selectedItems) {
      try {
        await taskApi.createSubtask(organizationId, projectId, taskId, {
          title: item.title.trim(),
        });
        createdCount++;
      } catch (err: unknown) {
        console.error('Failed to create subtask:', err);
        failedCount++;
      }
    }

    setCreatingSubtasks(false);

    if (failedCount === 0) {
      setCreationResult({
        success: true,
        message: `${createdCount} subtask${createdCount > 1 ? 's' : ''} created successfully!`,
      });
      // Clear proposal state after successful creation
      setProposedSubtasks([]);
      setDecompData(null);
      setDecompHasRun(false);
    } else {
      setCreationResult({
        success: false,
        message: `${createdCount} created, ${failedCount} failed to create.`,
      });
      // Remove successfully created items from the review list
      setProposedSubtasks(prev => prev.filter(st => !st.selected));
    }

    if (createdCount > 0) {
      onSubtasksCreated?.();
    }
  };

  const selectedCount = proposedSubtasks.filter(st => st.selected).length;

  return (
    <div
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden transition-all duration-200 mt-4"
      data-testid="ai-task-intelligence"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar with Mode Tabs */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              AI Task Assistant
              {taskKey && <span className="text-xs text-indigo-400 font-mono">[{taskKey}]</span>}
            </h4>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('intelligence')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'intelligence'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Assessment</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decomposition')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'decomposition'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            data-testid="ai-tab-decomposition"
          >
            <ListTree className="w-3 h-3" />
            <span>Breakdown</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            data-testid="ai-tab-actions"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Actions</span>
          </button>
        </div>
      </div>

      {/* Creation notification */}
      {creationResult && (
        <div
          className={`mb-4 p-3 rounded-lg border text-xs flex items-center justify-between relative z-10 ${
            creationResult.success
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
          data-testid="ai-decomposition-result"
        >
          <div className="flex items-center gap-2">
            {creationResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{creationResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreationResult(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TASK INTELLIGENCE & ASSESSMENT                                     */}
      {/* ========================================================================= */}
      {activeTab === 'intelligence' && (
        <>
          {/* Refresh button if intelligence has run */}
          {intelHasRun && !intelLoading && (
            <div className="flex justify-end mb-3">
              <button
                onClick={() => runIntelligence()}
                disabled={intelLoading}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-md transition-colors"
                data-testid="ai-task-refresh-btn"
                title="Re-run AI task analysis"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-analyze</span>
              </button>
            </div>
          )}

          {/* Idle State */}
          {!intelHasRun && !intelLoading && !intelError && (
            <div className="text-center py-5 px-4 relative z-10" data-testid="ai-task-idle">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4">
                Synthesize task progress, evaluate dependency blockers, and uncover recommended
                actions.
              </p>

              <div className="mb-4 text-left max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setShowIntelPrompt(!showIntelPrompt)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-1.5 transition-colors"
                >
                  {showIntelPrompt ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {showIntelPrompt
                    ? 'Hide guidance prompt'
                    : 'Add guidance or focus area (optional)'}
                </button>
                {showIntelPrompt && (
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="text"
                      value={intelPrompt}
                      onChange={e => setIntelPrompt(e.target.value)}
                      placeholder="e.g. Focus on deployment dependencies"
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      data-testid="ai-task-prompt-input"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => runIntelligence()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                data-testid="ai-task-analyze-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze Task with AI</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {intelLoading && (
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

          {/* Error State */}
          {intelError && !intelLoading && (
            <div
              className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3.5 text-center relative z-10"
              data-testid="ai-task-error"
            >
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
              <p className="text-xs text-rose-300 mb-3">{intelError}</p>
              <button
                onClick={() => runIntelligence()}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
                data-testid="ai-task-retry-btn"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Analysis</span>
              </button>
            </div>
          )}

          {/* Success State */}
          {intelData && !intelLoading && !intelError && (
            <div className="space-y-4 relative z-10" data-testid="ai-task-success">
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
                  {intelData.summary}
                </p>
              </div>

              {/* Dependency Impact */}
              {intelData.dependency_impact && (
                <div
                  className={`rounded-lg p-3 border text-xs transition-colors ${
                    intelData.dependency_impact.has_blocking_dependencies
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                      : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                  }`}
                  data-testid="ai-task-dependency-impact"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold flex items-center gap-1.5">
                      {intelData.dependency_impact.has_blocking_dependencies ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      Dependency Impact
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        intelData.dependency_impact.has_blocking_dependencies
                          ? 'bg-rose-900/60 text-rose-300 border-rose-700/50'
                          : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
                      }`}
                    >
                      {intelData.dependency_impact.has_blocking_dependencies
                        ? 'BLOCKED BY DEPENDENCIES'
                        : 'NO BLOCKERS'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {intelData.dependency_impact.description}
                  </p>
                </div>
              )}

              {/* Attention Areas */}
              {intelData.attention_areas && intelData.attention_areas.length > 0 && (
                <div data-testid="ai-task-attention-areas">
                  <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Key Attention Areas ({intelData.attention_areas.length})
                  </h5>
                  <div className="space-y-2">
                    {intelData.attention_areas.map((area, idx) => {
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

              {/* Recommendations */}
              {intelData.recommendations && intelData.recommendations.length > 0 && (
                <div data-testid="ai-task-recommendations">
                  <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    Recommended Next Actions ({intelData.recommendations.length})
                  </h5>
                  <div className="space-y-2">
                    {intelData.recommendations.map((rec, idx) => {
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

              {/* Telemetry Footer */}
              {intelData.metadata && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Model: {String(intelData.metadata.model || 'OpenAI')}</span>
                  {intelData.metadata.total_tokens ? (
                    <span>Tokens: {String(intelData.metadata.total_tokens)}</span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI TASK DECOMPOSITION                                              */}
      {/* ========================================================================= */}
      {activeTab === 'decomposition' && (
        <div className="relative z-10 space-y-4">
          {/* Idle State */}
          {!decompHasRun && !decompLoading && !decompError && (
            <div className="text-center py-5 px-4" data-testid="ai-task-decomposition-idle">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <ListTree className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4">
                Decompose this task into structured, actionable subtask proposals for human review.
              </p>

              <div className="mb-4 text-left max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setShowDecompPrompt(!showDecompPrompt)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-1.5 transition-colors"
                >
                  {showDecompPrompt ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {showDecompPrompt
                    ? 'Hide guidance prompt'
                    : 'Add breakdown focus or technical criteria (optional)'}
                </button>
                {showDecompPrompt && (
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="text"
                      value={decompPrompt}
                      onChange={e => setDecompPrompt(e.target.value)}
                      placeholder="e.g. Break down into backend API and tests"
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      data-testid="ai-decomposition-prompt-input"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => runDecomposition()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                data-testid="ai-task-decompose-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Suggest Breakdown</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {decompLoading && (
            <div className="space-y-3.5 py-3" data-testid="ai-decomposition-loading">
              <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse mb-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing scope, dependencies, and generating subtask proposals...</span>
              </div>
              <div className="h-4 bg-slate-800/80 rounded animate-pulse w-3/4" />
              <div className="space-y-2">
                <div className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />
              </div>
            </div>
          )}

          {/* Error State */}
          {decompError && !decompLoading && (
            <div
              className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3.5 text-center"
              data-testid="ai-decomposition-error"
            >
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
              <p className="text-xs text-rose-300 mb-3">{decompError}</p>
              <button
                onClick={() => runDecomposition()}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
                data-testid="ai-decomposition-retry-btn"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Decomposition</span>
              </button>
            </div>
          )}

          {/* Review State */}
          {decompData && !decompLoading && !decompError && (
            <div className="space-y-4" data-testid="ai-task-decomposition-review">
              {/* Advisory Disclaimer Banner */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2 text-[11px] text-indigo-300/80 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  AI proposals are strictly advisory. Subtasks are only created after your explicit
                  approval.
                </span>
              </div>

              {/* Summary */}
              {decompData.summary && (
                <div className="bg-slate-800/40 border border-slate-800/80 rounded-lg p-3">
                  <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Decomposition Scope
                  </h5>
                  <p
                    className="text-xs text-slate-200 leading-relaxed"
                    data-testid="ai-decomposition-summary"
                  >
                    {decompData.summary}
                  </p>
                </div>
              )}

              {/* Empty Proposals Fallback */}
              {proposedSubtasks.length === 0 ? (
                <div
                  className="bg-slate-800/20 border border-slate-800 rounded-lg p-4 text-center text-xs text-slate-400"
                  data-testid="ai-decomposition-empty"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-slate-200 font-medium mb-1">No further breakdown needed</p>
                  <p className="text-[11px] text-slate-400">
                    This task is already sufficiently focused and can be executed directly without
                    additional subtasks.
                  </p>
                </div>
              ) : (
                <>
                  {/* Proposed Items Toolbar */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        Proposed Subtasks ({proposedSubtasks.length})
                      </span>
                      <span className="text-[11px] text-indigo-400">
                        ({selectedCount} selected)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      data-testid="ai-select-all-btn"
                    >
                      {selectedCount === proposedSubtasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Proposals List */}
                  <div className="space-y-2">
                    {proposedSubtasks.map((st, idx) => {
                      const pStyle = PRIORITY_BADGES[st.priority || 'MEDIUM'];
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border transition-all ${
                            st.selected
                              ? 'bg-slate-800/50 border-indigo-500/40'
                              : 'bg-slate-900/40 border-slate-800 opacity-60'
                          }`}
                          data-testid={`proposed-subtask-${idx}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleSubtaskSelection(idx)}
                              className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                              data-testid={`subtask-checkbox-${idx}`}
                              aria-label={`Toggle subtask ${st.title}`}
                            >
                              {st.selected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                  #{st.order}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {st.isDuplicate && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-800/60">
                                      Already exists
                                    </span>
                                  )}
                                  {st.priority && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded border ${pStyle.bg} ${pStyle.border} ${pStyle.text}`}
                                    >
                                      {st.priority}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <input
                                type="text"
                                value={st.title}
                                onChange={e => updateSubtaskTitle(idx, e.target.value)}
                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none transition-colors"
                                placeholder="Subtask title"
                                data-testid={`subtask-title-input-${idx}`}
                              />

                              {st.description && (
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed pl-0.5">
                                  {st.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Advisory Notes */}
                  {decompData.notes && decompData.notes.length > 0 && (
                    <div className="bg-slate-800/30 border border-slate-800/60 rounded-lg p-2.5 text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Advisory Notes
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                        {decompData.notes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={handleCancelDecomposition}
                      disabled={creatingSubtasks}
                      className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors"
                      data-testid="ai-cancel-decomposition-btn"
                    >
                      Discard Proposal
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateSelectedSubtasks}
                      disabled={selectedCount === 0 || creatingSubtasks}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-lg shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                      data-testid="ai-create-subtasks-btn"
                    >
                      {creatingSubtasks ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Subtasks...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>
                            Create {selectedCount} Selected Subtask{selectedCount === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Telemetry Footer */}
              {decompData.metadata && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Model: {String(decompData.metadata.model || 'OpenAI')}</span>
                  {decompData.metadata.total_tokens ? (
                    <span>Tokens: {String(decompData.metadata.total_tokens)}</span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 3: AI Actions                                         */}
      {/* ========================================================= */}
      {activeTab === 'actions' && (
        <div className="space-y-4" data-testid="ai-task-actions-section">
          {/* Controls Bar */}
          {actionsHasRun && !actionsLoading && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400">
                AI Action Proposals &bull; Explicit Human Approval Required
              </span>
              <button
                type="button"
                onClick={() => runActions()}
                disabled={actionsLoading}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-md transition-colors"
                data-testid="ai-task-actions-regenerate-btn"
                title="Regenerate action proposals"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            </div>
          )}

          {/* Idle State */}
          {!actionsHasRun && !actionsLoading && !actionsError && (
            <div className="text-center py-5 px-4 relative z-10" data-testid="ai-task-actions-idle">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4">
                Analyze the task state to propose safe, structured changes such as updating
                priority, status, due date, or project member assignment.
              </p>

              <div className="mb-4 text-left max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setShowActionsPrompt(!showActionsPrompt)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-1.5 transition-colors"
                  data-testid="ai-task-actions-prompt-toggle"
                >
                  {showActionsPrompt ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {showActionsPrompt
                    ? 'Hide guidance prompt'
                    : 'Add guidance or focus area (optional)'}
                </button>
                {showActionsPrompt && (
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="text"
                      value={actionsPrompt}
                      onChange={e => setActionsPrompt(e.target.value)}
                      placeholder="e.g. Focus on priority adjustment and assignment"
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      data-testid="ai-task-actions-prompt-input"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => runActions()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                data-testid="ai-task-actions-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Suggest Actions</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {actionsLoading && (
            <div className="space-y-3.5 py-3" data-testid="ai-task-actions-loading">
              <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse mb-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating task risk, dependencies, and generating action proposals...</span>
              </div>
              <div className="h-4 bg-slate-800/80 rounded animate-pulse w-3/4" />
              <div className="space-y-2">
                <div className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />
                <div className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />
              </div>
            </div>
          )}

          {/* Error State */}
          {actionsError && !actionsLoading && (
            <div
              className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3.5 text-center"
              data-testid="ai-task-actions-error"
            >
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
              <p className="text-xs text-rose-300 mb-3">{actionsError}</p>
              <button
                type="button"
                onClick={() => runActions()}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
                data-testid="ai-task-actions-retry-btn"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Actions</span>
              </button>
            </div>
          )}

          {/* Success / Proposals State */}
          {actionsData && !actionsLoading && !actionsError && (
            <div className="space-y-4" data-testid="ai-task-actions-success">
              {/* Advisory Disclaimer Banner */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2 text-[11px] text-indigo-300/80 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  AI proposals are strictly advisory. No changes occur until you explicitly approve
                  an action.
                </span>
              </div>

              {/* Summary */}
              {actionsData.summary && (
                <div className="bg-slate-800/40 border border-slate-800/80 rounded-lg p-3">
                  <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Analysis Rationale
                  </h5>
                  <p
                    className="text-xs text-slate-200 leading-relaxed"
                    data-testid="ai-actions-summary"
                  >
                    {actionsData.summary}
                  </p>
                </div>
              )}

              {/* Action Proposals List */}
              {!actionsData.actions || actionsData.actions.length === 0 ? (
                <div
                  className="bg-slate-800/30 border border-slate-800/60 rounded-lg p-4 text-center"
                  data-testid="ai-actions-empty"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-400/80 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">
                    No safe, high-confidence task actions were identified.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Current task configuration appears consistent with current project state.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionsData.actions
                    .filter(act => actionStatusMap[act.actionId] !== 'dismissed')
                    .map(act => {
                      const status = actionStatusMap[act.actionId] || 'proposed';
                      const isStale = isActionStale(act);
                      const confStyle = CONFIDENCE_BADGES[act.confidence] || CONFIDENCE_BADGES.HIGH;
                      const errMessage = actionErrorMap[act.actionId];
                      const successMessage = actionSuccessMap[act.actionId];

                      // Determine descriptive apply label (Rule 20: Never hide mutations)
                      let applyButtonText = 'Apply';
                      let diffDisplay: React.ReactNode = null;

                      if (act.type === 'UPDATE_STATUS') {
                        const targetStatus = (act.parameters.status as string) || '';
                        applyButtonText = `Move to ${targetStatus.replace('_', ' ')}`;
                        diffDisplay = (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Status:</span>
                            <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                              {currentStatus || act.expectedCurrentState?.status || 'UNKNOWN'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="font-mono text-cyan-300 font-semibold bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                              {targetStatus}
                            </span>
                          </div>
                        );
                      } else if (act.type === 'UPDATE_PRIORITY') {
                        const targetPriority = (act.parameters.priority as string) || '';
                        applyButtonText = `Change priority to ${targetPriority}`;
                        diffDisplay = (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Priority:</span>
                            <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                              {currentPriority || act.expectedCurrentState?.priority || 'UNKNOWN'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="font-mono text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded">
                              {targetPriority}
                            </span>
                          </div>
                        );
                      } else if (act.type === 'UPDATE_DUE_DATE') {
                        const targetDate = act.parameters.dueDate
                          ? String(act.parameters.dueDate).split('T')[0]
                          : 'None';
                        applyButtonText = `Set due date to ${targetDate}`;
                        diffDisplay = (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Due Date:</span>
                            <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                              {currentDueDate ? String(currentDueDate).split('T')[0] : 'None'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="font-mono text-indigo-300 font-semibold bg-indigo-950/60 border border-indigo-800/50 px-1.5 py-0.5 rounded">
                              {targetDate}
                            </span>
                          </div>
                        );
                      } else if (act.type === 'ASSIGN_TASK') {
                        const assigneeName =
                          (act.parameters.assigneeName as string) ||
                          (act.parameters.assigneeUserId as string) ||
                          'member';
                        applyButtonText = `Assign to ${assigneeName}`;
                        diffDisplay = (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Assignee:</span>
                            <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                              {currentAssigneeName || 'Unassigned'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="font-mono text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                              {assigneeName}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={act.actionId}
                          className={`bg-slate-950/60 border rounded-xl p-4 transition-all duration-200 ${
                            isStale
                              ? 'border-amber-500/40 bg-amber-950/10'
                              : status === 'applied'
                                ? 'border-emerald-500/30 bg-emerald-950/10'
                                : 'border-slate-800 hover:border-slate-700'
                          }`}
                          data-testid={`ai-action-card-${act.actionId}`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-semibold text-slate-100"
                                data-testid="ai-action-title"
                              >
                                {act.title}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${confStyle.bg} ${confStyle.border} ${confStyle.text}`}
                                data-testid="ai-action-confidence"
                              >
                                {act.confidence}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDismissAction(act.actionId)}
                              className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
                              data-testid="ai-action-dismiss-btn"
                              title="Dismiss proposal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Diff */}
                          <div className="mb-2" data-testid="ai-action-diff">
                            {diffDisplay}
                          </div>

                          {/* Rationale / Reason */}
                          <p
                            className="text-xs text-slate-300 leading-relaxed mb-3"
                            data-testid="ai-action-reason"
                          >
                            {act.reason}
                          </p>

                          {/* Stale Warning */}
                          {isStale && (
                            <div
                              className="mb-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between"
                              data-testid="ai-action-stale"
                            >
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  This recommendation was generated from an older version of the
                                  task.
                                </span>
                              </div>
                              {onTaskUpdated && (
                                <button
                                  type="button"
                                  onClick={() => onTaskUpdated()}
                                  className="text-[11px] underline text-amber-200 hover:text-white"
                                  data-testid="ai-action-refresh-task-btn"
                                >
                                  Refresh Task
                                </button>
                              )}
                            </div>
                          )}

                          {/* Error State */}
                          {errMessage && (
                            <div
                              className="mb-3 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5"
                              data-testid="ai-action-error"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{errMessage}</span>
                            </div>
                          )}

                          {/* Success State */}
                          {status === 'applied' && (
                            <div
                              className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 font-medium"
                              data-testid="ai-action-applied"
                            >
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{successMessage || 'Applied successfully'}</span>
                            </div>
                          )}

                          {/* Footer Actions */}
                          {status !== 'applied' && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                              <button
                                type="button"
                                onClick={() => handleDismissAction(act.actionId)}
                                disabled={status === 'applying'}
                                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors"
                              >
                                Dismiss
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApplyAction(act)}
                                disabled={status === 'applying' || isStale}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
                                data-testid="ai-action-apply-btn"
                              >
                                {status === 'applying' ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Applying...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{applyButtonText}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Telemetry Footer */}
              {actionsData.metadata && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Model: {String(actionsData.metadata.model || 'OpenAI')}</span>
                  {actionsData.metadata.total_tokens ? (
                    <span>Tokens: {String(actionsData.metadata.total_tokens)}</span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
