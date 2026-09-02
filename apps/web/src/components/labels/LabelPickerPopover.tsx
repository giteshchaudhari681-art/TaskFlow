import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Plus, Tag, Loader2 } from 'lucide-react';
import { LabelItem } from '@taskflow/shared';
import { getLabelColors } from './LabelBadge';

interface LabelPickerPopoverProps {
  labels: LabelItem[];
  selectedLabelIds: string[];
  onToggleLabel: (labelId: string) => Promise<void> | void;
  onCreateLabel?: (name: string, color: string) => Promise<LabelItem | null>;
  canCreateLabel?: boolean;
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export const LabelPickerPopover: React.FC<LabelPickerPopoverProps> = ({
  labels,
  selectedLabelIds,
  onToggleLabel,
  onCreateLabel,
  canCreateLabel = false,
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = search.trim().toLowerCase();
  const filteredLabels = labels.filter(label => label.name.toLowerCase().includes(normalizedQuery));

  const exactMatchExists = labels.some(label => label.normalizedName === normalizedQuery);

  const handleCreate = async () => {
    if (!onCreateLabel || !search.trim() || isSubmitting) return;

    // Pick a safe color token based on length or seed
    const colorPalette = [
      'cyan',
      'indigo',
      'rose',
      'amber',
      'emerald',
      'violet',
      'teal',
      'blue',
      'orange',
      'pink',
    ];
    const chosenColor = colorPalette[search.trim().length % colorPalette.length];

    try {
      setIsSubmitting(true);
      const created = await onCreateLabel(search.trim(), chosenColor);
      if (created) {
        await onToggleLabel(created.id);
        setSearch('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 mt-1 w-64 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Search Header */}
      <div className="p-2 border-b border-zinc-800 flex items-center gap-2 bg-zinc-950/40">
        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter or create labels..."
          className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && !exactMatchExists && canCreateLabel && search.trim()) {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
      </div>

      {/* Labels List */}
      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
        {filteredLabels.length === 0 && !search.trim() && (
          <div className="py-4 text-center text-xs text-zinc-500 flex flex-col items-center gap-1">
            <Tag className="w-4 h-4 opacity-40" />
            <span>No labels created yet</span>
          </div>
        )}

        {filteredLabels.map(label => {
          const isSelected = selectedLabelIds.includes(label.id);
          const colors = getLabelColors(label.color);

          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onToggleLabel(label.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-zinc-800/80 transition-colors group text-left"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                <span className="truncate text-zinc-300 group-hover:text-zinc-100">
                  {label.name}
                </span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </button>
          );
        })}

        {/* Inline Create Option */}
        {search.trim() && !exactMatchExists && canCreateLabel && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors border border-dashed border-cyan-500/30 mt-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span className="truncate">
              Create label &quot;<span className="font-semibold">{search.trim()}</span>&quot;
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
