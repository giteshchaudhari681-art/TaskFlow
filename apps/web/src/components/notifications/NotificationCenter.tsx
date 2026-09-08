import React, { useState, useEffect, useRef } from 'react';
import {
 Bell,
 Check,
 CheckCheck,
 ExternalLink,
 MessageSquare,
 UserCheck,
 UserMinus,
 GitCommit,
 ShieldAlert,
 Flag,
 Sparkles,
 Clock,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '@taskflow/shared';
import { notificationApi } from '../../lib/api';

interface NotificationCenterProps {
 onOpenTask: (projectId: string, taskId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onOpenTask }) => {
 const [isOpen, setIsOpen] = useState(false);
 const [unreadCount, setUnreadCount] = useState(0);
 const [notifications, setNotifications] = useState<NotificationItem[]>([]);
 const [unreadOnly, setUnreadOnly] = useState(false);
 const [loading, setLoading] = useState(false);
 const [markingAll, setMarkingAll] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Poll for unread count
 const fetchUnreadCount = async () => {
  try {
   const res = await notificationApi.getUnreadCount();
   setUnreadCount(res.unreadCount);
  } catch {
   // Best-effort
  }
 };

 const fetchNotifications = async (onlyUnread = unreadOnly) => {
  setLoading(true);
  try {
   const res = await notificationApi.list({ limit: 40, unreadOnly: onlyUnread });
   setNotifications(res.notifications);
   setUnreadCount(res.unreadCount);
  } catch {
   // Best-effort
  } finally {
   setLoading(false);
  }
 };

 useEffect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 30000); // 30s polling
  return () => clearInterval(interval);
 }, []);

 useEffect(() => {
  if (isOpen) {
   fetchNotifications(unreadOnly);
  }
 }, [isOpen, unreadOnly]);

 // Click outside listener
 useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
   if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
    setIsOpen(false);
   }
  };
  if (isOpen) {
   document.addEventListener('mousedown', handleClickOutside);
  }
  return () => {
   document.removeEventListener('mousedown', handleClickOutside);
  };
 }, [isOpen]);

 const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
  if (e) e.stopPropagation();
  try {
   await notificationApi.markRead(id);
   setNotifications(prev =>
    prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
   );
   setUnreadCount(prev => Math.max(0, prev - 1));
  } catch {
   // Best-effort
  }
 };

 const handleMarkAllAsRead = async () => {
  if (unreadCount === 0 || markingAll) return;
  setMarkingAll(true);
  try {
   await notificationApi.markAllRead();
   setNotifications(prev =>
    prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
   );
   setUnreadCount(0);
  } catch {
   // Best-effort
  } finally {
   setMarkingAll(false);
  }
 };

 const handleNotificationClick = async (notif: NotificationItem) => {
  if (!notif.isRead) {
   await handleMarkAsRead(notif.id);
  }
  if (notif.projectId && notif.taskId) {
   onOpenTask(notif.projectId, notif.taskId);
   setIsOpen(false);
  }
 };

 const formatRelativeTime = (iso: string): string => {
  try {
   const diffMs = Date.now() - new Date(iso).getTime();
   const mins = Math.floor(diffMs / 60000);
   if (mins < 1) return 'Just now';
   if (mins < 60) return `${mins}m ago`;
   const hours = Math.floor(mins / 60);
   if (hours < 24) return `${hours}h ago`;
   const days = Math.floor(hours / 24);
   if (days < 7) return `${days}d ago`;
   return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
   return '';
  }
 };

 const renderIcon = (type: NotificationType) => {
  switch (type) {
   case NotificationType.TASK_ASSIGNED:
    return (
     <div className="w-7 h-7 rounded bg-[#161920] border border-[#242834] flex items-center justify-center text-slate-300">
      <UserCheck className="w-3.5 h-3.5" />
     </div>
    );
   case NotificationType.TASK_UNASSIGNED:
    return (
     <div className="w-7 h-7 rounded bg-[#191610] border border-amber-900/40 flex items-center justify-center text-amber-400">
      <UserMinus className="w-3.5 h-3.5" />
     </div>
    );
   case NotificationType.COMMENT_CREATED:
    return (
     <div className="w-7 h-7 rounded bg-[#161920] border border-[#242834] flex items-center justify-center text-slate-300">
      <MessageSquare className="w-3.5 h-3.5" />
     </div>
    );
   case NotificationType.TASK_STATUS_CHANGED:
    return (
     <div className="w-7 h-7 rounded bg-[#161920] border border-[#242834] flex items-center justify-center text-slate-300">
      <GitCommit className="w-3.5 h-3.5" />
     </div>
    );
   case NotificationType.TASK_DEPENDENCY_ADDED:
   case NotificationType.TASK_DEPENDENCY_REMOVED:
    return (
     <div className="w-7 h-7 rounded bg-[#1a0f0f] border border-rose-900/40 flex items-center justify-center text-rose-400">
      <ShieldAlert className="w-3.5 h-3.5" />
     </div>
    );
   case NotificationType.MILESTONE_COMPLETED:
    return (
     <div className="w-7 h-7 rounded bg-[#0f1a14] border border-emerald-900/40 flex items-center justify-center text-emerald-400">
      <Flag className="w-3.5 h-3.5" />
     </div>
    );
   default:
    return (
     <div className="w-7 h-7 rounded bg-[#161920] border border-[#242834] flex items-center justify-center text-slate-400">
      <Sparkles className="w-3.5 h-3.5" />
     </div>
    );
  }
 };

 return (
  <div className="relative" ref={dropdownRef}>
   {/* Bell Trigger Button */}
   <button
    type="button"
    onClick={() => setIsOpen(prev => !prev)}
    className={`relative p-2 rounded transition-all cursor-pointer ${
     isOpen
      ? 'bg-[#1a1d26] text-slate-200 border border-[#2a3040]'
      : 'bg-[#161920] hover:bg-[#1a1d26] border border-[#1e2230] text-slate-400 hover:text-slate-200'
    }`}
    title="Notifications"
   >
    <Bell className="w-4 h-4" />
    {unreadCount > 0 && (
     <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#e05638] text-white font-semibold text-[9px] rounded-full flex items-center justify-center border border-[#0c0d10]">
      {unreadCount > 99 ? '99+' : unreadCount}
     </span>
    )}
   </button>

   {/* Popover Dropdown */}
   {isOpen && (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-[#1e2230] shadow-elevation-3 bg-[#12141a] z-50 overflow-hidden flex flex-col max-h-[520px]">
     {/* Header */}
     <div className="px-3 py-2.5 border-b border-[#1e2230] flex items-center justify-between bg-[#161920]">
      <div className="flex items-center space-x-2">
       <span className="font-semibold text-xs text-slate-200">Notifications</span>
       {unreadCount > 0 && (
        <span className="px-1.5 py-px text-[10px] font-mono font-medium bg-[#1a1d26] text-[#e05638] border border-[#2a2030] rounded">
         {unreadCount} unread
        </span>
       )}
      </div>

      <div className="flex items-center space-x-2">
       {unreadCount > 0 && (
        <button
         type="button"
         onClick={handleMarkAllAsRead}
         disabled={markingAll}
         className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
         title="Mark all as read"
        >
         <CheckCheck className="w-3.5 h-3.5" />
         <span>Mark all read</span>
        </button>
       )}
      </div>
     </div>

     {/* Filter Bar */}
     <div className="px-3 py-1.5 border-b border-[#1e2230] flex items-center justify-between text-xs bg-[#12141a]">
      <div className="flex items-center space-x-1">
       <button
        type="button"
        onClick={() => setUnreadOnly(false)}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
         !unreadOnly
          ? 'bg-[#1e2230] text-slate-200 border border-[#2a3040]'
          : 'text-slate-500 hover:text-slate-300'
        }`}
       >
        All
       </button>
       <button
        type="button"
        onClick={() => setUnreadOnly(true)}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
         unreadOnly
          ? 'bg-[#1e2230] text-slate-200 border border-[#2a3040]'
          : 'text-slate-500 hover:text-slate-300'
        }`}
       >
        Unread only
       </button>
      </div>
      <span className="text-[10px] text-slate-600 font-mono">
       {notifications.length} items
      </span>
     </div>

     {/* Notification List */}
     <div className="flex-1 overflow-y-auto divide-y divide-[#1a1e2a]">
      {loading ? (
       <div className="p-8 text-center text-slate-500 space-y-2">
        <div className="w-5 h-5 border-2 border-[#e05638] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading notifications...</p>
       </div>
      ) : notifications.length === 0 ? (
       <div className="p-8 text-center text-slate-500 space-y-2">
        <div className="w-8 h-8 rounded bg-[#1a1d26] border border-[#252b3a] mx-auto flex items-center justify-center">
         <Bell className="w-4 h-4 opacity-60" />
        </div>
        <p className="text-xs font-medium text-slate-300">All caught up!</p>
        <p className="text-[11px] text-slate-500">
         {unreadOnly ? 'No unread notifications' : 'You have no notifications yet'}
        </p>
       </div>
      ) : (
       notifications.map(notif => (
        <div
         key={notif.id}
         onClick={() => handleNotificationClick(notif)}
         className={`p-3 flex items-start space-x-2.5 transition-colors cursor-pointer group ${
          !notif.isRead ? 'bg-[#161920] hover:bg-[#1a1d26]' : 'hover:bg-[#161920]'
         }`}
        >
         {/* Icon */}
         <div className="flex-shrink-0 mt-0.5">{renderIcon(notif.type)}</div>

         {/* Body */}
         <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
           <p
            className={`text-xs font-medium truncate ${
             !notif.isRead ? 'text-slate-100' : 'text-slate-300'
            }`}
           >
            {notif.title}
           </p>
           <span className="text-[10px] text-slate-600 font-mono flex items-center space-x-1">
            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
            {formatRelativeTime(notif.createdAt)}
           </span>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
           {notif.message}
          </p>

          {/* Metadata Pill / Deep Link indicator */}
          <div className="flex items-center justify-between pt-1">
           <div className="flex items-center space-x-2">
            {notif.task && (
             <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1d26] text-slate-400 border border-[#242834]">
              {notif.task.issueKey || `#${notif.task.taskNumber}`}
             </span>
            )}
            {notif.project && (
             <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
              {notif.project.name}
             </span>
            )}
           </div>

           <div className="flex items-center space-x-1.5">
            {!notif.isRead && (
             <button
              type="button"
              onClick={e => handleMarkAsRead(notif.id, e)}
              className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-[#1e2230] transition-colors"
              title="Mark as read"
             >
              <Check className="w-3 h-3" />
             </button>
            )}
            {notif.taskId && (
             <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 group-hover:text-slate-300">
              <ExternalLink className="w-3 h-3" />
             </span>
            )}
           </div>
          </div>
         </div>

         {/* Unread dot */}
         {!notif.isRead && (
          <div className="flex-shrink-0 mt-1">
           <span className="block w-1.5 h-1.5 rounded-full bg-[#e05638]" />
          </div>
         )}
        </div>
       ))
      )}
     </div>
    </div>
   )}
  </div>
 );
};
