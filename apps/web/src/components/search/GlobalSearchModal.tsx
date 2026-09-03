import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Layers,
  CheckSquare,
  Flag,
  User,
  Tag,
  Zap,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { SearchResultItem, SearchEntityType } from '@taskflow/shared';
import { searchApi } from '../../lib/api';
import {
  createStandardCommands,
  filterCommands,
  ExecutableCommand,
  getPlatformCommandKey,
} from '../command/commandRegistry';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSelectTask: (projectId: string, taskId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectMilestone?: (projectId: string, milestoneId: string) => void;
  goToDashboard: () => void;
  goToProjects: () => void;
  goToMyWork: () => void;
  openNotifications: () => void;
  openSettings: (tab?: 'profile' | 'security' | 'workspace' | 'members' | 'notifications') => void;
  openCreateProject?: () => void;
  openCreateTask?: () => void;
}

type TabMode = 'all' | 'task' | 'project' | 'milestone' | 'command';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  onSelectTask,
  onSelectProject,
  onSelectMilestone,
  goToDashboard,
  goToProjects,
  goToMyWork,
  openNotifications,
  openSettings,
  openCreateProject,
  openCreateTask,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabMode>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [commands, setCommands] = useState<ExecutableCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize available commands
  const allCommands = useRef<ExecutableCommand[]>([]);
  useEffect(() => {
    allCommands.current = createStandardCommands({
      goToDashboard: () => {
        goToDashboard();
        onClose();
      },
      goToProjects: () => {
        goToProjects();
        onClose();
      },
      goToMyWork: () => {
        goToMyWork();
        onClose();
      },
      openNotifications: () => {
        openNotifications();
        onClose();
      },
      openSettings: tab => {
        openSettings(tab);
        onClose();
      },
      openCreateProject: openCreateProject
        ? () => {
            openCreateProject();
            onClose();
          }
        : undefined,
      openCreateTask: openCreateTask
        ? () => {
            openCreateTask();
            onClose();
          }
        : undefined,
    });
  }, [
    goToDashboard,
    goToProjects,
    goToMyWork,
    openNotifications,
    openSettings,
    openCreateProject,
    openCreateTask,
    onClose,
  ]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
      setError(null);
      setCommands(allCommands.current);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  // Debounced Search Execution
  useEffect(() => {
    if (!isOpen) return;

    // Filter local commands immediately
    const filteredCmds = filterCommands(query, allCommands.current);
    setCommands(filteredCmds);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (activeTab === 'command') {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const typeFilter: SearchEntityType | 'all' =
          activeTab === 'all' ? 'all' : (activeTab as SearchEntityType);
        const data = await searchApi.search(
          organizationId,
          {
            q: trimmed,
            type: typeFilter,
            limit: 25,
          },
          controller.signal
        );
        setResults(data.results);
        setSelectedIndex(0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to fetch search results');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeTab, organizationId, isOpen]);

  // Combined active list for keyboard navigation
  const combinedItems: Array<
    { kind: 'result'; item: SearchResultItem } | { kind: 'command'; item: ExecutableCommand }
  > = [];

  if (activeTab === 'command') {
    commands.forEach(cmd => combinedItems.push({ kind: 'command', item: cmd }));
  } else if (activeTab === 'all') {
    // Show top search results, then matching commands if query exists or commands on idle
    results.forEach(res => combinedItems.push({ kind: 'result', item: res }));
    if (query.trim().length === 0 || results.length === 0) {
      commands.slice(0, 8).forEach(cmd => combinedItems.push({ kind: 'command', item: cmd }));
    } else {
      commands.slice(0, 4).forEach(cmd => combinedItems.push({ kind: 'command', item: cmd }));
    }
  } else {
    results.forEach(res => combinedItems.push({ kind: 'result', item: res }));
  }

  // Handle Selection of Item
  const handleSelect = useCallback(
    (index: number) => {
      const target = combinedItems[index];
      if (!target) return;

      if (target.kind === 'command') {
        target.item.action();
      } else {
        const res = target.item;
        if (res.type === 'task' && res.metadata.projectId) {
          onSelectTask(res.metadata.projectId, res.id);
          onClose();
        } else if (res.type === 'project') {
          onSelectProject(res.id);
          onClose();
        } else if (res.type === 'milestone' && res.metadata.projectId) {
          if (onSelectMilestone) {
            onSelectMilestone(res.metadata.projectId, res.id);
          } else {
            onSelectProject(res.metadata.projectId);
          }
          onClose();
        } else if (res.type === 'user') {
          openSettings('members');
          onClose();
        } else if (res.type === 'label' && res.metadata.projectId) {
          onSelectProject(res.metadata.projectId);
          onClose();
        }
      }
    },
    [combinedItems, onSelectTask, onSelectProject, onSelectMilestone, openSettings, onClose]
  );

  // Keyboard navigation listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (combinedItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < combinedItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : combinedItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const activeEl = listEl.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const platformKey = getPlatformCommandKey();

  const getEntityIcon = (type: SearchEntityType) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-4 h-4 text-cyan-400" />;
      case 'project':
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'milestone':
        return <Flag className="w-4 h-4 text-emerald-400" />;
      case 'user':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'label':
        return <Tag className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl glass-panel rounded-2xl border border-taskflow-border shadow-2xl bg-taskflow-surface text-taskflow-text overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-taskflow-border/70 bg-taskflow-bg/50">
          <Search className="w-5 h-5 text-taskflow-muted mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, projects, milestones, or run commands..."
            className="w-full bg-transparent text-sm text-white placeholder-taskflow-muted focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mr-2" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-taskflow-muted hover:text-white transition-colors mr-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-taskflow-muted bg-taskflow-surface border border-taskflow-border hover:text-white transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-1 px-4 py-2 border-b border-taskflow-border/40 bg-taskflow-bg/30 text-xs overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'task', label: 'Tasks' },
              { id: 'project', label: 'Projects' },
              { id: 'milestone', label: 'Milestones' },
              { id: 'command', label: 'Commands' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-taskflow-surface text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-taskflow-muted hover:text-white hover:bg-taskflow-surface/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results / Commands List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-taskflow-border/30 max-h-[55vh]"
        >
          {error && (
            <div className="p-4 text-center text-xs text-rose-400 flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Idle Guidance when query is empty and no results */}
          {query.trim().length === 0 && combinedItems.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <Compass className="w-8 h-8 text-cyan-400/60 mx-auto" />
              <p className="text-xs font-semibold text-white">Quick Cross-Project Navigator</p>
              <p className="text-[11px] text-taskflow-muted max-w-sm mx-auto">
                Type at least 2 characters to search across projects, task issue keys (e.g.
                ALPHA-1), milestones, and team members.
              </p>
            </div>
          )}

          {/* Empty State when query returned nothing */}
          {query.trim().length >= 2 && !loading && combinedItems.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <Search className="w-8 h-8 text-taskflow-muted mx-auto" />
              <p className="text-xs font-semibold text-white">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <div className="text-[11px] text-taskflow-muted max-w-xs mx-auto space-y-1 pt-1 text-left">
                <p>Suggestions:</p>
                <p>• Verify the spelling of the search term</p>
                <p>• Search by exact issue key (e.g. ALPHA-1)</p>
                <p>• Switch tabs to view Commands or Projects</p>
              </div>
            </div>
          )}

          {/* Render List Items */}
          {combinedItems.map((entry, index) => {
            const isSelected = index === selectedIndex;

            if (entry.kind === 'command') {
              const cmd = entry.item;
              return (
                <div
                  key={cmd.id}
                  data-index={index}
                  onClick={() => handleSelect(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 border border-cyan-500/40 text-white shadow-glow-cyan'
                      : 'hover:bg-taskflow-surface/60 text-taskflow-text'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-semibold text-white truncate">{cmd.label}</p>
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.description && (
                        <p className="text-[11px] text-taskflow-muted truncate mt-0.5">
                          {cmd.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-taskflow-muted bg-taskflow-bg border border-taskflow-border">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            }

            const res = entry.item;
            return (
              <div
                key={`${res.type}-${res.id}`}
                data-index={index}
                onClick={() => handleSelect(index)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 border border-cyan-500/40 text-white shadow-glow-cyan'
                    : 'hover:bg-taskflow-surface/60 text-taskflow-text'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-taskflow-surface border border-taskflow-border flex-shrink-0">
                    {getEntityIcon(res.type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-semibold text-white truncate">{res.title}</p>
                      {res.metadata.issueKey && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                          {res.metadata.issueKey}
                        </span>
                      )}
                      {res.metadata.priority && (
                        <span className="text-[9px] uppercase font-mono px-1 rounded bg-taskflow-surface border border-taskflow-border text-taskflow-muted">
                          {res.metadata.priority}
                        </span>
                      )}
                    </div>

                    {res.subtitle && (
                      <p className="text-[11px] text-taskflow-muted truncate mt-0.5">
                        {res.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  {res.metadata.status && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-taskflow-bg border border-taskflow-border text-taskflow-muted">
                      {res.metadata.status}
                    </span>
                  )}
                  {isSelected ? (
                    <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-taskflow-muted/50" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="px-4 py-2.5 border-t border-taskflow-border/50 bg-taskflow-bg/70 flex items-center justify-between text-[11px] text-taskflow-muted">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-taskflow-surface border border-taskflow-border font-mono text-[10px] mr-1">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 rounded bg-taskflow-surface border border-taskflow-border font-mono text-[10px] mr-1">
                ↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-taskflow-surface border border-taskflow-border font-mono text-[10px] mr-1">
                ↵
              </kbd>
              Select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-taskflow-surface border border-taskflow-border font-mono text-[10px] mr-1">
                esc
              </kbd>
              Close
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1 font-mono text-[10px]">
            <span>TaskFlow Global Search</span>
            <span>•</span>
            <span>{platformKey}K</span>
          </div>
        </div>
      </div>
    </div>
  );
};
