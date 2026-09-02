import React, { useState } from 'react';
import { User, Lock, Building2, Users, ArrowLeft } from 'lucide-react';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import { WorkspaceSettings } from './WorkspaceSettings';
import { MembersSettings } from './MembersSettings';

export type SettingsTab = 'profile' | 'security' | 'workspace' | 'members';

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
    { id: 'workspace' as SettingsTab, label: 'Workspace Settings', icon: Building2 },
    { id: 'members' as SettingsTab, label: 'Workspace Members', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex items-center space-x-2 text-xs text-taskflow-muted hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Operations Dashboard</span>
        </button>
        <span className="text-[11px] text-taskflow-muted font-mono">Platform Settings v0.4.0</span>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-1">
          <div className="glass-card p-2 rounded-xl border border-taskflow-border space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-taskflow-muted hover:text-white hover:bg-taskflow-surface/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-taskflow-muted'}`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3">
          <div className="glass-card p-6 rounded-2xl border border-taskflow-border">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'workspace' && <WorkspaceSettings />}
            {activeTab === 'members' && <MembersSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};
