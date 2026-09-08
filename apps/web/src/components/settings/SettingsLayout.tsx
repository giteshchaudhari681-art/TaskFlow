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
 | 'profile'
 | 'security'
 | 'workspace'
 | 'members'
 | 'notifications'
 | 'audit'
 | 'usage';

interface SettingsLayoutProps {
 onBackToDashboard: () => void;
 initialTab?: SettingsTab;
}

 export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  onBackToDashboard,
  initialTab = 'profile',
 }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
 
  React.useEffect(() => {
   setActiveTab(initialTab);
  }, [initialTab]);
 

 const tabs = [
  { id: 'profile' as SettingsTab, label: 'Profile' },
  { id: 'security' as SettingsTab, label: 'Security' },
  { id: 'notifications' as SettingsTab, label: 'Notifications' },
  { id: 'workspace' as SettingsTab, label: 'Workspace' },
  { id: 'members' as SettingsTab, label: 'Members' },
  { id: 'usage' as SettingsTab, label: 'Usage' },
  { id: 'audit' as SettingsTab, label: 'Audit log' },
 ];

 const icons: Record<SettingsTab, React.FC<{ className?: string }>> = {
  profile: User,
  security: Lock,
  notifications: Bell,
  workspace: Building2,
  members: Users,
  usage: Gauge,
  audit: ShieldCheck,
 };

 return (
  <div className="space-y-8">
   <div className="flex items-end justify-between gap-4 pb-4 border-b border-[#2e2924]">
    <div>
     <button
      type="button"
      onClick={onBackToDashboard}
      className="inline-flex items-center gap-1.5 text-xs text-[#9c948a] hover:text-[#f3ede4] mb-3"
     >
      <ArrowLeft className="w-3.5 h-3.5" />
      Home
     </button>
     <h1 className="tf-page-title">Settings</h1>
    </div>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
    <nav className="md:col-span-1 space-y-0.5">
     {tabs.map(tab => {
      const Icon = icons[tab.id];
      const isActive = activeTab === tab.id;
      return (
       <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium relative ${
         isActive ? 'text-[#f3ede4] bg-[#1c1916]' : 'text-[#9c948a] hover:text-[#f3ede4]'
        }`}
       >
        {isActive && (
         <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#c45c26]" />
        )}
        <Icon className="w-3.5 h-3.5" />
        {tab.label}
       </button>
      );
     })}
    </nav>

    <div className="md:col-span-3 min-w-0">
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
 );
};
