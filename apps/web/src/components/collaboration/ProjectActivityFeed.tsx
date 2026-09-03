import React, { useState, useEffect } from 'react';
import {
  Activity,
  History,
  MessageSquare,
  Milestone,
  CheckCircle2,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ActivityItem } from '@taskflow/shared';
import { activityApi } from '../../lib/api';
import { formatActivityEvent } from '../../lib/activityFormatter';

interface ProjectActivityFeedProps {
  organizationId: string;
  projectId: string;
}

type FilterOption = 'ALL' | 'TASKS' | 'COMMENTS' | 'MILESTONES';

export const ProjectActivityFeed: React.FC<ProjectActivityFeedProps> = ({
  organizationId,
  projectId,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  useEffect(() => {
    loadActivities();
  }, [projectId, activeFilter]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const filterParam = activeFilter === 'ALL' ? undefined : activeFilter;
      const data = await activityApi.getProjectActivity(organizationId, projectId, {
        filterType: filterParam,
        limit: 50,
      });
      setActivities(data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load project activity');
    } finally {
      setLoading(false);
    }
  };

  const filterChips: { id: FilterOption; label: string; icon: React.FC<{ className?: string }> }[] =
    [
      { id: 'ALL', label: 'All Activity', icon: Activity },
      { id: 'TASKS', label: 'Tasks', icon: CheckCircle2 },
      { id: 'COMMENTS', label: 'Comments', icon: MessageSquare },
      { id: 'MILESTONES', label: 'Milestones', icon: Milestone },
    ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Project Activity Feed</h2>
            <p className="text-xs text-slate-400">
              Complete audit trail and collaboration events for this project
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1 mr-1" />
          {filterChips.map(chip => {
            const Icon = chip.icon;
            const isSelected = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mb-3" />
          <span>Loading project activity feed...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-2xl text-sm text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadActivities}
            className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && activities.length === 0 && (
        <div className="text-center py-16 px-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No activity events found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeFilter === 'ALL'
              ? 'Activity will automatically record here as tasks, milestones, and comments are updated.'
              : `No activity events match the selected "${activeFilter.toLowerCase()}" filter.`}
          </p>
        </div>
      )}

      {/* Activity Feed List */}
      {!loading && activities.length > 0 && (
        <div className="space-y-3">
          {activities.map(activity => {
            const formatted = formatActivityEvent(activity);
            return (
              <div
                key={activity.id}
                className="group flex items-start gap-3.5 p-4 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition-all shadow-sm"
              >
                {/* Actor Avatar */}
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-cyan-500/10 shrink-0 mt-0.5">
                  {activity.actor?.name ? activity.actor.name[0].toUpperCase() : 'U'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs text-slate-300">
                      <span className="font-semibold text-white mr-1.5">{formatted.title}</span>
                      <span className="text-slate-400">{formatted.actionDescription}</span>
                    </p>
                    <span className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                      {formatted.timeAgo}
                    </span>
                  </div>

                  {formatted.targetDescription && (
                    <div className="mt-1 text-xs text-slate-400 bg-slate-950/60 border border-slate-800/60 rounded-lg px-2.5 py-1 inline-block max-w-full truncate">
                      {formatted.targetDescription}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
