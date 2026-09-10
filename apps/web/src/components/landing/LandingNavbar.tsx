import React, { useState, useEffect, useRef } from 'react';
import {
  Workflow,
  Menu,
  X,
  ChevronDown,
  Zap,
  GitBranch,
  Users,
  BarChart3,
  Shield,
  BrainCircuit,
  Layers,
  Building2,
  Rocket,
  HeartHandshake,
  ArrowRight,
  ExternalLink,
  Clock,
  Bell,
  CheckCircle2,
} from 'lucide-react';

interface LandingNavbarProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

type DropdownId = 'features' | 'solutions' | null;

const FEATURES_MENU = [
  {
    category: 'Core',
    items: [
      {
        icon: Layers,
        label: 'Task Management',
        desc: 'Boards, lists, and calendar views',
        section: 'product',
      },
      {
        icon: GitBranch,
        label: 'Dependency Graphs',
        desc: 'DAG blocking with critical-path detection',
        section: 'product',
      },
      {
        icon: Clock,
        label: 'Execution Engine',
        desc: 'Real-time progress tracking',
        section: 'product',
      },
    ],
  },
  {
    category: 'Intelligence',
    items: [
      {
        icon: BrainCircuit,
        label: 'AI Copilot',
        desc: 'Risk detection & task decomposition',
        section: 'features',
      },
      {
        icon: Bell,
        label: 'Smart Alerts',
        desc: 'Proactive deadline & blocker notifications',
        section: 'features',
      },
      {
        icon: BarChart3,
        label: 'Analytics',
        desc: 'Velocity, health, and trend reports',
        section: 'features',
      },
    ],
  },
  {
    category: 'Platform',
    items: [
      {
        icon: Shield,
        label: 'Enterprise Security',
        desc: 'SOC 2, GDPR, AES-256 encryption',
        section: 'platform',
      },
      {
        icon: Users,
        label: 'Team Workload',
        desc: 'Capacity balancing across sprints',
        section: 'platform',
      },
      {
        icon: CheckCircle2,
        label: 'Real-Time Sync',
        desc: 'WebSocket-powered live updates',
        section: 'platform',
      },
    ],
  },
];

