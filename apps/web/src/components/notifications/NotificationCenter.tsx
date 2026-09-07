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
          <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
        );
      case NotificationType.TASK_UNASSIGNED:
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <UserMinus className="w-3.5 h-3.5" />
          </div>
        );
      case NotificationType.COMMENT_CREATED:
        return (
          <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
        );
      case NotificationType.TASK_STATUS_CHANGED:
        return (
          <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <GitCommit className="w-3.5 h-3.5" />
          </div>
        );
      case NotificationType.TASK_DEPENDENCY_ADDED:
      case NotificationType.TASK_DEPENDENCY_REMOVED:
        return (
          <div className="w-7 h-7 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        );
      case NotificationType.MILESTONE_COMPLETED:
        return (
          <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Flag className="w-3.5 h-3.5" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-taskflow-surface border border-taskflow-border flex items-center justify-center text-cyan-400">
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
        className={`relative p-2 rounded-xl transition-all btn-interactive cursor-pointer ${
          isOpen
            ? 'bg-taskflow-surface text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
            : 'bg-taskflow-surface/70 hover:bg-taskflow-surface border border-taskflow-border text-taskflow-muted hover:text-white'
        }`}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white font-semibold text-[9px] rounded-full flex items-center justify-center border border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 shadow-2xl bg-[#0f172a] z-50 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#111827]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-medium bg-slate-800 text-sky-300 border border-slate-700 rounded">
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
                  className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs bg-[#111827]/60">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  !unreadOnly
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnly(true)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  unreadOnly
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unread only
              </button>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {notifications.length} items
            </span>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-9 h-9 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                  <Bell className="w-4 h-4 opacity-60" />
                </div>
                <p className="text-xs font-medium text-white">All caught up!</p>
                <p className="text-[11px] text-slate-400">
                  {unreadOnly ? 'No unread notifications' : 'You have no notifications yet'}
                </p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 flex items-start space-x-2.5 transition-colors cursor-pointer group ${
                    !notif.isRead ? 'bg-sky-950/20 hover:bg-sky-950/30' : 'hover:bg-slate-850'
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">{renderIcon(notif.type)}</div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.isRead ? 'text-cyan-200' : 'text-taskflow-text'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-taskflow-muted font-mono flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-taskflow-muted line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Metadata Pill / Deep Link indicator */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        {notif.task && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-taskflow-surface text-cyan-400 border border-taskflow-border">
                            {notif.task.issueKey || `#${notif.task.taskNumber}`}
                          </span>
                        )}
                        {notif.project && (
                          <span className="text-[10px] text-taskflow-muted truncate max-w-[120px]">
                            {notif.project.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={e => handleMarkAsRead(notif.id, e)}
                            className="p-1 rounded text-taskflow-muted hover:text-cyan-300 hover:bg-taskflow-surface transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        {notif.taskId && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-taskflow-muted group-hover:text-cyan-300">
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="flex-shrink-0 mt-1">
                      <span className="block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
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
