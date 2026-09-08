import React, { useState, useEffect } from 'react';
import {
 Plus,
 Search,
 CheckCircle2,
 AlertCircle,
 Clock,
 Calendar,
 CheckSquare,
 RefreshCw,
 Layers,
 Archive,
 Kanban,
 List as ListIcon,
 Link2,
} from 'lucide-react';
import {
 TaskListItem,
 TaskStatus,
 TaskPriority,
 ProjectMemberDetail,
 LabelItem,
} from '@taskflow/shared';
import { taskApi, labelApi } from '../../lib/api';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { LabelBadge } from '../labels/LabelBadge';

interface TaskListProps {
 organizationId: string;
 projectId: string;
 projectKey: string;
 members: ProjectMemberDetail[];
 canManageTasks: boolean;
 viewMode?: 'board' | 'list';
 onViewModeChange?: (mode: 'board' | 'list') => void;
 initialSelectedTaskId?: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({
 organizationId,
 projectId,
 projectKey,
 members,
 canManageTasks,
 viewMode = 'list',
 onViewModeChange,
 initialSelectedTaskId,
}) => {
 const [tasks, setTasks] = useState<TaskListItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Filters
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('ALL');
 const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
 const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
 const [labelFilter, setLabelFilter] = useState<string>('ALL');
 const [showArchived, setShowArchived] = useState(false);
 const [projectLabels, setProjectLabels] = useState<LabelItem[]>([]);

 // Modals & Drawers
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
  initialSelectedTaskId || null
 );

 useEffect(() => {
  labelApi
   .listLabels(organizationId, projectId)
   .then(setProjectLabels)
   .catch(() => {});
 }, [organizationId, projectId]);

 useEffect(() => {
  loadTasks();
 }, [projectId, statusFilter, priorityFilter, assigneeFilter, labelFilter, showArchived]);

 // Debounced search
 useEffect(() => {
  const timer = setTimeout(() => {
   loadTasks();
  }, 300);
  return () => clearTimeout(timer);
 }, [search]);

