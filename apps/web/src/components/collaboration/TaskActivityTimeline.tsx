import React, { useState, useEffect } from 'react';
import { History, Loader2, AlertCircle, Clock } from 'lucide-react';
import { ActivityItem } from '@taskflow/shared';
import { activityApi } from '../../lib/api';
import { formatActivityEvent } from '../../lib/activityFormatter';

interface TaskActivityTimelineProps {
  organizationId: string;
  projectId: string;
  taskId: string;
  refreshTrigger?: number;
}

export const TaskActivityTimeline: React.FC<TaskActivityTimelineProps> = ({
  organizationId,
  projectId,
  taskId,
  refreshTrigger,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [taskId, refreshTrigger]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await activityApi.getTaskActivity(organizationId, projectId, taskId);
      setActivities(data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load task activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Activity History</h3>
        </div>
        <span className="text-[11px] text-slate-500">{activities.length} events</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2 text-cyan-400" />
          <span>Loading activity history...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadActivities}
            className="text-cyan-400 hover:underline text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="text-center py-6 px-4 bg-slate-950/30 border border-slate-800/60 rounded-xl">
          <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
          <p className="text-xs font-medium text-slate-400">No activity recorded yet</p>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {activities.map(activity => {
            const formatted = formatActivityEvent(activity);
            return (
              <div key={activity.id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-cyan-500 group-hover:border-cyan-400 group-hover:scale-110 transition-all" />

                <div className="text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-200">{formatted.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{formatted.timeAgo}</span>
                  </div>
                  <p className="text-slate-400 mt-0.5">{formatted.actionDescription}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
