import { CommandAction } from '@taskflow/shared';

export interface ExecutableCommand extends CommandAction {
  action: () => void;
}

export const getPlatformCommandKey = (): string => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl+';
  }
  return 'Ctrl+';
};

export const createStandardCommands = (handlers: {
  goToDashboard: () => void;
  goToProjects: () => void;
  goToMyWork: () => void;
  openNotifications: () => void;
  openSettings: (tab?: 'profile' | 'security' | 'workspace' | 'members' | 'notifications') => void;
  openCreateProject?: () => void;
  openCreateTask?: () => void;
}): ExecutableCommand[] => {
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const modKey = isMac ? '⌘' : 'Ctrl+';

  return [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Operations Dashboard',
      description: 'System health, workspace overview and operational statistics',
      category: 'navigation',
      keywords: ['dashboard', 'home', 'overview', 'health', 'metrics', 'stats'],
      shortcut: `${modKey}D`,
      icon: 'LayoutDashboard',
      action: handlers.goToDashboard,
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      description: 'Explore all active and archived projects in this organization',
      category: 'navigation',
      keywords: ['projects', 'all projects', 'workspace', 'boards', 'repos'],
      shortcut: `${modKey}P`,
      icon: 'Layers',
      action: handlers.goToProjects,
    },
    {
      id: 'nav-my-work',
      label: 'Go to My Work Queue',
      description: 'Personal cockpit with assigned tasks, overdue deadlines and blocked work',
      category: 'navigation',
      keywords: ['my work', 'tasks', 'assigned', 'queue', 'due soon', 'blocked', 'todo'],
      shortcut: `${modKey}W`,
      icon: 'CheckSquare',
      action: handlers.goToMyWork,
    },
    {
      id: 'nav-notifications',
      label: 'Open Notifications Center',
      description: 'Review task assignments, mentions, status changes and blocker updates',
      category: 'navigation',
      keywords: ['notifications', 'alerts', 'inbox', 'bell', 'mentions', 'unread'],
      shortcut: `${modKey}N`,
      icon: 'Bell',
      action: handlers.openNotifications,
    },

    // Settings
    {
      id: 'settings-profile',
      label: 'Settings: Profile & Identity',
      description: 'Update your display name, email and avatar image',
      category: 'preferences',
      keywords: ['profile', 'identity', 'avatar', 'account', 'user', 'name', 'email'],
      icon: 'User',
      action: () => handlers.openSettings('profile'),
    },
    {
      id: 'settings-security',
      label: 'Settings: Security & Password',
      description: 'Update account password and manage active login sessions',
      category: 'preferences',
      keywords: ['security', 'password', 'sessions', 'auth', 'credentials', 'logout all'],
      icon: 'Lock',
      action: () => handlers.openSettings('security'),
    },
    {
      id: 'settings-notifications',
      label: 'Settings: Notification Preferences',
      description: 'Customize notification alerts for assignments, comments and milestones',
      category: 'preferences',
      keywords: ['notification settings', 'preferences', 'email', 'mute', 'frequency'],
      icon: 'Sliders',
      action: () => handlers.openSettings('notifications'),
    },
    {
      id: 'settings-workspace',
      label: 'Settings: Workspace & Organization',
      description: 'Configure organization name, identifier slug and workspace branding',
      category: 'workspace',
      keywords: ['workspace', 'organization', 'tenant', 'slug', 'company', 'brand'],
      icon: 'Building2',
      action: () => handlers.openSettings('workspace'),
    },
    {
      id: 'settings-members',
      label: 'Settings: Workspace Members',
      description: 'Invite colleagues, manage member roles, and revoke access',
      category: 'workspace',
      keywords: ['members', 'team', 'invite', 'users', 'roles', 'permissions'],
      icon: 'Users',
      action: () => handlers.openSettings('members'),
    },

    // Quick Creation
    ...(handlers.openCreateProject
      ? [
          {
            id: 'action-create-project',
            label: 'Create New Project',
            description: 'Initiate a new execution project within this workspace',
            category: 'project' as const,
            keywords: ['create project', 'new project', 'start project', 'add project'],
            icon: 'FolderPlus',
            action: handlers.openCreateProject,
          },
        ]
      : []),

    ...(handlers.openCreateTask
      ? [
          {
            id: 'action-create-task',
            label: 'Create New Task',
            description: 'Log a new task, ticket or work item in the active project',
            category: 'task' as const,
            keywords: ['create task', 'new task', 'add task', 'new ticket', 'issue'],
            icon: 'PlusCircle',
            action: handlers.openCreateTask,
          },
        ]
      : []),
  ];
};

export const filterCommands = (
  query: string,
  commands: ExecutableCommand[]
): ExecutableCommand[] => {
  const clean = query.trim().toLowerCase();
  if (!clean) return commands;

  return commands
    .map(cmd => {
      let score = 0;
      const labelLower = cmd.label.toLowerCase();
      const descLower = (cmd.description || '').toLowerCase();

      if (labelLower === clean) {
        score = 100;
      } else if (labelLower.startsWith(clean)) {
        score = 80;
      } else if (labelLower.includes(clean)) {
        score = 60;
      } else if (cmd.keywords.some(kw => kw.toLowerCase().includes(clean))) {
        score = 50;
      } else if (descLower.includes(clean)) {
        score = 30;
      }

      return { cmd, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.cmd);
};
