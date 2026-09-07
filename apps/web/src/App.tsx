import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  GitBranch,
  Brain,
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
  Sparkles,
  Users,
  Zap,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
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

// ─── Feature card data ───────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: GitBranch,
    color: 'from-sky-500/20 to-sky-500/5',
    iconColor: 'text-sky-400',
    borderGlow: 'hover:border-sky-500/40',
    title: 'Dependency Graphs',
    description:
      'Deterministic DAG blocking dependencies with critical path detection and cascade delay warnings across all roadmap views.',
  },
  {
    icon: Brain,
    color: 'from-violet-500/20 to-violet-500/5',
    iconColor: 'text-violet-400',
    borderGlow: 'hover:border-violet-500/40',
    title: 'AI Delivery Intelligence',
    description:
      'Automated task breakdowns, workload balancing, and delivery risk detection surfaced before they block your team.',
  },
  {
    icon: Activity,
    color: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-400',
    borderGlow: 'hover:border-emerald-500/40',
    title: 'Real-Time Operations',
    description:
      'Live Socket.IO state synchronization, collaborative task updates, and instant notification telemetry for every event.',
  },
  {
    icon: Shield,
    color: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-400',
    borderGlow: 'hover:border-amber-500/40',
    title: 'Enterprise Security',
    description:
      'Multi-tenant isolation, role-based access control, and enterprise-grade permission layers protecting every workspace.',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
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
  };

  const handleOpenTask = (projectId: string, taskId: string) => {
    setSelectedProjectId(projectId);
    setDeepLinkTaskId(taskId);
    setCurrentView('project-details');
  };

  // Health status indicator
  const healthStatus = healthLoading
    ? 'loading'
    : healthError
      ? 'error'
      : health?.status === 'healthy'
        ? 'healthy'
        : 'error';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
            <span>Restoring your session…</span>
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

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200 overflow-x-hidden">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#06080d]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-6 min-w-0">
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
              className="flex items-center gap-2.5 shrink-0 group select-none cursor-pointer"
            >
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/35 group-hover:scale-105 transition-all duration-200 ring-1 ring-white/15">
                <Workflow className="w-4 h-4 text-white" />
                {/* Health indicator dot */}
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#06080d] ${
                    healthStatus === 'healthy'
                      ? 'bg-emerald-400'
                      : healthStatus === 'loading'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-rose-500'
                  }`}
                  title={
                    healthStatus === 'healthy'
                      ? 'All systems operational'
                      : healthStatus === 'loading'
                        ? 'Connecting…'
                        : 'Backend offline'
                  }
                />
              </div>
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-sky-300 transition-colors">
                TaskFlow
              </span>
            </button>

            {/* Desktop nav links */}
            {isAuthenticated && (
              <nav className="hidden lg:flex items-center gap-0.5">
                {[
                  {
                    id: 'dashboard',
                    label: 'Home',
                    icon: LayoutDashboard,
                    view: 'dashboard' as const,
                  },
                  { id: 'projects', label: 'Projects', icon: Layers, view: 'projects' as const },
                  { id: 'my-work', label: 'My Work', icon: CheckSquare, view: 'my-work' as const },
                ].map(({ id, label, icon: Icon, view }) => (
                  <button
                    key={id}
                    type="button"
                    id={`nav-${id}`}
                    onClick={() => {
                      if (view === 'my-work') setDeepLinkTaskId(null);
                      setCurrentView(view);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      currentView === view ||
                      (view === 'projects' && currentView === 'project-details')
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && user ? (
              <>
                {/* Search */}
                {activeOrg && (
                  <button
                    type="button"
                    id="global-search-trigger"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] text-sm text-slate-400 hover:text-white transition-all duration-150 group"
                    title={`Search (${platformKey}K)`}
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                    <span className="hidden sm:inline text-xs">Search…</span>
                    <kbd className="hidden md:inline px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-white/[0.06] border border-white/[0.08]">
                      {platformKey}K
                    </kbd>
                  </button>
                )}

                {/* Project switcher */}
                {activeOrg && (
                  <div className="hidden sm:block">
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

                {/* Workspace selector */}
                {organizations.length > 0 && activeOrg && (
                  <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-xs max-w-[150px]">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <select
                      value={activeOrg.organizationId}
                      onChange={e => {
                        const found = organizations.find(o => o.organizationId === e.target.value);
                        if (found) setActiveOrg(found);
                      }}
                      className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer truncate w-full text-xs"
                    >
                      {organizations.map(org => (
                        <option
                          key={org.organizationId}
                          value={org.organizationId}
                          className="bg-slate-900 text-white"
                        >
                          {org.organizationName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notifications */}
                <NotificationCenter onOpenTask={handleOpenTask} />

                {/* Settings */}
                <button
                  type="button"
                  onClick={() => openSettings('profile')}
                  title="Settings"
                  className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-400 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* User avatar */}
                <button
                  type="button"
                  id="user-avatar-btn"
                  onClick={() => openSettings('profile')}
                  title="Profile settings"
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ring-white/10 hover:ring-sky-500/50 transition-all"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </button>

                {/* Sign out */}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setCurrentView('dashboard');
                    logout();
                  }}
                  title="Sign out"
                  aria-label="Sign Out"
                  className="hidden sm:flex p-1.5 rounded-lg hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Mobile menu toggle */}
                <button
                  type="button"
                  id="mobile-menu-toggle"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle Navigation"
                  className="lg:hidden p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-slate-400 hover:text-white transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Mobile nav drawer */}
        {isMobileMenuOpen && isAuthenticated && (
          <div className="lg:hidden border-t border-white/[0.06] px-4 py-3 space-y-1">
            {[
              {
                id: 'mobile-nav-dashboard',
                label: 'Home',
                icon: LayoutDashboard,
                view: 'dashboard' as const,
              },
              {
                id: 'mobile-nav-projects',
                label: 'Projects',
                icon: Layers,
                view: 'projects' as const,
              },
              {
                id: 'mobile-nav-my-work',
                label: 'My Work',
                icon: CheckSquare,
                view: 'my-work' as const,
              },
              {
                id: 'mobile-nav-settings',
                label: 'Settings',
                icon: Settings,
                view: 'settings' as const,
              },
            ].map(({ id, label, icon: Icon, view }) => (
              <button
                key={id}
                type="button"
                id={id}
                onClick={() => {
                  if (view === 'my-work') setDeepLinkTaskId(null);
                  if (view === 'settings') openSettings('workspace');
                  else setCurrentView(view);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === view
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
              {organizations.length > 0 && activeOrg && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.07] text-xs flex-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <select
                    value={activeOrg.organizationId}
                    onChange={e => {
                      const found = organizations.find(o => o.organizationId === e.target.value);
                      if (found) setActiveOrg(found);
                    }}
                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer truncate w-full text-xs"
                  >
                    {organizations.map(org => (
                      <option
                        key={org.organizationId}
                        value={org.organizationId}
                        className="bg-slate-900 text-white"
                      >
                        {org.organizationName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthView('login');
                  setCurrentView('dashboard');
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full">
        {/* ── Auth views ──────────────────────────────────────────────────────── */}
        {!isAuthenticated ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAuthView('landing')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                ← Back to TaskFlow Landing Page
              </button>
            </div>
            {authView === 'login' ? (
              <LoginPage onSwitchToRegister={() => setAuthView('register')} />
            ) : (
              <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        ) : /* ── My Work ──────────────────────────────────────────────────────────── */
        currentView === 'my-work' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <MyWorkView onOpenTask={handleOpenTask} />
          </div>
        ) : /* ── Settings ─────────────────────────────────────────────────────────── */
        currentView === 'settings' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <SettingsLayout
              onBackToDashboard={() => setCurrentView('dashboard')}
              initialTab={settingsTab}
            />
          </div>
        ) : /* ── Projects list ────────────────────────────────────────────────────── */
        currentView === 'projects' && activeOrg ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
        ) : /* ── Project detail ───────────────────────────────────────────────────── */
        currentView === 'project-details' && activeOrg && selectedProjectId ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
        ) : /* ── Dashboard (authenticated) ────────────────────────────────────────── */
        isAuthenticated ? (
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
          /* ── Pre-auth landing ─────────────────────────────────────────────────── */
          <PreAuthLanding
            onLogin={() => setAuthView('login')}
            onRegister={() => setAuthView('register')}
          />
        )}
      </main>

      {/* ── Global Search Modal ──────────────────────────────────────────────── */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard View — the key redesigned screen
// ─────────────────────────────────────────────────────────────────────────────
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
  healthLoading,
  healthError,
  onRefreshHealth,
  onGoToProjects,
  onGoToMyWork,
  onOpenSettings,
  onGoToSearch,
}) => {
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="relative">
      {/* Ambient background mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-sky-500/[0.07] via-indigo-500/[0.04] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-60 -left-32 w-80 h-80 bg-violet-600/[0.06] rounded-full blur-3xl" />
        <div className="absolute top-80 -right-32 w-96 h-96 bg-sky-600/[0.05] rounded-full blur-3xl" />
      </div>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="max-w-3xl">
          {/* Workspace badge */}
          {activeOrg && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.09] text-xs text-slate-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {activeOrg.organizationName}
              <span className="text-slate-600">·</span>
              <span className="text-slate-500 capitalize">{activeOrg.role}</span>
            </div>
          )}

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08] mb-5">
            Good to see you,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              {firstName}.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl mb-10">
            Your workspace is ready. Jump into a project, review your assignments, or explore what
            needs your attention today.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="hero-cta-projects"
              onClick={onGoToProjects}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              <Layers className="w-4 h-4" />
              View Projects
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
            <button
              type="button"
              id="hero-cta-my-work"
              onClick={onGoToMyWork}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.09] text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              <CheckSquare className="w-4 h-4" />
              My Work
            </button>
            <button
              type="button"
              id="hero-cta-search"
              onClick={onGoToSearch}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-slate-400 hover:text-white text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              <Search className="w-4 h-4" />
              Search…
            </button>
          </div>
        </div>
      </section>

      {/* ── Quick Stats Row ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Infrastructure status */}
          <div
            className="group relative rounded-2xl bg-white/[0.035] border border-white/[0.07] p-6 overflow-hidden cursor-pointer hover:bg-white/[0.055] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]"
            onClick={onRefreshHealth}
            role="button"
            tabIndex={0}
            title="Click to refresh system status"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                {healthLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                ) : healthError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {healthLoading ? '—' : healthError ? 'Offline' : 'Online'}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {health?.database?.status === 'connected'
                  ? `DB · ${health.database.latencyMs ?? '—'}ms`
                  : healthError
                    ? 'Backend unreachable'
                    : 'Infrastructure'}
              </div>
            </div>
          </div>

          {/* My Work CTA card */}
          <div
            className="group relative rounded-2xl bg-white/[0.035] border border-white/[0.07] p-6 overflow-hidden cursor-pointer hover:bg-white/[0.055] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]"
            onClick={onGoToMyWork}
            role="button"
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-sky-400" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">My Work</div>
              <div className="text-xs text-slate-500 font-medium">Tasks assigned to you</div>
            </div>
          </div>

          {/* Settings CTA card */}
          <div
            className="group relative rounded-2xl bg-white/[0.035] border border-white/[0.07] p-6 overflow-hidden cursor-pointer hover:bg-white/[0.055] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]"
            onClick={() => onOpenSettings('members')}
            role="button"
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-violet-400" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">Workspace</div>
              <div className="text-xs text-slate-500 font-medium">Members & permissions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform Feature Cards ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 font-medium mb-3 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            Platform Capabilities
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Built for engineering teams
            <br className="hidden sm:block" /> that move fast.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, color, iconColor, borderGlow, title, description }) => (
            <div
              key={title}
              className={`relative rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.05] ${borderGlow} group`}
            >
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-5 ${iconColor} group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom status strip ──────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.05] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-sky-600" />
              TaskFlow v1.0
            </span>
            <span>·</span>
            <span>Enterprise Operations Platform</span>
          </div>
          {health && (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {health.service} · uptime {Math.floor((health.uptimeSeconds ?? 0) / 60)}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pre-auth landing — shown to unauthenticated visitors on the dashboard route
// ─────────────────────────────────────────────────────────────────────────────
interface PreAuthLandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const PreAuthLanding: React.FC<PreAuthLandingProps> = ({ onLogin, onRegister }) => (
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-sky-500/[0.08] to-transparent blur-3xl rounded-full" />
    </div>
    <div className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
      <Sparkles className="w-3.5 h-3.5" />
      AI-Powered Project Execution
    </div>
    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.06] mb-6">
      Ship projects
      <br />
      <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
        with precision.
      </span>
    </h1>
    <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-10">
      TaskFlow combines deterministic dependency graphs, AI delivery intelligence, and real-time
      collaboration into one unified platform.
    </p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        id="landing-cta-login"
        onClick={onLogin}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-200 hover:-translate-y-0.5"
      >
        Sign In
        <ArrowRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        id="landing-cta-register"
        onClick={onRegister}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.09] text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
      >
        Create Account
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  </ErrorBoundary>
);
