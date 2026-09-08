import React, { useState, useEffect } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import {
  Activity,
  Layers,
  GitBranch,
  Workflow,
  LogOut,
  Building2,
  Settings,
  LayoutDashboard,
  CheckSquare,
  Search,
  Menu,
  X,
  ArrowRight,
  Users,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import type { HealthCheckData } from '@taskflow/shared';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { SettingsLayout, SettingsTab } from './components/settings/SettingsLayout';
import { ProjectsList } from './components/projects/ProjectsList';
import { ProjectDetailShell } from './components/projects/ProjectDetailShell';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { MyWorkView } from './components/work/MyWorkView';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { ProjectSwitcher } from './components/navigation/ProjectSwitcher';
import { getPlatformCommandKey } from './components/command/commandRegistry';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LandingPage } from './components/landing/LandingPage';
const FEATURES = [
  {
    icon: GitBranch,
    title: 'Dependency graphs',
    description:
      'Deterministic DAG blocking with critical-path detection and cascade delay warnings.',
  },
  {
    icon: Activity,
    title: 'Delivery intelligence',
    description: 'Risk, workload, and milestone analysis as decision support — not decoration.',
  },
  {
    icon: CheckSquare,
    title: 'Live operations',
    description: 'Collaborative task updates and notification telemetry as work happens.',
  },
  {
    icon: Shield,
    title: 'Workspace security',
    description: 'Multi-tenant isolation, role-based access, and auditable administration.',
  },
];

