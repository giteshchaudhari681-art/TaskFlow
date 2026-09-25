import React, { useState, useEffect, useRef } from 'react';
import {
  Workflow, Menu, X, ChevronDown, Building2, Rocket, ArrowRight,
  Code2, Box, ShieldCheck, History, BrainCircuit, Network, BookOpen, Compass, Terminal, FileClock, PlayCircle, Layers, Users, Newspaper, MessageSquare, Cpu, Handshake, Plug, Globe, Briefcase, Lightbulb, Send
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface LandingNavbarProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

type DropdownId = 'customers' | 'enterprise' | 'resources' | 'company' | 'partners' | 'solutions' | null;

const MENUS = {
  customers: {
    title: 'CUSTOMERS',
    desc: 'Built for teams that need a clearer picture of delivery.',
    cta: 'See how teams use TaskFlow →',
    items: [
      { icon: Code2, label: 'Engineering Teams', desc: 'Track dependencies, blockers, technical work and delivery risk.' },
      { icon: Box, label: 'Product Teams', desc: 'Connect projects, milestones and execution progress.' },
      { icon: Rocket, label: 'Startup Teams', desc: 'Keep a small team aligned without operational overhead.' },
      { icon: Building2, label: 'Growing Organizations', desc: 'Manage permissions, workspaces and delivery at scale.' },
    ]
  },
  enterprise: {
    title: 'ENTERPRISE',
    desc: 'Operational control for teams that cannot afford blind spots.',
    cta: 'Explore Enterprise →',
    items: [
      { icon: ShieldCheck, label: 'Enterprise Security', desc: 'Role-based access, tenant isolation and secure authentication.' },
      { icon: History, label: 'Governance & Audit', desc: 'Track important actions and security events.' },
      { icon: BrainCircuit, label: 'AI Governance', desc: 'Human-approved AI actions and deterministic safety boundaries.' },
      { icon: Network, label: 'Scale', desc: 'Architecture designed for larger organizations.' },
    ]
  },
  resources: {
    title: 'RESOURCES',
    desc: 'Learn, build, and explore with TaskFlow.',
    cta: 'Explore all resources →',
    items: [
      { icon: BookOpen, label: 'Documentation', desc: 'Learn how to configure and use TaskFlow.' },
      { icon: Compass, label: 'Guides', desc: 'Practical workflows for projects, tasks and dependencies.' },
      { icon: Terminal, label: 'API Reference', desc: 'Explore TaskFlow\'s API capabilities.' },
      { icon: FileClock, label: 'Changelog', desc: 'See what has changed across TaskFlow releases.' },
      { icon: PlayCircle, label: 'Getting Started', desc: 'Set up your workspace and create your first project.' },
      { icon: Layers, label: 'Architecture', desc: 'Understand how TaskFlow is engineered.' },
    ]
  },
  company: {
    title: 'COMPANY',
    desc: 'Who we are and what we are building.',
    cta: 'Read our manifesto →',
    items: [
      { icon: Workflow, label: 'About TaskFlow', desc: 'Why TaskFlow exists and what we\'re building.' },
      { icon: Users, label: 'Careers', desc: 'Join the team building modern project operations software.' },
      { icon: Newspaper, label: 'Blog', desc: 'Product, engineering and project-management insights.' },
      { icon: MessageSquare, label: 'Contact', desc: 'Talk to the TaskFlow team.', isContact: true },
    ]
  },
  partners: {
    title: 'PARTNERS',
    desc: 'Join the ecosystem surrounding TaskFlow.',
    cta: 'Become a Partner →',
    items: [
      { icon: Cpu, label: 'Technology Partners', desc: 'Build integrations around TaskFlow.' },
      { icon: Handshake, label: 'Implementation Partners', desc: 'Help organizations adopt TaskFlow.' },
      { icon: Plug, label: 'Integration Partners', desc: 'Connect TaskFlow with the tools your teams already use.' },
      { icon: Globe, label: 'Ecosystem', desc: 'Build alongside the TaskFlow platform.' },
    ]
  },
  solutions: {
    title: 'SOLUTIONS',
    desc: 'TaskFlow capabilities tailored to your workflow.',
    cta: 'View all solutions →',
    items: [
      { icon: Briefcase, label: 'Project Operations', desc: 'Manage projects, tasks and dependencies.' },
      { icon: BrainCircuit, label: 'AI Project Intelligence', desc: 'Understand risk and delivery health.' },
      { icon: Lightbulb, label: 'Task Intelligence', desc: 'Get contextual insights for individual tasks.' },
      { icon: Users, label: 'Team Workflows', desc: 'Coordinate execution across teams.' },
      { icon: Building2, label: 'Enterprise Operations', desc: 'Security, governance and organizational control.' },
    ]
  }
};

const NAV_ITEMS = [
  { id: 'customers', label: 'Customers' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'resources', label: 'Resources' },
  { id: 'company', label: 'Company' },
  { id: 'partners', label: 'Partners' },
  { id: 'solutions', label: 'Solutions' },
] as const;

const menuVariants: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.15, ease: "easeIn" } },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut", staggerChildren: 0.04 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onSignIn, onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setIsContactModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleMouseEnter = (id: DropdownId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleDropdownMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleNavAction = (item: any) => {
    if (item.isContact) {
      setIsContactModalOpen(true);
      setActiveDropdown(null);
      setMobileMenuOpen(false);
    } else {
      // In a real app, this would route to the respective page
      setActiveDropdown(null);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0D0D0D]/90 backdrop-blur-md border-b border-[#1E1E1E] shadow-[0_4px_24px_rgba(0,0,0,0.4)]' : 'bg-transparent'}`}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
          <span className="w-7 h-7 rounded-[6px] bg-[#E85D22] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(232,93,34,0.3)] transition-transform group-hover:scale-105">
            <Workflow className="w-[15px] h-[15px]" />
          </span>
          <span className="font-display text-lg font-medium text-[#F3EDE4] tracking-tight">
            TaskFlow
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center justify-center gap-1 flex-1 relative" ref={dropdownRef}>
          {NAV_ITEMS.map((nav) => (
            <div
              key={nav.id}
              className="relative"
              onMouseEnter={() => handleMouseEnter(nav.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => handleMouseEnter(nav.id)}
                className={`flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium rounded-[7px] transition-all duration-150 ${
                  activeDropdown === nav.id
                    ? 'text-[#F3EDE4] bg-[#1A1A1A] border-transparent shadow-none'
                    : 'text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[rgba(232,93,34,0.06)] hover:border-[#E85D22]/10 border border-transparent'
                }`}
              >
                {nav.label}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === nav.id ? 'rotate-180 text-[#E85D22]' : 'opacity-50'}`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === nav.id && (
                  <motion.div
                    variants={menuVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onMouseEnter={handleDropdownMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="absolute top-[105%] left-1/2 -translate-x-1/2 pt-2 z-50 w-max"
                  >
                    <div className="w-[640px] bg-[rgba(15,15,15,0.96)] backdrop-blur-xl border border-white/5 rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden">
                      <div className="p-6">
                        <motion.div variants={itemVariants} className="mb-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E85D22] mb-1.5">{MENUS[nav.id].title}</h4>
                          <p className="text-[13px] text-[#A3A3A3]">{MENUS[nav.id].desc}</p>
                        </motion.div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {MENUS[nav.id].items.map((item) => (
                            <motion.div variants={itemVariants} key={item.label}>
                              <button
                                type="button"
                                onClick={() => handleNavAction(item)}
                                className="w-full flex items-start gap-3.5 p-3 rounded-[12px] transition-all duration-200 group/item hover:bg-[rgba(232,93,34,0.06)] hover:border-[#E85D22]/20 hover:-translate-y-[2px] border border-transparent text-left hover:shadow-[0_4px_12px_rgba(232,93,34,0.08)]"
                              >
                                <div className="w-8 h-8 rounded-[8px] bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center shrink-0 group-hover/item:border-[#E85D22]/40 group-hover/item:bg-[#E85D22]/10 transition-all">
                                  <item.icon className="w-4 h-4 text-[#737373] group-hover/item:text-[#E85D22] transition-colors group-hover/item:-translate-y-[1px]" />
                                </div>
                                <div>
                                  <div className="text-[13px] font-semibold text-[#D4D4D4] group-hover/item:text-white transition-colors leading-tight mb-1">
                                    {item.label}
                                  </div>
                                  <div className="text-[11.5px] text-[#737373] leading-snug group-hover/item:text-[#A3A3A3] transition-colors">
                                    {item.desc}
                                  </div>
                                </div>
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            type="button"
            onClick={onSignIn}
            className="text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] transition-colors"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="h-[36px] px-4 inline-flex items-center justify-center text-[13px] font-medium text-white bg-[#E85D22] hover:bg-[#F0703B] rounded-[8px] transition-all shadow-[0_2px_10px_rgba(232,93,34,0.3)] hover:shadow-[0_4px_16px_rgba(232,93,34,0.4)]"
          >
            Get started
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-[#A3A3A3] hover:text-[#F3EDE4] transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[85vh] overflow-y-auto border-t border-[#262626]' : 'max-h-0'} bg-[#0D0D0D]/98 backdrop-blur-xl`}
      >
        <div className="px-5 py-4 space-y-4">
          {NAV_ITEMS.map((nav) => (
            <div key={nav.id}>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#555555] px-3 pb-1.5">
                {MENUS[nav.id].title}
              </div>
              <div className="space-y-1">
                {MENUS[nav.id].items.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNavAction(item)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#161616] rounded-[8px] transition-colors group"
                  >
                    <item.icon className="w-4 h-4 text-[#555555] group-hover:text-[#E85D22]" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 pb-2 border-t border-[#1E1E1E]">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onSignIn();
              }}
              className="w-full py-2.5 mb-3 text-[13px] font-medium text-[#F3EDE4] border border-[#262626] hover:bg-[#161616] rounded-[8px] transition-colors"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStarted();
              }}
              className="w-full py-2.5 text-[13px] font-medium text-white bg-[#E85D22] hover:bg-[#F0703B] rounded-[8px] transition-all shadow-[0_2px_10px_rgba(232,93,34,0.3)]"
            >
              Get started
            </button>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsContactModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-[#0D0D0D] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden p-8"
            >
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-2 text-[#555555] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] mx-auto flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-[#E85D22]" />
                </div>
                <h3 className="text-2xl font-display font-medium text-[#F3EDE4]">Contact TaskFlow</h3>
                <p className="text-[#A3A3A3] text-sm mt-1">Get in touch with our team.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#F3EDE4] placeholder-[#555555] focus:outline-none focus:border-[#E85D22] focus:ring-1 focus:ring-[#E85D22] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#F3EDE4] placeholder-[#555555] focus:outline-none focus:border-[#E85D22] focus:ring-1 focus:ring-[#E85D22] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#F3EDE4] placeholder-[#555555] focus:outline-none focus:border-[#E85D22] focus:ring-1 focus:ring-[#E85D22] transition-all resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-[#E85D22] hover:bg-[#F0703B] text-white py-3 rounded-xl font-semibold text-[13px] transition-all shadow-[0_4px_14px_rgba(232,93,34,0.3)]"
                >
                  Send Message <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
