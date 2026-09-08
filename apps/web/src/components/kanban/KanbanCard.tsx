import React, { useState } from 'react';
import {
 Calendar,
 CheckSquare,
 AlertCircle,
 MoreHorizontal,
 ChevronRight,
 Link2,
} from 'lucide-react';
import { TaskListItem, TaskStatus, TaskPriority } from '@taskflow/shared';
import { LabelBadge } from '../labels/LabelBadge';
import { Badge } from '../ui/Badge';
import { motion } from 'framer-motion';

interface KanbanCardProps {
 task: TaskListItem;
 canMove: boolean;
 onCardClick: (task: TaskListItem) => void;
 onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
 task,
 canMove,
 onCardClick,
 onStatusChange,
}) => {
 const [isDragging, setIsDragging] = useState(false);
 const [showQuickMove, setShowQuickMove] = useState(false);

 const getPriorityBadge = (priority: TaskPriority) => {
  switch (priority) {
   case TaskPriority.URGENT:
    return (
     <Badge variant="danger" size="sm" dot>
      Urgent
     </Badge>
    );
   case TaskPriority.HIGH:
    return (
     <Badge variant="warning" size="sm" dot>
      High
     </Badge>
    );
   case TaskPriority.MEDIUM:
    return (
     <Badge variant="primary" size="sm" dot>
      Medium
     </Badge>
    );
   case TaskPriority.LOW:
    return (
     <Badge variant="default" size="sm">
      Low
     </Badge>
    );
   default:
    return null;
  }
 };

 const isOverdue =
  task.dueDate &&
  new Date(task.dueDate) < new Date() &&
  task.status !== TaskStatus.DONE &&
  task.status !== TaskStatus.CANCELLED;

 const handleDragStart = (e: React.DragEvent) => {
  if (!canMove) return;
  setIsDragging(true);
  e.dataTransfer.setData('text/plain', task.id);
  e.dataTransfer.effectAllowed = 'move';
 };

 const handleDragEnd = () => {
  setIsDragging(false);
 };

 return (
  <motion.div
   layoutId={task.id}
   draggable={canMove}
   onDragStart={(e: any) => handleDragStart(e)}
   onDragEnd={handleDragEnd}
   onClick={() => onCardClick(task)}
   initial={{ opacity: 0, y: 5 }}
   animate={{ opacity: 1, y: 0, rotateZ: isDragging ? 1.5 : 0, scale: isDragging ? 1.02 : 1 }}
   transition={{ 
    type: 'spring', 
    stiffness: isDragging ? 200 : 300, 
    damping: isDragging ? 15 : 20 
   }}
   className={`group relative rounded-lg border p-3.5 bg-[#181b23] border-[#242834] hover:bg-[#1c202a] transition-colors cursor-pointer ${
    isDragging
     ? 'opacity-90 border-[#e05638] ring-1 ring-[#e05638]/50 shadow-[0_24px_48px_rgba(12,10,8,0.62)] z-50'
     : 'shadow-elevation-1 hover:shadow-[0_6px_16px_rgba(20,18,16,0.4)] hover:-translate-y-0.5 z-10'
   }`}
  >
   {/* Top row: Issue key & priority */}
   <div className="flex items-center justify-between gap-2 mb-2">
    <div className="flex items-center space-x-2">
     <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#111318] border border-[#242834] text-slate-300">
      {task.issueKey}
     </span>
    </div>

    <div className="flex items-center space-x-1.5">
     {getPriorityBadge(task.priority)}

     {/* Quick Move Dropdown */}
     {canMove && onStatusChange && (
      <div className="relative" onClick={e => e.stopPropagation()}>
       <button
        type="button"
        onClick={() => setShowQuickMove(!showQuickMove)}
        title="Move task to another column"
        aria-label="Move task"
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#242834] text-slate-400 hover:text-white transition-opacity cursor-pointer"
       >
        <MoreHorizontal className="w-3.5 h-3.5" />
       </button>

       {showQuickMove && (
        <div className="absolute right-0 top-6 z-30 w-44 rounded-lg bg-[#161920] border border-[#282c38] shadow-elevation-3 p-1.5 space-y-0.5 text-xs">
         <div className="px-2 py-1 text-[10px] font-bold text-slate-400 font-display uppercase tracking-wider border-b border-[#242834] mb-1">
          Move to Column
         </div>
         {Object.values(TaskStatus).map(s => (
          <button
           key={s}
           type="button"
           disabled={task.status === s}
           onClick={() => {
            setShowQuickMove(false);
            onStatusChange(task.id, s);
           }}
           className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors cursor-pointer ${
            task.status === s
             ? 'text-[#e05638] bg-[#1e222d] font-semibold'
             : 'text-slate-300 hover:text-white hover:bg-[#1e222d]'
           }`}
          >
           <span className="capitalize">{s.replace('_', ' ').toLowerCase()}</span>
           {task.status !== s && <ChevronRight className="w-3 h-3 text-slate-500" />}
          </button>
         ))}
        </div>
       )}
      </div>
     )}
    </div>
   </div>

   {/* Title */}
   <h4 className="text-xs sm:text-sm font-medium text-slate-100 group-hover:text-white transition-colors line-clamp-2 leading-snug mb-2.5 font-display">
    {task.title}
   </h4>

   {/* Labels */}
   {task.labels && task.labels.length > 0 && (
    <div className="flex flex-wrap items-center gap-1 mb-3" onClick={e => e.stopPropagation()}>
     {task.labels.slice(0, 3).map(label => (
      <LabelBadge key={label.id} label={label} size="xs" />
     ))}
     {task.labels.length > 3 && (
      <span
       className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#111318] text-slate-400 border border-[#242834]"
       title={task.labels
        .slice(3)
        .map(l => l.name)
        .join(', ')}
      >
       +{task.labels.length - 3}
      </span>
     )}
    </div>
   )}

   {/* Bottom row: Subtasks, Due Date, and Assignee */}
   <div className="flex items-center justify-between pt-2.5 border-t border-[#242834] text-xs text-slate-400">
    <div className="flex items-center space-x-3">
     {/* Subtask count */}
     {task.subtaskCount > 0 && (
      <span
       className="flex items-center text-[11px] font-medium text-slate-300"
       title={`${task.completedSubtaskCount}/${task.subtaskCount} subtasks completed`}
      >
       <CheckSquare className="w-3.5 h-3.5 mr-1 text-slate-500" />
       <span>
        {task.completedSubtaskCount > 0
         ? `${task.completedSubtaskCount}/${task.subtaskCount}`
         : task.subtaskCount}
       </span>
      </span>
     )}

     {/* Due date */}
     {task.dueDate && (
      <span
       className={`flex items-center text-[11px] font-medium ${
        isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
       }`}
       title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}
      >
       {isOverdue ? (
        <AlertCircle className="w-3.5 h-3.5 mr-1" />
       ) : (
        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
       )}
       <span>
        {new Date(task.dueDate).toLocaleDateString(undefined, {
         month: 'short',
         day: 'numeric',
        })}
       </span>
      </span>
     )}

     {/* Dependency indicator */}
     {task.dependencySummary && task.dependencySummary.totalDependencies > 0 && (
      <span
       className={`flex items-center text-[11px] font-medium ${
        task.dependencySummary.hasUnresolvedBlockers
         ? 'text-rose-400 font-semibold'
         : 'text-slate-400'
       }`}
       title={
        task.dependencySummary.hasUnresolvedBlockers
         ? `Blocked by ${task.dependencySummary.blockedByCount} task(s)`
         : `${task.dependencySummary.totalDependencies} linked dependencies`
       }
      >
       <Link2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
       <span>
        {task.dependencySummary.hasUnresolvedBlockers
         ? `Blocked (${task.dependencySummary.blockedByCount})`
         : task.dependencySummary.totalDependencies}
       </span>
      </span>
     )}
    </div>

    {/* Assignee Avatar */}
    <div>
     {task.assignee ? (
      <div
       className="w-5.5 h-5.5 rounded bg-[#222634] border border-[#323748] flex items-center justify-center text-[10px] font-mono font-bold text-slate-200"
       title={`Assigned to ${task.assignee.name}`}
      >
       {task.assignee.name.charAt(0).toUpperCase()}
      </div>
     ) : (
      <div
       className="w-5.5 h-5.5 rounded border border-dashed border-[#2d3242] flex items-center justify-center text-[10px] text-slate-500"
       title="Unassigned"
      >
       -
      </div>
     )}
    </div>
   </div>
  </motion.div>
 );
};
