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
    className="flex items-center space-x-2 px-3 py-1.5 rounded bg-[#161920] hover:bg-[#1a1d26] border border-[#1e2230] text-xs text-slate-200 transition-colors cursor-pointer"
    title="Quick Project Switcher"
   >
    <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
    <span className="font-medium max-w-[130px] truncate">
     {selectedProject ? selectedProject.name : 'Projects'}
    </span>
    {selectedProject?.key && (
     <span className="hidden sm:inline px-1.5 py-px rounded text-[9px] font-mono font-bold bg-[#1a1d26] text-slate-400 border border-[#252b3a]">
      {selectedProject.key}
     </span>
    )}
    <ChevronDown
     className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
      isOpen ? 'rotate-180' : ''
     }`}
    />
   </button>

   {/* Dropdown Menu */}
   {isOpen && (
    <div className="absolute left-0 mt-2 w-72 rounded-lg border border-[#1e2230] shadow-elevation-3 bg-[#12141a] p-2 z-50">
     {/* Search Input */}
     <div className="relative mb-2">
      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
      <input
       ref={searchInputRef}
       type="text"
       value={search}
       onChange={e => setSearch(e.target.value)}
       placeholder="Find project..."
       className="w-full bg-[#0e1018] pl-8 pr-3 py-1.5 rounded text-xs text-slate-200 placeholder-slate-600 border border-[#242834] focus:border-[#e05638] focus:outline-none"
      />
     </div>

     {/* Project List */}
     <div className="max-h-56 overflow-y-auto space-y-0.5">
      {loading ? (
       <div className="p-4 text-center text-xs text-slate-500">
        <div className="w-4 h-4 border-2 border-[#e05638] border-t-transparent rounded-full animate-spin mx-auto mb-1" />
        <span>Loading projects...</span>
       </div>
      ) : filteredProjects.length === 0 ? (
       <div className="p-4 text-center text-xs text-slate-600">
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
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left text-xs transition-colors cursor-pointer ${
           isSelected
            ? 'bg-[#1e2230] text-[#e05638] font-semibold'
            : 'hover:bg-[#1a1d26] text-slate-300'
          }`}
         >
          <div className="min-w-0 pr-2">
           <div className="flex items-center space-x-1.5">
            <span
             className="w-1.5 h-1.5 rounded-full flex-shrink-0"
             style={{ backgroundColor: p.color || '#e05638' }}
            />
            <span className="truncate">{p.name}</span>
           </div>
           <p className="text-[10px] text-slate-600 font-mono mt-0.5 ml-3.5">
            Key: {p.key}
           </p>
          </div>

          {isSelected && <Check className="w-3.5 h-3.5 text-[#e05638] flex-shrink-0" />}
         </button>
        );
       })
      )}
     </div>

     {/* Footer Actions */}
     <div className="pt-2 mt-2 border-t border-[#1e2230] flex items-center justify-between text-[11px]">
      <button
       type="button"
       onClick={() => {
        onViewAllProjects();
        setIsOpen(false);
       }}
       className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer"
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
        className="text-slate-500 hover:text-slate-300 flex items-center space-x-1 cursor-pointer"
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