const SOLUTIONS_MENU = [
  {
    icon: Rocket,
    label: 'Startups',
    desc: 'Move fast without breaking your sprint.',
    section: 'solutions',
    color: '#E85D22',
  },
  {
    icon: Building2,
    label: 'Enterprise',
    desc: 'Security and scale for 10,000+ teams.',
    section: 'platform',
    color: '#3B82F6',
  },
  {
    icon: HeartHandshake,
    label: 'Agencies',
    desc: 'Multi-client project management.',
    section: 'solutions',
    color: '#A855F7',
  },
  {
    icon: Zap,
    label: 'Engineering',
    desc: 'Dependency-aware delivery pipelines.',
    section: 'product',
    color: '#22C55E',
  },
];

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onSignIn, onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDropdown(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openLink = (url: string) => {
    setActiveDropdown(null);
    window.open(url, '_blank', 'noopener');
  };

  const handleMouseEnter = (id: DropdownId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 120);
  };

  const handleDropdownMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-[#0a0a0a]/85 backdrop-blur-xl border-[#222222]'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between gap-8">
        {/* Logo */}
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="TaskFlow Home"
        >
          <span className="w-7 h-7 rounded-[6px] bg-[#E85D22] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(232,93,34,0.3)] transition-transform group-hover:scale-105">
            <Workflow className="w-[15px] h-[15px]" />
          </span>
          <span className="font-display text-lg font-medium text-[#F3EDE4] tracking-tight">
            TaskFlow
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center justify-center gap-1 flex-1" ref={dropdownRef}>
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('features')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium rounded-[7px] transition-all duration-150 ${activeDropdown === 'features' ? 'text-[#F3EDE4] bg-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#141414]'}`}
            >
              Features{' '}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'features' ? 'rotate-180' : ''}`}
              />
            </button>

            {activeDropdown === 'features' && (
              <div
                onMouseEnter={handleDropdownMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
              >
                <div className="w-[640px] bg-[#0D0D0D] border border-[#222222] rounded-[18px] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden">
                  <div className="grid grid-cols-3 gap-0 p-5">
                    {FEATURES_MENU.map(group => (
                      <div key={group.category}>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#555555] mb-3 px-2">
                          {group.category}
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map(item => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => scrollToSection(item.section)}
                              className="w-full flex items-start gap-3 p-2.5 rounded-[10px] hover:bg-[#161616] transition-all group/item text-left"
                            >
                              <div className="w-7 h-7 rounded-[7px] bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center shrink-0 group-hover/item:border-[#E85D22]/40 group-hover/item:bg-[#E85D22]/10 transition-all">
                                <item.icon className="w-3.5 h-3.5 text-[#737373] group-hover/item:text-[#E85D22] transition-colors" />
                              </div>
                              <div>
                                <div className="text-[12px] font-semibold text-[#D4D4D4] group-hover/item:text-white leading-tight">
                                  {item.label}
                                </div>
                                <div className="text-[11px] text-[#555555] mt-0.5 leading-tight">
                                  {item.desc}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#1A1A1A] px-5 py-3 flex items-center justify-between bg-[#0A0A0A]">
                    <span className="text-[11px] text-[#555555]">Explore all capabilities</span>
                    <button
                      type="button"
                      onClick={() => scrollToSection('product')}
                      className="flex items-center gap-1.5 text-[12px] text-[#E85D22] font-semibold hover:text-[#F0703B] transition-colors"
                    >
                      See product tour <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solutions dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('solutions')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium rounded-[7px] transition-all duration-150 ${activeDropdown === 'solutions' ? 'text-[#F3EDE4] bg-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#141414]'}`}
            >
              Solutions{' '}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`}
              />
            </button>

            {activeDropdown === 'solutions' && (
              <div
                onMouseEnter={handleDropdownMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
              >
                <div className="w-[340px] bg-[#0D0D0D] border border-[#222222] rounded-[18px] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden">
                  <div className="p-3 space-y-1">
                    {SOLUTIONS_MENU.map(sol => (
                      <button
                        key={sol.label}
                        type="button"
                        onClick={() => scrollToSection(sol.section)}
                        className="w-full flex items-center gap-3.5 p-3.5 rounded-[11px] hover:bg-[#161616] transition-all group/sol text-left"
                      >
                        <div
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border"
                          style={{ background: `${sol.color}12`, borderColor: `${sol.color}25` }}
                        >
                          <sol.icon
                            className="w-4.5 h-4.5"
                            style={{ color: sol.color, width: 18, height: 18 }}
                          />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-[#D4D4D4] group-hover/sol:text-white leading-tight">
                            {sol.label}
                          </div>
                          <div className="text-[11px] text-[#555555] mt-0.5">{sol.desc}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#333333] group-hover/sol:text-[#E85D22] ml-auto shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simple links */}
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="px-3.5 py-2 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#141414] rounded-[7px] transition-all"
          >
            Pricing
          </button>

          <button
            type="button"
            onClick={() => openLink('https://docs.taskflow.dev')}
            className="flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#141414] rounded-[7px] transition-all"
          >
            Docs <ExternalLink className="w-3 h-3 opacity-50" />
          </button>

          <button
            type="button"
            onClick={() => openLink('https://github.com/giteshchaudhari681-art/TaskFlow/releases')}
            className="flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#141414] rounded-[7px] transition-all"
          >
            Changelog <ExternalLink className="w-3 h-3 opacity-50" />
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('contact')}
            className="px-3.5 py-2 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#141414] rounded-[7px] transition-all"
          >
            Contact
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onSignIn}
            className="hidden sm:inline-flex px-3 py-2 text-[13px] font-semibold text-[#A3A3A3] hover:text-[#F3EDE4] transition-colors"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex h-9 items-center justify-center px-4 rounded-[6px] bg-[#E85D22] text-white text-[13px] font-semibold tracking-wide hover:bg-[#F0703B] shadow-[0_2px_12px_rgba(232,93,34,0.25)] hover:shadow-[0_4px_16px_rgba(232,93,34,0.35)] hover:-translate-y-px transition-all duration-200"
          >
            Get started
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#8A8A8A] hover:text-[#F3EDE4] transition-colors rounded-[6px] hover:bg-[#161616]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[520px] border-t border-[#262626]' : 'max-h-0'} bg-[#0D0D0D]/98 backdrop-blur-xl`}
      >
        <div className="px-5 py-4 space-y-1">
          {/* Features group mobile */}
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#555555] px-3 pt-2 pb-1">
            Features
          </div>
          {FEATURES_MENU.flatMap(g => g.items).map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToSection(item.section)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#161616] rounded-[8px] transition-colors"
            >
              <item.icon className="w-4 h-4 text-[#555555]" />
              {item.label}
            </button>
          ))}

          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#555555] px-3 pt-4 pb-1">
            Solutions
          </div>
          {SOLUTIONS_MENU.map(sol => (
            <button
              key={sol.label}
              type="button"
              onClick={() => scrollToSection(sol.section)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#161616] rounded-[8px] transition-colors"
            >
              <sol.icon className="w-4 h-4 text-[#555555]" />
              {sol.label}
            </button>
          ))}

          <div className="border-t border-[#1E1E1E] mt-3 pt-3 space-y-1">
            {[
              { label: 'Pricing', action: () => scrollToSection('contact') },
              { label: 'Docs', action: () => openLink('https://docs.taskflow.dev') },
              {
                label: 'Changelog',
                action: () =>
                  openLink('https://github.com/giteshchaudhari681-art/TaskFlow/releases'),
              },
              { label: 'Contact', action: () => scrollToSection('contact') },
            ].map(({ label, action }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className="block w-full text-left px-3 py-2.5 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#161616] rounded-[8px] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pt-3 pb-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onSignIn();
              }}
              className="w-full py-2.5 text-[13px] font-medium text-[#F3EDE4] border border-[#262626] hover:bg-[#161616] rounded-[8px] transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