 const loadTasks = async () => {
  try {
   setLoading(true);
   setError(null);

   const filterParams: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    search?: string;
    archived?: boolean;
    labelIds?: string[];
   } = {};

   if (statusFilter !== 'ALL') filterParams.status = statusFilter as TaskStatus;
   if (priorityFilter !== 'ALL') filterParams.priority = priorityFilter as TaskPriority;
   if (assigneeFilter !== 'ALL') filterParams.assigneeId = assigneeFilter;
   if (labelFilter !== 'ALL') filterParams.labelIds = [labelFilter];
   if (search.trim()) filterParams.search = search.trim();
   if (showArchived) filterParams.archived = true;

   const data = await taskApi.listTasks(organizationId, projectId, filterParams);
   setTasks(data);
  } catch (err: unknown) {
   const apiErr = err as { message?: string };
   setError(apiErr.message || 'Failed to load tasks');
  } finally {
   setLoading(false);
  }
 };

 const getPriorityBadge = (priority: TaskPriority) => {
  switch (priority) {
   case TaskPriority.URGENT:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Urgent
     </span>
    );
   case TaskPriority.HIGH:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      High
     </span>
    );
   case TaskPriority.MEDIUM:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#1a1d26] text-slate-300 border border-[#2a3040] rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Medium
     </span>
    );
   case TaskPriority.LOW:
   default:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#1a1d26] text-slate-500 border border-[#242834] rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
      Low
     </span>
    );
  }
 };

 const getStatusBadge = (status: TaskStatus) => {
  switch (status) {
   case TaskStatus.DONE:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#0f1a14] text-emerald-400 border border-emerald-900/60 rounded">
      <CheckCircle2 className="w-3 h-3" />
      Done
     </span>
    );
   case TaskStatus.IN_PROGRESS:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#191610] text-amber-400 border border-amber-900/50 rounded">
      <Clock className="w-3 h-3" />
      In Progress
     </span>
    );
   case TaskStatus.IN_REVIEW:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#18131f] text-taskflow-text border border-taskflow-border rounded">
      <Layers className="w-3 h-3" />
      In Review
     </span>
    );
   case TaskStatus.BLOCKED:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#1a0f0f] text-rose-400 border border-rose-900/50 rounded">
      <AlertCircle className="w-3 h-3" />
      Blocked
     </span>
    );
   case TaskStatus.BACKLOG:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#1a1d26] text-slate-400 border border-[#252b3a] rounded">
      Backlog
     </span>
    );
   case TaskStatus.CANCELLED:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#1a1d26] text-slate-500 border border-[#252b3a] line-through rounded">
      Cancelled
     </span>
    );
   case TaskStatus.TODO:
   default:
    return (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#1a1d26] text-slate-300 border border-[#2a3040] rounded">
      To Do
     </span>
    );
  }
 };

 return (
  <div className="space-y-4">
   {/* Top Filter Bar */}
   <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border border-[#1e2230] bg-[#12141a]">
    {/* Search input */}
    <div className="relative flex-1 min-w-[200px]">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
     <input
      type="text"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder={`Search ${projectKey} tasks by key or title...`}
      className="w-full pl-9 pr-3 py-1.5 bg-[#0e1018] border border-[#242834] rounded text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-[#e05638] transition-colors"
     />
    </div>

    {/* Filters dropdown row */}
    <div className="flex flex-wrap items-center gap-2">
     {/* Status filter */}
     <select
      value={statusFilter}
      onChange={e => setStatusFilter(e.target.value)}
      className="px-2.5 py-1.5 bg-[#0e1018] border border-[#242834] rounded text-xs font-medium text-slate-300 focus:outline-none focus:border-[#e05638] cursor-pointer"
     >
      <option value="ALL">All Statuses</option>
      <option value={TaskStatus.TODO}>To Do</option>
      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
      <option value={TaskStatus.IN_REVIEW}>In Review</option>
      <option value={TaskStatus.DONE}>Done</option>
      <option value={TaskStatus.BACKLOG}>Backlog</option>
      <option value={TaskStatus.BLOCKED}>Blocked</option>
      <option value={TaskStatus.CANCELLED}>Cancelled</option>
     </select>

     {/* Priority filter */}
     <select
      value={priorityFilter}
      onChange={e => setPriorityFilter(e.target.value)}
      className="px-2.5 py-1.5 bg-[#0e1018] border border-[#242834] rounded text-xs font-medium text-slate-300 focus:outline-none focus:border-[#e05638] cursor-pointer"
     >
      <option value="ALL">All Priorities</option>
      <option value={TaskPriority.URGENT}>Urgent</option>
      <option value={TaskPriority.HIGH}>High</option>
      <option value={TaskPriority.MEDIUM}>Medium</option>
      <option value={TaskPriority.LOW}>Low</option>
     </select>

     {/* Assignee filter */}
     <select
      value={assigneeFilter}
      onChange={e => setAssigneeFilter(e.target.value)}
      className="px-2.5 py-1.5 bg-[#0e1018] border border-[#242834] rounded text-xs font-medium text-slate-300 focus:outline-none focus:border-[#e05638] cursor-pointer max-w-[140px] truncate"
     >
      <option value="ALL">All Assignees</option>
      {members.map(m => (
       <option key={m.userId} value={m.userId}>
        {m.user.name}
       </option>
      ))}
     </select>

     {/* Label filter */}
     <select
      value={labelFilter}
      onChange={e => setLabelFilter(e.target.value)}
      className="px-2.5 py-1.5 bg-[#0e1018] border border-[#242834] rounded text-xs font-medium text-slate-300 focus:outline-none focus:border-[#e05638] cursor-pointer max-w-[140px] truncate"
     >
      <option value="ALL">All Labels</option>
      {projectLabels.map(l => (
       <option key={l.id} value={l.id}>
        {l.name}
       </option>
      ))}
     </select>

     {/* Show Archived Toggle */}
     <button
      type="button"
      onClick={() => setShowArchived(!showArchived)}
      className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
       showArchived
        ? 'bg-[#1e2230] text-slate-200 border-[#323748]'
        : 'bg-[#0e1018] text-slate-500 border-[#242834] hover:text-slate-300'
      }`}
     >
      <Archive className="w-3 h-3" />
      <span>Archived</span>
     </button>

     {/* Refresh button */}
     <button
      onClick={loadTasks}
      title="Refresh tasks"
      className="p-1.5 bg-[#0e1018] border border-[#1e2230] hover:border-[#323748] text-slate-500 hover:text-slate-200 rounded transition-colors cursor-pointer"
     >
      <RefreshCw className="w-3.5 h-3.5" />
     </button>

     {/* View Mode Toggle */}
     {onViewModeChange && (
      <div className="flex items-center p-0.5 rounded border border-[#1e2230] bg-[#0e1018]">
       <button
        type="button"
        onClick={() => onViewModeChange('board')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
         viewMode === 'board'
          ? 'bg-[#1e2230] text-slate-200 shadow-sm'
          : 'text-slate-500 hover:text-slate-300'
        }`}
        title="Board view"
       >
        <Kanban className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Board</span>
       </button>
       <button
        type="button"
        onClick={() => onViewModeChange('list')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
         viewMode === 'list'
          ? 'bg-[#1e2230] text-slate-200 shadow-sm'
          : 'text-slate-500 hover:text-slate-300'
        }`}
        title="List view"
       >
        <ListIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">List</span>
       </button>
      </div>
     )}

     {/* Create Task CTA */}
     {canManageTasks && (
      <button
       onClick={() => setIsCreateOpen(true)}
       className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e05638] hover:bg-[#cc4a2e] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
      >
       <Plus className="w-3.5 h-3.5" />
       <span>Create Task</span>
      </button>
     )}
    </div>
   </div>

   {/* Error display */}
   {error && (
    <div className="flex items-center justify-between p-3 bg-rose-950/30 border border-rose-800/60 rounded-md text-rose-300 text-xs">
     <div className="flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-rose-400" />
      <span>{error}</span>
     </div>
     <button
      onClick={loadTasks}
      className="underline hover:text-rose-200 text-xs cursor-pointer"
     >
      Retry
     </button>
    </div>
   )}

   {/* Loading Skeletons */}
   {loading && (
    <div className="space-y-1.5">
     {[1, 2, 3, 4, 5].map(n => (
      <div
       key={n}
       className="h-11 bg-[#12141a] border border-[#1e2230] rounded animate-pulse"
      />
     ))}
    </div>
   )}

   {/* Empty State */}
   {!loading && tasks.length === 0 && (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-[#12141a] border border-dashed border-[#1e2230] rounded-lg">
     <div className="p-2.5 bg-[#1a1d26] rounded border border-[#252b3a] mb-3">
      <CheckSquare className="w-5 h-5 text-[#e05638]" />
     </div>
     <h3 className="text-sm font-semibold text-slate-200 mb-1">No tasks found</h3>
     <p className="text-xs text-slate-500 max-w-sm mb-4">
      {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
       ? 'No tasks match the selected filters. Try clearing your filters.'
       : 'There are no tasks in this project yet. Create the first task to start tracking work.'}
     </p>
     {canManageTasks && (
      <button
       onClick={() => setIsCreateOpen(true)}
       className="flex items-center gap-1.5 px-4 py-2 bg-[#e05638] hover:bg-[#cc4a2e] text-white font-medium text-xs rounded transition-colors cursor-pointer"
      >
       <Plus className="w-3.5 h-3.5" />
       <span>Create First Task</span>
      </button>
     )}
    </div>
   )}

   {/* Tasks Table / Card List */}
   {!loading && tasks.length > 0 && (
    <div className="border border-[#1e2230] rounded-lg overflow-hidden bg-[#12141a]">
     <div className="divide-y divide-[#1a1e2a]">
      {tasks.map(task => (
       <div
        key={task.id}
        onClick={() => setSelectedTaskId(task.id)}
        className="group flex flex-col md:flex-row items-start md:items-center justify-between px-3 py-2.5 hover:bg-[#161920] cursor-pointer transition-colors gap-3"
       >
        {/* Left: Key & Title */}
        <div className="flex items-start md:items-center gap-2.5 flex-1 min-w-0">
         <span className="px-1.5 py-px text-[10px] font-mono font-medium bg-[#111318] text-slate-400 border border-[#242834] rounded shrink-0">
          {task.issueKey}
         </span>
         <div className="min-w-0 flex-1">
          <h4 className="text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors truncate">
           {task.title}
          </h4>
          {task.labels && task.labels.length > 0 && (
           <div
            className="flex flex-wrap items-center gap-1 mt-1"
            onClick={e => e.stopPropagation()}
           >
            {task.labels.map(label => (
             <LabelBadge key={label.id} label={label} size="xs" />
            ))}
           </div>
          )}
         </div>
        </div>

        {/* Right: Badges, Assignee, Subtasks, Due date */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
         {/* Status */}
         {getStatusBadge(task.status)}

         {/* Priority */}
         {getPriorityBadge(task.priority)}

         {/* Subtask pill */}
         {task.subtaskCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-medium bg-[#1a1d26] text-slate-500 border border-[#242834] rounded">
           <CheckSquare className="w-3 h-3" />
           <span>
            {task.completedSubtaskCount}/{task.subtaskCount}
           </span>
          </span>
         )}

         {/* Dependency pill */}
         {task.dependencySummary && task.dependencySummary.totalDependencies > 0 && (
          <span
           className={`inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-medium rounded border ${
            task.dependencySummary.hasUnresolvedBlockers
             ? 'bg-[#1a0f0f] text-rose-300 border-rose-900/50'
             : 'bg-[#1a1d26] text-slate-500 border-[#242834]'
           }`}
           title={
            task.dependencySummary.hasUnresolvedBlockers
             ? `Blocked by ${task.dependencySummary.blockedByCount} task(s)`
             : `${task.dependencySummary.totalDependencies} linked dependencies`
           }
          >
           <Link2 className="w-3 h-3" />
           <span>
            {task.dependencySummary.hasUnresolvedBlockers
             ? `Blocked (${task.dependencySummary.blockedByCount})`
             : task.dependencySummary.totalDependencies}
           </span>
          </span>
         )}

         {/* Due Date */}
         {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
           <Calendar className="w-3 h-3" />
           <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </span>
         )}

         {/* Assignee */}
         <div className="flex items-center gap-1.5 pl-2 border-l border-[#1e2230]">
          {task.assignee ? (
           <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[#1e2230] border border-[#2a3040] flex items-center justify-center text-[9px] font-mono font-medium text-slate-300">
             {task.assignee.name.charAt(0)}
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
             {task.assignee.name}
            </span>
           </div>
          ) : (
           <span className="text-xs text-slate-600 italic">Unassigned</span>
          )}
         </div>
        </div>
       </div>
      ))}
     </div>
    </div>
   )}

   {/* Create Task Modal */}
   <CreateTaskModal
    organizationId={organizationId}
    projectId={projectId}
    projectKey={projectKey}
    members={members}
    isOpen={isCreateOpen}
    onClose={() => setIsCreateOpen(false)}
    onCreated={loadTasks}
   />

   {/* Task Detail Drawer */}
   {selectedTaskId && (
    <TaskDetailDrawer
     organizationId={organizationId}
     projectId={projectId}
     taskId={selectedTaskId}
     projectKey={projectKey}
     members={members}
     isOpen={!!selectedTaskId}
     onClose={() => setSelectedTaskId(null)}
     onUpdated={loadTasks}
     onDeleted={loadTasks}
    />
   )}
  </div>
 );
};
