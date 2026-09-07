import React, { useState } from 'react';
import { User, Lock, Building2, Users, ArrowLeft, Bell, ShieldCheck, Gauge } from 'lucide-react';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import { WorkspaceSettings } from './WorkspaceSettings';
import { MembersSettings } from './MembersSettings';
import { NotificationSettings } from './NotificationSettings';
import { AuditLogSettings } from './AuditLogSettings';
import { UsageSettings } from './UsageSettings';

export type SettingsTab =
  'profile' | 'security' | 'workspace' | 'members' | 'notifications' | 'audit' | 'usage';

interface SettingsLayoutProps {
  onBackToDashboard: () => void;
  initialTab?: SettingsTab;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  onBackToDashboard,
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile & Identity', icon: User },
    { id: 'security' as SettingsTab, label: 'Security & Password', icon: Lock },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'workspace' as SettingsTab, label: 'Workspace Settings', icon: Building2 },
    { id: 'members' as SettingsTab, label: 'Workspace Members', icon: Users },
    { id: 'usage' as SettingsTab, label: 'Usage & Plan', icon: Gauge },
    { id: 'audit' as SettingsTab, label: 'Audit & Security Log', icon: ShieldCheck },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08] hover:border-slate-700 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>
        <span className="text-[11px] text-slate-500 font-mono">Platform Settings v1.0</span>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-1">
          <div className="p-2 rounded-xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-xl shadow-sm space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3">
          <div className="p-6 sm:p-8 rounded-xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-xl shadow-elevation-2">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'workspace' && <WorkspaceSettings />}
            {activeTab === 'members' && <MembersSettings />}
            {activeTab === 'usage' && <UsageSettings />}
            {activeTab === 'audit' && <AuditLogSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};
