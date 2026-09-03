import React, { useState, useEffect } from 'react';
import {
  Bell,
  UserCheck,
  MessageSquare,
  GitCommit,
  Flag,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@taskflow/shared';
import { notificationApi } from '../../lib/api';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await notificationApi.getPreferences();
        setPreferences(data);
      } catch {
        setErrorMessage('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await notificationApi.updatePreferences(preferences);
      setPreferences(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setErrorMessage('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-12 text-center rounded-xl border border-taskflow-border">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-taskflow-muted">Loading preferences...</p>
      </div>
    );
  }

  const preferenceItems = [
    {
      key: 'taskAssigned' as keyof NotificationPreferences,
      label: 'Task Assignments',
      description: 'Receive notifications when tasks are assigned to you or unassigned.',
      icon: UserCheck,
      color: 'text-cyan-400',
    },
    {
      key: 'comments' as keyof NotificationPreferences,
      label: 'Comments & Collaboration',
      description:
        'Receive notifications when team members comment on tasks you are assigned to or reported.',
      icon: MessageSquare,
      color: 'text-indigo-400',
    },
    {
      key: 'dependencies' as keyof NotificationPreferences,
      label: 'Dependency Blocker Alerts',
      description:
        'Receive immediate notifications when another task is added as a blocker to your work.',
      icon: ShieldAlert,
      color: 'text-rose-400',
    },
    {
      key: 'milestones' as keyof NotificationPreferences,
      label: 'Milestone Completions',
      description:
        'Receive notifications when a project milestone containing your tasks is marked as completed.',
      icon: Flag,
      color: 'text-emerald-400',
    },
    {
      key: 'statusChanges' as keyof NotificationPreferences,
      label: 'Task Status Movements',
      description:
        'Receive notifications whenever a collaborator changes the status of a task assigned to you.',
      icon: GitCommit,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Bell className="w-5 h-5 text-cyan-400" />
          <span>Notification Preferences</span>
        </h2>
        <p className="text-xs text-taskflow-muted mt-0.5">
          Control which personal updates and alerts trigger in-app notifications. Self-actions are
          automatically suppressed.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center space-x-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Notification preferences updated successfully.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center space-x-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="glass-card rounded-xl border border-taskflow-border divide-y divide-taskflow-border/50">
          {preferenceItems.map(item => {
            const Icon = item.icon;
            const isChecked = preferences[item.key];

            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className="p-4 flex items-center justify-between hover:bg-taskflow-surface/40 transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-3.5 pr-4">
                  <div
                    className={`p-2 rounded-lg bg-taskflow-surface border border-taskflow-border ${item.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-taskflow-muted leading-relaxed mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      isChecked
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-600'
                        : 'bg-taskflow-surface border border-taskflow-border'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isChecked ? 'translate-x-5 shadow-md' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow-cyan transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
