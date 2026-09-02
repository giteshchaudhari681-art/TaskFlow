import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GitFork,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ProjectDependencyGraph, TaskStatus, TaskPriority } from '@taskflow/shared';
import { dependencyApi } from '../../lib/api';

interface DependencyGraphViewProps {
  organizationId: string;
  projectId: string;
  projectKey?: string;
  onSelectTask?: (taskId: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  organizationId,
  projectId,
  onSelectTask,
}) => {
  const [graph, setGraph] = useState<ProjectDependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BLOCKS' | 'RELATES_TO'>('ALL');
  const [onlyConnected, setOnlyConnected] = useState(true);

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dependencyApi.getProjectGraph(organizationId, projectId);
      setGraph(data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load dependency graph');
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Derived metrics
  const stats = useMemo(() => {
    if (!graph) return { totalTasks: 0, totalEdges: 0, blockedCount: 0, blockingCount: 0 };
    const blockedCount = graph.nodes.filter(n => n.blockedByCount > 0).length;
    const blockingCount = graph.nodes.filter(n => n.blockingCount > 0).length;
    return {
      totalTasks: graph.nodes.length,
      totalEdges: graph.edges.length,
      blockedCount,
      blockingCount,
    };
  }, [graph]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    return graph.edges.filter(edge => {
      if (filterType === 'BLOCKS' && edge.type !== 'BLOCKS') return false;
      if (filterType === 'RELATES_TO' && edge.type !== 'RELATES_TO') return false;
      return true;
    });
  }, [graph, filterType]);

  // Connected node IDs based on active filtered edges
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    filteredEdges.forEach(e => {
      ids.add(e.source);
      ids.add(e.target);
    });
    return ids;
  }, [filteredEdges]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter(node => {
      if (onlyConnected && !connectedNodeIds.has(node.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchKey = node.issueKey?.toLowerCase().includes(q) ?? false;
        const matchTitle = node.title.toLowerCase().includes(q);
        if (!matchKey && !matchTitle) return false;
      }
      return true;
    });
  }, [graph, onlyConnected, connectedNodeIds, search]);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case TaskStatus.IN_PROGRESS:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case TaskStatus.IN_REVIEW:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case TaskStatus.BLOCKED:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'text-rose-400';
      case TaskPriority.HIGH:
        return 'text-amber-400';
      case TaskPriority.MEDIUM:
        return 'text-cyan-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Total Dependencies
          </span>
          <span className="text-xl font-bold text-white mt-1 block">{stats.totalEdges}</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Blocked Tasks
          </span>
          <span className="text-xl font-bold text-rose-400 mt-1 block">{stats.blockedCount}</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Blocking Tasks
          </span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">{stats.blockingCount}</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Total Graph Tasks
          </span>
          <span className="text-xl font-bold text-slate-200 mt-1 block">{stats.totalTasks}</span>
        </div>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search task in graph..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Relationships</option>
            <option value="BLOCKS">Blocking Only</option>
            <option value="RELATES_TO">Related Only</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyConnected}
              onChange={e => setOnlyConnected(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Connected only</span>
          </label>
        </div>

        <button
          type="button"
          onClick={fetchGraph}
          title="Refresh Graph"
          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center justify-between p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchGraph} className="underline hover:text-rose-300">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-xs">Computing project dependency graph...</span>
        </div>
      ) : graph && graph.edges.length === 0 ? (
        /* Empty State: No Dependencies */
        <div className="p-12 text-center bg-slate-900/30 border border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
            <GitFork className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Task Dependencies Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Task dependencies let you model execution workflows, blocking tasks, and related
            activities. Open any task from the Board or List and click{' '}
            <strong>+ Add Dependency</strong> to connect tasks.
          </p>
        </div>
      ) : (
        /* Visual Dependency List & Flow */
        <div className="space-y-4">
          {/* Active Relationship Chains */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <GitFork className="w-4 h-4 text-cyan-400" />
                Active Dependency Chains ({filteredEdges.length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEdges.map(edge => {
                const sourceNode = graph?.nodes.find(n => n.id === edge.source);
                const targetNode = graph?.nodes.find(n => n.id === edge.target);

                if (!sourceNode || !targetNode) return null;

                const isBlocking = edge.type === 'BLOCKS';
                const isBlockedUnresolved =
                  isBlocking &&
                  targetNode.status !== TaskStatus.DONE &&
                  targetNode.status !== TaskStatus.CANCELLED;

                return (
                  <div
                    key={edge.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isBlockedUnresolved
                        ? 'bg-rose-950/20 border-rose-900/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Source Task (Blocker) */}
                    <div
                      onClick={() => onSelectTask && onSelectTask(sourceNode.id)}
                      className="cursor-pointer hover:opacity-80 min-w-0 flex-1"
                      title="Click to view predecessor task"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {sourceNode.issueKey}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded border ${getStatusBadge(
                            sourceNode.status
                          )}`}
                        >
                          {sourceNode.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                        {sourceNode.title}
                      </p>
                    </div>

                    {/* Edge Connector Badge */}
                    <div className="px-2.5 flex flex-col items-center shrink-0">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isBlocking
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isBlocking ? 'BLOCKS' : 'RELATES'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                    </div>

                    {/* Target Task (Successor / Blocked) */}
                    <div
                      onClick={() => onSelectTask && onSelectTask(targetNode.id)}
                      className="cursor-pointer hover:opacity-80 min-w-0 flex-1 text-right"
                      title="Click to view successor task"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded border ${getStatusBadge(
                            targetNode.status
                          )}`}
                        >
                          {targetNode.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {targetNode.issueKey}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                        {targetNode.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connected Tasks Grid */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Tasks in Dependency Graph ({filteredNodes.length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNodes.map(node => (
                <div
                  key={node.id}
                  onClick={() => onSelectTask && onSelectTask(node.id)}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl cursor-pointer transition-all hover:shadow-glow-cyan/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {node.issueKey}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold ${getPriorityBadge(node.priority)}`}
                      >
                        {node.priority}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded border ${getStatusBadge(
                          node.status
                        )}`}
                      >
                        {node.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-white font-medium line-clamp-2">{node.title}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">
                      {node.assignee ? node.assignee.name : 'Unassigned'}
                    </span>

                    <div className="flex items-center gap-2">
                      {node.blockedByCount > 0 && (
                        <span className="text-rose-400 font-medium">
                          Blocked by {node.blockedByCount}
                        </span>
                      )}
                      {node.blockingCount > 0 && (
                        <span className="text-cyan-400 font-medium">
                          Blocks {node.blockingCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
