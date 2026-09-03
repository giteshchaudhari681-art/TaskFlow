import React, { useState, useEffect, useRef } from 'react';
import { Layers, ChevronDown, Check, Search, ExternalLink, Plus } from 'lucide-react';
import { ProjectListItem } from '@taskflow/shared';
import { projectApi } from '../../lib/api';

interface ProjectSwitcherProps {
  organizationId: string;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onViewAllProjects: () => void;
  onCreateProject?: () => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  organizationId,
  selectedProjectId,
  onSelectProject,
  onViewAllProjects,
  onCreateProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch projects when dropdown is opened
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    projectApi
      .listProjects(organizationId)
      .then(data => {
        setProjects(data);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      });
  }, [isOpen, organizationId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const filteredProjects = projects.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-taskflow-surface hover:bg-taskflow-surface/80 border border-taskflow-border hover:border-cyan-500/40 text-xs text-white transition-all cursor-pointer"
        title="Quick Project Switcher"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
        <span className="font-medium max-w-[130px] truncate">
          {selectedProject ? selectedProject.name : 'Projects'}
        </span>
        {selectedProject?.key && (
          <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
            {selectedProject.key}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-taskflow-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 glass-panel rounded-xl border border-taskflow-border shadow-2xl bg-taskflow-surface text-taskflow-text p-2 z-50 animate-fadeIn">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-taskflow-muted absolute left-2.5 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Find project..."
              className="w-full bg-taskflow-bg/80 pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-taskflow-muted border border-taskflow-border focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Project List */}
          <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-taskflow-border/30">
            {loading ? (
              <div className="p-4 text-center text-xs text-taskflow-muted">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                <span>Loading projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-taskflow-muted">
                No projects matched &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredProjects.map(p => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'hover:bg-taskflow-bg/60 text-white'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color || '#06b6d4' }}
                        />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <p className="text-[10px] text-taskflow-muted font-mono mt-0.5 ml-3.5">
                        Key: {p.key}
                      </p>
                    </div>

                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 mt-2 border-t border-taskflow-border/50 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                onViewAllProjects();
                setIsOpen(false);
              }}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>All Projects</span>
            </button>

            {onCreateProject && (
              <button
                type="button"
                onClick={() => {
                  onCreateProject();
                  setIsOpen(false);
                }}
                className="text-taskflow-muted hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
