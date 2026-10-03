import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  value?: string | number;
  onChange?: (e: any) => void;
  placement?: 'top' | 'bottom';
  maxHeight?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  placement = 'bottom',
  maxHeight = 'max-h-60',
  className,
  children,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: string; label: React.ReactNode }[] = [];
  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && child.type === 'option') {
      options.push({
        value: child.props.value?.toString() || '',
        label: child.props.children,
      });
    }
  });

  const selectedOption = options.find(opt => opt.value === value?.toString()) || options[0];

  return (
    <div ref={containerRef} className="relative inline-block min-w-0" style={{ width: 'auto' }}>
      <div
        className={`flex items-center justify-between cursor-pointer select-none appearance-none ${className || ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%' }}
      >
        <span className="truncate block flex-1">{selectedOption?.label}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-2 shrink-0" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 5 : -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 5 : -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-[999] left-0 min-w-[140px] w-max max-w-[280px] bg-[#161920] border border-[#222630] rounded-md shadow-xl overflow-hidden shadow-black/50 ${
              placement === 'top' ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
            }`}
          >
            <div className={`${maxHeight} overflow-y-auto py-1 custom-scrollbar`}>
              {options.map((opt, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors whitespace-nowrap ${
                    opt.value === value?.toString()
                      ? 'bg-[#e05638]/10 text-[#e05638] font-medium'
                      : 'text-slate-300 hover:bg-[#1c202a] hover:text-white'
                  }`}
                  onClick={() => {
                    onChange?.({ target: { value: opt.value } });
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <select value={value} onChange={onChange as any} className="hidden" {...props}>
        {children}
      </select>
    </div>
  );
};