const MainApp: React.FC = () => {
  const { user, activeOrg, organizations, setActiveOrg, isAuthenticated, isLoading, logout } =
    useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'projects' | 'project-details' | 'settings' | 'my-work'
  >('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [deepLinkTaskId, setDeepLinkTaskId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.success && json.data) {
        setHealth(json.data);
      } else {
        throw new Error(json.error?.message || 'Unexpected response format');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to API server';
      setHealthError(msg);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentView('dashboard');
      setSelectedProjectId(null);
      setDeepLinkTaskId(null);
      setAuthView('landing');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const platformKey = getPlatformCommandKey();

  const openSettings = (tab: SettingsTab = 'profile') => {
    setSettingsTab(tab);
    setDeepLinkTaskId(null);
    setCurrentView('settings');
    setIsMobileMenuOpen(false);
  };

  const handleOpenTask = (projectId: string, taskId: string) => {
    setSelectedProjectId(projectId);
    setDeepLinkTaskId(taskId);
    setCurrentView('project-details');
  };

  const healthStatus = healthLoading
    ? 'loading'
    : healthError
      ? 'error'
      : health?.status === 'healthy'
        ? 'healthy'
        : 'error';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center">
        <div className="flex flex-col items-start gap-3">
          <span className="font-display text-2xl text-[#f3ede4]">TaskFlow</span>
          <div className="flex items-center gap-2 text-sm text-[#9c948a]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#c45c26]" />
            <span>Restoring session</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && authView === 'landing') {
    return (
      <LandingPage
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
      />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, view: 'dashboard' as const },
    { id: 'projects', label: 'Projects', icon: Layers, view: 'projects' as const },
    { id: 'my-work', label: 'My Work', icon: CheckSquare, view: 'my-work' as const },
  ];

  const isNavActive = (view: typeof currentView | 'projects') =>
    currentView === view || (view === 'projects' && currentView === 'project-details');

  const SidebarNav = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={() => {
          if (!isAuthenticated) {
            setAuthView('landing');
          } else {
            setCurrentView('dashboard');
            setIsMobileMenuOpen(false);
          }
        }}
        className="flex items-center gap-2.5 px-5 h-14 border-b border-[#2e2924] shrink-0 text-left"
      >
        <span className="w-7 h-7 rounded-[4px] bg-[#c45c26] text-white flex items-center justify-center relative">
          <Workflow className="w-3.5 h-3.5" />
          <span
            className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#141210] ${
              healthStatus === 'healthy'
                ? 'bg-[#3d8b6e]'
                : healthStatus === 'loading'
                  ? 'bg-[#c4843a]'
                  : 'bg-[#c44a4a]'
            }`}
            title={
              healthStatus === 'healthy'
                ? 'All systems operational'
                : healthStatus === 'loading'
                  ? 'Connecting…'
                  : 'Backend offline'
            }
          />
        </span>
        <span className="font-display text-[1.05rem] text-[#f3ede4]">TaskFlow</span>
      </button>

      {isAuthenticated && (
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-5 mb-2 tf-kicker">Workspace</div>
          {navItems.map(({ id, label, icon: Icon, view }) => {
            const active = isNavActive(view);
            return (
              <button
                key={id}
                type="button"
                id={mobile ? `mobile-nav-${id}` : `nav-${id}`}
                onClick={() => {
                  if (view === 'my-work') setDeepLinkTaskId(null);
                  setCurrentView(view);
                  setIsMobileMenuOpen(false);
                }}
                className={`tf-nav-item relative ${active ? 'tf-nav-item-active' : ''}`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#c45c26]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            );
          })}

          <div className="mx-5 my-5 tf-rule" />

          <div className="px-5 mb-2 tf-kicker">Admin</div>
          {[
            { id: 'members', label: 'Members', icon: Users },
            { id: 'usage', label: 'Usage', icon: Gauge },
            { id: 'audit', label: 'Audit', icon: ShieldCheck },
            { id: 'workspace', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => {
            const active = currentView === 'settings' && settingsTab === id;
            return (
              <button
                key={id}
                type="button"
                id={mobile ? `mobile-nav-settings-${id}` : undefined}
                onClick={() => openSettings(id as any)}
                className={`tf-nav-item relative ${active ? 'tf-nav-item-active' : ''}`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#c45c26]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      )}

      {isAuthenticated && user && (
        <div className="border-t border-[#2e2924] p-4 space-y-3">
          {organizations.length > 0 && activeOrg && (
            <div className="flex items-center gap-2 text-xs text-[#9c948a]">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <select
                value={activeOrg.organizationId}
                onChange={e => {
                  const found = organizations.find(o => o.organizationId === e.target.value);
                  if (found) setActiveOrg(found);
                }}
                className="bg-transparent text-[#f3ede4] font-medium focus:outline-none cursor-pointer truncate w-full text-xs"
              >
                {organizations.map(org => (
                  <option
                    key={org.organizationId}
                    value={org.organizationId}
                    className="bg-[#211e1a] text-[#f3ede4]"
                  >
                    {org.organizationName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openSettings('profile')}
              className="flex items-center gap-2 min-w-0 text-left"
            >
              <span className="w-7 h-7 rounded-[4px] bg-[#c45c26] flex items-center justify-center text-[11px] font-semibold text-white overflow-hidden shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="truncate text-xs text-[#f3ede4]">{user.name}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthView('login');
                setCurrentView('dashboard');
                logout();
              }}
              title="Sign out"
              aria-label="Sign Out"
              className="p-1.5 text-[#9c948a] hover:text-[#f3ede4]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141210] text-[#f3ede4] flex selection:bg-[#c45c26]/30 overflow-x-hidden">
      {isAuthenticated && (
        <aside className="hidden lg:flex w-[232px] shrink-0 border-r border-[#2e2924] bg-[#161310] flex-col sticky top-0 h-screen">
          <SidebarNav />
        </aside>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-50 bg-[#141210]/95 border-b border-[#2e2924]">
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setAuthView('landing')}
                  className="flex items-center gap-2"
                >
                  <span className="w-7 h-7 rounded-[4px] bg-[#c45c26] text-white flex items-center justify-center">
                    <Workflow className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-display text-lg">TaskFlow</span>
                </button>
              )}
              {isAuthenticated && activeOrg && (
                <div className="hidden sm:block min-w-0">
                  <ProjectSwitcher
                    organizationId={activeOrg.organizationId}
                    selectedProjectId={selectedProjectId}
                    onSelectProject={id => {
                      setSelectedProjectId(id);
                      setDeepLinkTaskId(null);
                      setCurrentView('project-details');
                    }}
                    onViewAllProjects={() => {
                      setSelectedProjectId(null);
                      setCurrentView('projects');
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isAuthenticated && user ? (
                <>
                  {activeOrg && (
                    <button
                      type="button"
                      id="global-search-trigger"
                      onClick={() => setIsSearchOpen(true)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#9c948a] hover:text-[#f3ede4] hover:bg-[#1c1916] rounded-[4px] transition-colors"
                      title={`Search (${platformKey}K)`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Search</span>
                      <kbd className="hidden md:inline px-1 py-0.5 text-[10px] font-mono text-[#7d756c] border border-[#3a342c] rounded-[3px]">
                        {platformKey}K
                      </kbd>
                    </button>
                  )}
                  <NotificationCenter onOpenTask={handleOpenTask} />
                  <button
                    type="button"
                    id="user-avatar-btn"
                    onClick={() => openSettings('profile')}
                    title="Profile settings"
                    className="w-7 h-7 rounded-[4px] bg-[#c45c26] flex items-center justify-center text-[11px] font-semibold text-white overflow-hidden"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openSettings('profile')}
                    title="Settings"
                    className="p-1.5 text-[#9c948a] hover:text-[#f3ede4] rounded-[4px] hover:bg-[#1c1916]"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    id="mobile-menu-toggle"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle Navigation"
                    className="lg:hidden p-1.5 text-[#9c948a] hover:text-[#f3ede4]"
                  >
                    {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isMobileMenuOpen && isAuthenticated && (
            <div className="lg:hidden border-t border-[#2e2924] bg-[#161310] max-h-[80vh] overflow-y-auto">
              <SidebarNav mobile />
            </div>
          )}
        </header>

        <main className="flex-1 w-full">
          {!isAuthenticated ? (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
              <button
                type="button"
                onClick={() => setAuthView('landing')}
                className="mb-6 text-xs font-medium text-[#9c948a] hover:text-[#f3ede4]"
              >
                ← Back to TaskFlow
              </button>
              {authView === 'login' ? (
                <LoginPage onSwitchToRegister={() => setAuthView('register')} />
              ) : (
                <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
              )}
            </div>
          ) : currentView === 'my-work' ? (
            <div className="px-4 sm:px-8 lg:px-10 py-8 max-w-[1200px]">
              <MyWorkView onOpenTask={handleOpenTask} />
            </div>
          ) : currentView === 'settings' ? (
            <div className="px-4 sm:px-8 lg:px-10 py-8 max-w-[1200px]">
              <SettingsLayout
                onBackToDashboard={() => setCurrentView('dashboard')}
                initialTab={settingsTab}
              />
            </div>
          ) : currentView === 'projects' && activeOrg ? (
            <div className="px-4 sm:px-8 lg:px-10 py-8 max-w-[1200px]">
              <ProjectsList
                organizationId={activeOrg.organizationId}
                organizationName={activeOrg.organizationName}
                onSelectProject={id => {
                  setSelectedProjectId(id);
                  setDeepLinkTaskId(null);
                  setCurrentView('project-details');
                }}
              />
            </div>
          ) : currentView === 'project-details' && activeOrg && selectedProjectId ? (
            <div className="px-4 sm:px-8 lg:px-10 py-8 max-w-[1280px]">
              <ProjectDetailShell
                organizationId={activeOrg.organizationId}
                projectId={selectedProjectId}
                initialTaskId={deepLinkTaskId}
                onBack={() => {
                  setSelectedProjectId(null);
                  setDeepLinkTaskId(null);
                  setCurrentView('projects');
                }}
              />
            </div>
          ) : isAuthenticated ? (
            <DashboardView
              user={user}
              activeOrg={activeOrg}
              organizations={organizations}
              health={health}
              healthLoading={healthLoading}
              healthError={healthError}
              onRefreshHealth={fetchHealth}
              onGoToProjects={() => setCurrentView('projects')}
              onGoToMyWork={() => {
                setDeepLinkTaskId(null);
                setCurrentView('my-work');
              }}
              onOpenSettings={openSettings}
              onGoToSearch={() => setIsSearchOpen(true)}
            />
          ) : (
            <PreAuthLanding
              onLogin={() => setAuthView('login')}
              onRegister={() => setAuthView('register')}
            />
          )}
        </main>
      </div>

      {isAuthenticated && activeOrg && (
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          organizationId={activeOrg.organizationId}
          onSelectTask={handleOpenTask}
          onSelectProject={id => {
            setSelectedProjectId(id);
            setDeepLinkTaskId(null);
            setCurrentView('project-details');
          }}
          goToDashboard={() => setCurrentView('dashboard')}
          goToProjects={() => {
            setSelectedProjectId(null);
            setCurrentView('projects');
          }}
          goToMyWork={() => {
            setDeepLinkTaskId(null);
            setCurrentView('my-work');
          }}
          openNotifications={() => {}}
          openSettings={openSettings}
        />
      )}
    </div>
  );
};

interface DashboardViewProps {
  user: { name: string; avatarUrl?: string | null } | null;
  activeOrg: { organizationId: string; organizationName: string; role: string } | null;
  organizations: { organizationId: string; organizationName: string; role: string }[];
  health: HealthCheckData | null;
  healthLoading: boolean;
  healthError: string | null;
  onRefreshHealth: () => void;
  onGoToProjects: () => void;
  onGoToMyWork: () => void;
  onOpenSettings: (tab?: SettingsTab) => void;
  onGoToSearch: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  activeOrg,
  health,
  healthError,
  onGoToProjects,
  onGoToMyWork,
  onOpenSettings,
}) => {
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const [projects, setProjects] = React.useState<any[]>([]);
  const [myWork, setMyWork] = React.useState<any>(null);
  const [loadingData, setLoadingData] = React.useState(true);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  React.useEffect(() => {
    if (!activeOrg) return;
    const loadData = async () => {
      setLoadingData(true);
      try {
        const { projectApi, workApi } = await import('./lib/api');
        const [projRes, workRes] = await Promise.all([
          projectApi
            .listProjects(activeOrg.organizationId)
            .then(data => ({ success: true, data }))
            .catch(() => ({ success: false, data: [] })),
          workApi
            .getMyWork()
            .then(data => ({ success: true, data }))
            .catch(() => ({ success: false, data: null })),
        ]);
        if (projRes.success) setProjects(projRes.data);
        if (workRes.success) setMyWork(workRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [activeOrg]);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <motion.div
      className="px-4 sm:px-8 lg:px-10 py-10 max-w-[1100px] relative group"
      onMouseMove={handleMouseMove}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Pointer Spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-500 group-hover:opacity-100 hidden sm:block"
        style={{
          background: useMotionTemplate`
      radial-gradient(
       400px circle at ${mouseX}px ${mouseY}px,
       rgba(196, 92, 38, 0.04),
       transparent 80%
      )
     `,
        }}
      />

      <motion.p variants={itemVariants} className="tf-kicker mb-3 relative z-10">
        {activeOrg ? `${activeOrg.organizationName} · Workspace Home` : 'Workspace'}
      </motion.p>
      <motion.h1 variants={itemVariants} className="tf-page-title mb-8 relative z-10">
        Good to see you, <span className="italic text-[#c45c26]">{firstName}</span>
      </motion.h1>

      {/* Primary Actions */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center gap-2 mb-10 relative z-10"
      >
        <button
          type="button"
          onClick={onGoToProjects}
          className="btn-interactive inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#c45c26] text-white text-sm font-semibold hover:bg-[#a84d20] shadow-[0_4px_12px_rgba(196,92,38,0.2)] hover:shadow-[0_6px_16px_rgba(196,92,38,0.3)] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
        >
          View projects
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onGoToMyWork}
          className="btn-interactive inline-flex items-center gap-2 px-4 py-2 rounded-[4px] border border-[#3a342c] text-sm text-[#f3ede4] hover:bg-[#1c1916] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
        >
          My work
        </button>
      </motion.div>

      {/* Dashboard Content */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 relative z-10"
      >
        {/* Your Work Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#f3ede4] border-b border-[#2e2924] pb-2">
            Your Work
          </h2>
          {loadingData ? (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-10 bg-[#1c1916] rounded-[4px]" />
              <div className="h-10 bg-[#1c1916] rounded-[4px]" />
            </div>
          ) : myWork && myWork.tasks && myWork.tasks.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[#161310] border border-[#2e2924] rounded-[4px] card-interactive hover:bg-[#1c1916]">
                <span className="text-sm text-[#f3ede4]">{myWork.tasks.length} active tasks</span>
                <button onClick={onGoToMyWork} className="text-xs text-[#c45c26] hover:underline">
                  View all
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-[#2e2924] rounded-[4px] text-sm text-[#9c948a] bg-[#161310]">
              You have no assigned tasks.
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#f3ede4] border-b border-[#2e2924] pb-2">
            Projects
          </h2>
          {loadingData ? (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-10 bg-[#1c1916] rounded-[4px]" />
              <div className="h-10 bg-[#1c1916] rounded-[4px]" />
            </div>
          ) : projects.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[#161310] border border-[#2e2924] rounded-[4px] card-interactive hover:bg-[#1c1916]">
                <span className="text-sm text-[#f3ede4]">{projects.length} active projects</span>
                <button onClick={onGoToProjects} className="text-xs text-[#c45c26] hover:underline">
                  View all
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-[#2e2924] rounded-[4px] text-sm text-[#9c948a] bg-[#161310]">
              No active projects.
            </div>
          )}
        </div>
      </motion.div>

      {/* System Status (Contextual) */}
      <motion.div
        variants={itemVariants}
        className="mt-12 pt-6 border-t border-[#2e2924] flex flex-wrap items-center justify-between gap-3 text-xs text-[#7d756c] relative z-10"
      >
        <span>TaskFlow · Workspace operations</span>
        <div className="flex items-center gap-4">
          {health && (
            <span className="flex items-center gap-1.5">
              {healthError ? (
                <AlertCircle className="w-3 h-3 text-[#c44a4a]" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-[#3d8b6e]" />
              )}
              {healthError ? 'Offline' : 'Online'}
            </span>
          )}
          <button
            onClick={() => onOpenSettings('members')}
            className="hover:text-[#f3ede4] transition-colors"
          >
            Manage Members
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface PreAuthLandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const PreAuthLanding: React.FC<PreAuthLandingProps> = ({ onLogin, onRegister }) => (
  <div className="px-4 sm:px-8 py-20 max-w-[720px]">
    <p className="tf-kicker mb-4">Project operations</p>
    <h1 className="tf-page-title mb-4">Ship work with a clear operating picture.</h1>
    <p className="text-[#9c948a] leading-relaxed mb-8">
      Dependency graphs, delivery analysis, and collaboration in one workspace.
    </p>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        id="landing-cta-login"
        onClick={onLogin}
        className="px-5 py-2.5 rounded-[4px] bg-[#c45c26] text-white text-sm font-semibold"
      >
        Sign in
      </button>
      <button
        type="button"
        id="landing-cta-register"
        onClick={onRegister}
        className="px-5 py-2.5 rounded-[4px] border border-[#3a342c] text-sm"
      >
        Create account
      </button>
    </div>
  </div>
);

export const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  </ErrorBoundary>
);
