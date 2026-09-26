import React, { useState, useEffect, useRef } from 'react';
import {
  Workflow,
  Github,
  X,
  ChevronRight,
  CheckCircle2,
  Activity,
  ExternalLink,
  Book,
  Users,
  Building2,
  Layers,
  Blocks,
  FileText,
  Zap,
  ShieldCheck,
  LayoutDashboard,
  CheckSquare,
  AlertCircle,
  Database,
  Terminal,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --------------------------------------------------------
// UI Wrappers
// --------------------------------------------------------

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category?: string;
  size?: 'default' | 'large';
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  category,
  size = 'default',
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      // simple focus trap could go here; just focus first element
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previouslyFocusedElement.current?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const maxWidthClass = size === 'large' ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidthClass} bg-[#0A0A0A] border border-[#2e2924] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9),_0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden outline-none flex flex-col max-h-[90vh]`}
          >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#E85D22]/50 to-transparent opacity-50" />

            <div className="flex items-center justify-between px-8 py-6 border-b border-[#2e2924] bg-[#0A0A0A] sticky top-0 z-10">
              <div>
                {category && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E85D22] block mb-1">
                    {category}
                  </span>
                )}
                <h3
                  id="modal-title"
                  className="font-display font-medium text-2xl text-[#F3EDE4] tracking-tight"
                >
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#8A8A8A] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] rounded-lg transition-colors outline-none focus:ring-2 focus:ring-[#E85D22]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto bg-gradient-to-b from-[#0A0A0A] to-[#050505]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Drawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category?: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, category, children }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            ref={drawerRef}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md h-full bg-[#0A0A0A] border-l border-[#2e2924] shadow-2xl flex flex-col outline-none"
          >
            {/* Ambient Left Glow */}
            <div className="absolute left-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-[#E85D22]/30 to-transparent opacity-50" />

            <div className="flex items-center justify-between px-6 py-6 border-b border-[#2e2924] bg-[#0A0A0A]">
              <div>
                {category && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E85D22] block mb-1">
                    {category}
                  </span>
                )}
                <h3 className="font-display font-medium text-xl text-[#F3EDE4] tracking-tight">
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#8A8A8A] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] rounded-lg transition-colors outline-none focus:ring-2 focus:ring-[#E85D22]"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-br from-[#0A0A0A] to-[#050505]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --------------------------------------------------------
// Main Footer
// --------------------------------------------------------

type ModalType =
  | 'features'
  | 'pricing'
  | 'integrations'
  | 'changelog'
  | 'api'
  | 'status'
  | 'about'
  | 'careers'
  | 'blog'
  | 'contact'
  | 'privacy'
  | 'terms'
  | null;
type DrawerType = 'docs' | 'guides' | null;

export const LandingFooter: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  // Contact Form State
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  // Accordion State for Drawers
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);

  // Article Modal State
  const [activeArticle, setActiveArticle] = useState<{
    title: string;
    category: string;
    content: React.ReactNode;
  } | null>(null);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('sending');
    // Simulate attempt, then fail because there is no backend endpoint configured currently for contact
    setTimeout(() => {
      setContactStatus('error');
    }, 800);
  };

  const footerLinks = {
    Product: [
      { label: 'Features', action: () => setActiveModal('features') },
      { label: 'Pricing', action: () => setActiveModal('pricing') },
      { label: 'Integrations', action: () => setActiveModal('integrations') },
      { label: 'Changelog', action: () => setActiveModal('changelog') },
    ],
    Resources: [
      { label: 'Documentation', action: () => setActiveDrawer('docs') },
      { label: 'Guides', action: () => setActiveDrawer('guides') },
      { label: 'API Reference', action: () => setActiveModal('api') },
      { label: 'System Status', action: () => setActiveModal('status') },
    ],
    Company: [
      { label: 'About', action: () => setActiveModal('about') },
      { label: 'Careers', action: () => setActiveModal('careers') },
      { label: 'Blog', action: () => setActiveModal('blog') },
      { label: 'Contact', action: () => setActiveModal('contact') },
    ],
  };

  return (
    <>
      <footer className="border-t border-[#262626] bg-[#0A0A0A] relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-12 md:gap-8 mb-16">
            {/* Brand Section */}
            <div className="sm:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E85D22] flex items-center justify-center shadow-[0_4px_16px_rgba(232,93,34,0.3)] border border-[#F0703B]/20">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold text-xl text-[#F3EDE4] tracking-tight">
                  TaskFlow
                </span>
              </div>
              <p className="text-[15px] text-[#A3A3A3] leading-relaxed max-w-[320px]">
                AI-powered project operations platform for engineering and product teams that ship
                fast.
              </p>

              {/* Socials */}
              <div className="flex items-center gap-4 pt-2">
                <a
                  href="https://github.com/giteshchaudhari681-art/TaskFlow"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="group relative w-11 h-11 rounded-xl bg-[#141210] border border-[#2e2924] flex items-center justify-center text-[#8A8A8A] hover:border-[#4a4a4a] hover:text-[#F3EDE4] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,255,255,0.05)] transition-all duration-300"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Github className="w-5 h-5 relative z-10 transition-colors duration-300 group-hover:brightness-110" />
                </a>
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="space-y-6">
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#E85D22]">
                  {category}
                </h4>
                <ul className="space-y-4">
                  {links.map(({ label, action }) => (
                    <li key={label}>
                      <button
                        onClick={action}
                        className="group inline-block text-[15px] text-[#8A8A8A] hover:text-[#F3EDE4] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#E85D22] rounded-sm"
                      >
                        <span className="relative inline-block hover:translate-x-1 transition-transform duration-200">
                          {label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-[14px] text-[#737373]">
              <span>© {new Date().getFullYear()} TaskFlow. All rights reserved.</span>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-[#333333]" />
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-[#F3EDE4] transition-colors outline-none focus-visible:underline"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-[#F3EDE4] transition-colors outline-none focus-visible:underline"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('status')}
              className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#141210] border border-[#2e2924] hover:border-[#3d8b6e]/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#E85D22]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
              </span>
              <span className="text-[13px] font-medium text-[#A3A3A3] group-hover:text-[#F3EDE4] transition-colors">
                All systems operational
              </span>
            </button>
          </div>
        </div>
      </footer>

      {/* -------------------------------------------------------- */}
      {/* MODALS */}
      {/* -------------------------------------------------------- */}

      {/* FEATURES MODAL */}
      <Modal
        isOpen={activeModal === 'features'}
        onClose={() => setActiveModal(null)}
        title="Features"
        category="PRODUCT"
        size="large"
      >
        <div className="space-y-8">
          <p className="text-[16px] text-[#A3A3A3] leading-relaxed max-w-2xl">
            TaskFlow combines traditional project management with agentic AI intelligence to help
            your team ship faster with fewer risks.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Activity,
                name: 'AI Project Intelligence',
                desc: 'Automatically identifies delivery risks and predicts bottlenecks before they affect timelines.',
              },
              {
                icon: Zap,
                name: 'AI Task Intelligence',
                desc: 'Analyzes individual tasks for scope creep, missing requirements, and blockers.',
              },
              {
                icon: Layers,
                name: 'AI Task Decomposition',
                desc: 'Breaks down complex epics into manageable subtasks instantly.',
              },
              {
                icon: CheckCircle2,
                name: 'Human-Approved Actions',
                desc: 'AI suggests actions, but humans always remain in control of execution.',
              },
              {
                icon: Blocks,
                name: 'Dependency DAG',
                desc: 'Advanced directed acyclic graph engine for tracking complex cross-task dependencies.',
              },
              {
                icon: LayoutDashboard,
                name: 'Kanban & Boards',
                desc: 'Flexible views for managing sprint workflows and continuous delivery.',
              },
              {
                icon: CheckSquare,
                name: 'Task Management',
                desc: 'Deep task hierarchies, rich text, subtasks, and assignment tracking.',
              },
              {
                icon: ShieldCheck,
                name: 'Security & Audit',
                desc: 'Comprehensive audit logs and role-based access control (RBAC).',
              },
              {
                icon: Building2,
                name: 'Workspace Management',
                desc: 'Isolate data across multiple organizations and teams securely.',
              },
            ].map(feature => (
              <div
                key={feature.name}
                className="flex flex-col gap-3 p-5 rounded-xl bg-[#141210] border border-[#2e2924] hover:border-[#E85D22]/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#333333] flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-[#E85D22]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-[#F3EDE4] mb-1">{feature.name}</h4>
                  <p className="text-[13px] text-[#8A8A8A] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* PRICING MODAL */}
      <Modal
        isOpen={activeModal === 'pricing'}
        onClose={() => setActiveModal(null)}
        title="Pricing"
        category="PRODUCT"
        size="large"
      >
        <div className="space-y-8">
          <p className="text-[16px] text-[#A3A3A3] leading-relaxed">
            Plans and usage controls are currently managed through TaskFlow's subscription-ready
            internal architecture.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: 'Free',
                target: 'Individuals & small teams',
                features: [
                  'Up to 3 projects',
                  'Up to 5 members',
                  '2 GB storage',
                  'Basic task management',
                ],
              },
              {
                name: 'Pro',
                price: '$18',
                target: 'Growing teams',
                popular: true,
                features: [
                  'Unlimited projects & members',
                  'AI Copilot & risk detection',
                  'Dependency graphs + DAG',
                  'Advanced analytics',
                ],
              },
              {
                name: 'Business',
                price: 'Custom',
                target: 'Large organizations',
                features: [
                  'SSO / SAML',
                  'SOC 2 Type II & GDPR',
                  'Role-based access (RBAC)',
                  'Custom SLA',
                ],
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`relative flex flex-col p-6 rounded-2xl border ${plan.popular ? 'bg-gradient-to-b from-[#1c1410] to-[#141210] border-[#E85D22]/40 shadow-[0_8px_32px_rgba(232,93,34,0.15)]' : 'bg-[#141210] border-[#2e2924]'}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                    <span className="bg-[#E85D22] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h4 className="text-xl font-bold text-[#F3EDE4] mb-1">{plan.name}</h4>
                <p className="text-sm text-[#8A8A8A] mb-4">{plan.target}</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-display font-semibold text-[#F3EDE4]">
                    {plan.price}
                  </span>
                  {plan.price !== 'Free' && plan.price !== 'Custom' && (
                    <span className="text-sm text-[#8A8A8A]">/ mo</span>
                  )}
                </div>
                <div className="space-y-3 mt-auto pt-6 border-t border-[#2e2924]">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#A3A3A3]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* INTEGRATIONS MODAL */}
      <Modal
        isOpen={activeModal === 'integrations'}
        onClose={() => setActiveModal(null)}
        title="Integrations"
        category="PRODUCT"
      >
        <div className="space-y-8">
          <p className="text-[16px] text-[#A3A3A3] leading-relaxed">
            TaskFlow connects with the tools your team already uses to streamline project
            operations.
          </p>
          <div className="space-y-6">
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#F3EDE4] mb-4">
                Available Now
              </h4>
              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-5 rounded-xl bg-[#141210] border border-[#2e2924]">
                  <div className="w-12 h-12 rounded-xl bg-[#24292F] flex items-center justify-center border border-[#30363D]">
                    <Github className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-[#F3EDE4]">GitHub</h4>
                    <p className="text-[14px] text-[#8A8A8A] mt-0.5">
                      Link commits and pull requests directly to tasks for seamless traceability.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 rounded-xl bg-[#141210] border border-[#2e2924]">
                  <div className="w-12 h-12 rounded-xl bg-[#10A37F]/10 flex items-center justify-center border border-[#10A37F]/20">
                    <Activity className="w-6 h-6 text-[#10A37F]" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-[#F3EDE4]">OpenAI / Gemini</h4>
                    <p className="text-[14px] text-[#8A8A8A] mt-0.5">
                      Core AI intelligence engine for project risks, task decomposition, and
                      delivery analysis.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 rounded-xl bg-[#141210] border border-[#2e2924]">
                  <div className="w-12 h-12 rounded-xl bg-[#3448C5]/10 flex items-center justify-center border border-[#3448C5]/20">
                    <Blocks className="w-6 h-6 text-[#3448C5]" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-[#F3EDE4]">Cloudinary</h4>
                    <p className="text-[14px] text-[#8A8A8A] mt-0.5">
                      High-performance asset and avatar management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* CHANGELOG MODAL */}
      <Modal
        isOpen={activeModal === 'changelog'}
        onClose={() => setActiveModal(null)}
        title="Changelog"
        category="PRODUCT"
      >
        <div className="space-y-10 py-2">
          <div className="relative pl-8 border-l border-[#2e2924]">
            <div className="absolute w-4 h-4 rounded-full bg-[#E85D22] -left-[8.5px] top-1 shadow-[0_0_12px_rgba(232,93,34,0.6)] border-4 border-[#0A0A0A]" />
            <h4 className="text-xl font-semibold text-[#F3EDE4] mb-1">
              v2.0.0 — Agentic Intelligence
            </h4>
            <span className="text-[12px] text-[#E85D22] font-medium tracking-wide border border-[#E85D22]/20 bg-[#E85D22]/10 px-2 py-0.5 rounded">
              LATEST RELEASE
            </span>
            <div className="mt-5 space-y-4 text-[15px] text-[#A3A3A3]">
              <p>
                TaskFlow v2 brings our proprietary Agentic AI layer to project operations, allowing
                teams to foresee blockers before they happen.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />{' '}
                  <strong>AI Copilot:</strong> Automated project tracking and risk analysis.
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />{' '}
                  <strong>Dependency DAG:</strong> A new directed acyclic graph engine.
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />{' '}
                  <strong>PostgreSQL Optimization:</strong> Indexing improvements resulting in 40%
                  faster queries.
                </li>
              </ul>
            </div>
          </div>

          <div className="relative pl-8 border-l border-[#2e2924]">
            <div className="absolute w-4 h-4 rounded-full bg-[#2e2924] -left-[8.5px] top-1 border-4 border-[#0A0A0A]" />
            <h4 className="text-lg font-semibold text-[#A3A3A3] mb-1">
              v1.5.0 — Workspaces & Security
            </h4>
            <span className="text-[12px] text-[#737373] font-medium">PREVIOUS RELEASE</span>
            <div className="mt-5 space-y-4 text-[14px] text-[#737373]">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#555555] shrink-0 mt-1.5" /> Introduced
                  comprehensive Role-Based Access Control (RBAC).
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#555555] shrink-0 mt-1.5" /> Global
                  search implementation with keyboard shortcuts.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#555555] shrink-0 mt-1.5" /> Security
                  hardening and comprehensive audit logging.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>

      {/* API REFERENCE MODAL */}
      <Modal
        isOpen={activeModal === 'api'}
        onClose={() => setActiveModal(null)}
        title="API Reference"
        category="RESOURCES"
      >
        <div className="space-y-8 text-center flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#2e2924] flex items-center justify-center mb-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <Terminal className="w-8 h-8 text-[#E85D22]" />
          </div>
          <h4 className="text-2xl font-display font-medium text-[#F3EDE4]">TaskFlow OpenAPI 3.1</h4>
          <p className="text-[16px] text-[#A3A3A3] max-w-md mx-auto leading-relaxed">
            Access our comprehensive REST API documentation to programmatically manage projects,
            tasks, organizations, and AI insights.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
            {[
              'Authentication',
              'Projects',
              'Tasks',
              'Organizations',
              'AI Services',
              'Audit Logs',
              'Health',
            ].map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-md bg-[#141210] border border-[#2e2924] text-[13px] text-[#8A8A8A]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="pt-6 w-full">
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#E85D22] text-white font-semibold shadow-[0_4px_16px_rgba(232,93,34,0.3)] hover:bg-[#F0703B] hover:shadow-[0_6px_24px_rgba(232,93,34,0.4)] transition-all hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] focus-visible:ring-[#E85D22]"
            >
              Open API Documentation
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </Modal>

      {/* SYSTEM STATUS MODAL */}
      <Modal
        isOpen={activeModal === 'status'}
        onClose={() => setActiveModal(null)}
        title="System Status"
        category="RESOURCES"
      >
        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#22C55E]/10 to-transparent border border-[#22C55E]/20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-[#22C55E]" />
            </div>
            <h4 className="text-xl font-medium text-[#F3EDE4]">All Systems Operational</h4>
            <p className="text-sm text-[#8A8A8A] mt-2">Services are running smoothly.</p>
          </div>
          <div className="space-y-3">
            {[
              {
                name: 'TaskFlow API',
                icon: Activity,
                status: 'Operational',
                color: 'bg-[#22C55E]',
              },
              { name: 'Database', icon: Database, status: 'Operational', color: 'bg-[#22C55E]' },
              { name: 'AI Service', icon: Zap, status: 'Operational', color: 'bg-[#22C55E]' },
              {
                name: 'Background Jobs',
                icon: Workflow,
                status: 'Operational',
                color: 'bg-[#22C55E]',
              },
            ].map(s => (
              <div
                key={s.name}
                className="flex items-center justify-between p-4 rounded-xl bg-[#141210] border border-[#2e2924]"
              >
                <div className="flex items-center gap-3">
                  <s.icon className="w-5 h-5 text-[#737373]" />
                  <span className="text-[15px] text-[#F3EDE4] font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[#A3A3A3]">{s.status}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${s.color} shadow-[0_0_8px_rgba(34,197,94,0.5)]`}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#555555]">
            Status reflects local/development environment telemetry.
          </p>
        </div>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
        title="About TaskFlow"
        category="COMPANY"
      >
        <div className="space-y-6 text-[#A3A3A3] text-[16px] leading-relaxed">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E85D22] to-[#B84010] flex items-center justify-center mb-8 shadow-[0_8px_24px_rgba(232,93,34,0.3)]">
            <Workflow className="w-8 h-8 text-white" />
          </div>
          <p>
            <strong className="text-[#F3EDE4] font-medium">TaskFlow</strong> is an AI-powered
            project operations platform built for engineering and product teams that need to ship
            fast without losing clarity.
          </p>
          <p>
            We combine standard task management with an intelligent Dependency Engine and an AI
            Copilot that automatically identifies delivery risks, predicts bottlenecks, and surfaces
            them before they affect your timeline.
          </p>
          <div className="p-5 my-8 rounded-xl bg-[#141210] border border-[#2e2924] border-l-2 border-l-[#E85D22]">
            <h4 className="text-[14px] font-bold text-[#F3EDE4] uppercase tracking-wider mb-2">
              Our Core Philosophy
            </h4>
            <p className="text-[#8A8A8A] text-[15px]">
              <strong className="text-[#A3A3A3]">Human-approved AI actions.</strong> TaskFlow gives
              you the full context and recommendations, but you remain in control of the actual
              execution.
            </p>
          </div>
          <p>
            Designed with security-first architecture, TaskFlow provides comprehensive auditability
            and granular role-based access controls to meet the demands of modern organizations.
          </p>
        </div>
      </Modal>

      {/* CAREERS MODAL */}
      <Modal
        isOpen={activeModal === 'careers'}
        onClose={() => setActiveModal(null)}
        title="Careers"
        category="COMPANY"
      >
        <div className="py-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#141210] border border-[#2e2924] flex items-center justify-center mb-8 shadow-inner">
            <Users className="w-8 h-8 text-[#555555]" />
          </div>
          <h4 className="text-2xl font-display font-medium text-[#F3EDE4] mb-3">
            TaskFlow is growing.
          </h4>
          <p className="text-[16px] text-[#8A8A8A] max-w-sm mx-auto leading-relaxed">
            Open positions will appear here when available. We're currently growing our engineering
            team steadily.
          </p>
        </div>
      </Modal>

      {/* BLOG MODAL */}
      <Modal
        isOpen={activeModal === 'blog'}
        onClose={() => setActiveModal(null)}
        title="TaskFlow Journal"
        category="COMPANY"
      >
        <div className="py-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#141210] border border-[#2e2924] flex items-center justify-center mb-8 shadow-inner">
            <FileText className="w-8 h-8 text-[#555555]" />
          </div>
          <h4 className="text-2xl font-display font-medium text-[#F3EDE4] mb-3">Coming soon</h4>
          <p className="text-[16px] text-[#8A8A8A] max-w-sm mx-auto leading-relaxed">
            Product updates, engineering notes, and insights will appear here shortly.
          </p>
        </div>
      </Modal>

      {/* CONTACT MODAL */}
      <Modal
        isOpen={activeModal === 'contact'}
        onClose={() => setActiveModal(null)}
        title="Contact Us"
        category="COMPANY"
      >
        <div className="space-y-6">
          <p className="text-[15px] text-[#A3A3A3] mb-6">
            Get in touch for general inquiries, product questions, or partnerships.
          </p>

          <form onSubmit={handleContactSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#F3EDE4]">Name</label>
                <input
                  type="text"
                  required
                  disabled={contactStatus !== 'idle'}
                  className="w-full bg-[#141210] border border-[#2e2924] rounded-lg px-4 py-2.5 text-[#F3EDE4] text-sm focus:outline-none focus:border-[#E85D22] transition-colors disabled:opacity-50"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#F3EDE4]">Email</label>
                <input
                  type="email"
                  required
                  disabled={contactStatus !== 'idle'}
                  className="w-full bg-[#141210] border border-[#2e2924] rounded-lg px-4 py-2.5 text-[#F3EDE4] text-sm focus:outline-none focus:border-[#E85D22] transition-colors disabled:opacity-50"
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#F3EDE4]">Subject</label>
              <select
                disabled={contactStatus !== 'idle'}
                className="w-full bg-[#141210] border border-[#2e2924] rounded-lg px-4 py-2.5 text-[#F3EDE4] text-sm focus:outline-none focus:border-[#E85D22] transition-colors disabled:opacity-50 appearance-none"
              >
                <option>General inquiry</option>
                <option>Product question</option>
                <option>Partnership</option>
                <option>Technical support</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#F3EDE4]">Message</label>
              <textarea
                required
                disabled={contactStatus !== 'idle'}
                rows={4}
                className="w-full bg-[#141210] border border-[#2e2924] rounded-lg px-4 py-3 text-[#F3EDE4] text-sm focus:outline-none focus:border-[#E85D22] transition-colors resize-none disabled:opacity-50"
                placeholder="How can we help you?"
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={contactStatus !== 'idle'}
                className="w-full flex items-center justify-center gap-2 bg-[#E85D22] hover:bg-[#F0703B] text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(232,93,34,0.3)] transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] focus-visible:ring-[#E85D22]"
              >
                {contactStatus === 'sending' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{' '}
                    Sending...
                  </span>
                ) : contactStatus === 'error' ? (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Message submission unavailable
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" /> Send message
                  </span>
                )}
              </button>

              {contactStatus === 'error' && (
                <p className="text-center text-xs text-[#E85D22] mt-4">
                  Note: The contact form endpoint is not currently configured in this environment.
                </p>
              )}
            </div>
          </form>
        </div>
      </Modal>

      {/* LEGAL MODALS */}
      <Modal
        isOpen={activeModal === 'privacy'}
        onClose={() => setActiveModal(null)}
        title="Privacy Policy"
        size="large"
      >
        <div className="text-[15px] text-[#A3A3A3] space-y-8 max-w-3xl leading-relaxed">
          <p className="text-sm font-mono text-[#737373]">Last Updated: Draft Document</p>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">1. Overview</h4>
            <p>
              This Privacy Policy describes how TaskFlow ("we", "us", or "our") collects, uses, and
              shares your information when you use our project operations platform. As this is
              currently a product draft, these policies represent our intended privacy framework.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">2. Information We Collect</h4>
            <p>
              We collect information you provide directly to us, including authentication details,
              workspace configuration, and project data entered into the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">3. AI Processing</h4>
            <p>
              TaskFlow utilizes artificial intelligence to analyze project health and dependencies.
              Your task data may be processed by these systems to generate insights. Human approval
              remains required for execution of AI recommendations.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">4. Data Security</h4>
            <p>
              We implement appropriate technical and organizational measures designed to protect
              your data. However, no security system is impenetrable, and we cannot guarantee the
              absolute security of our systems.
            </p>
          </section>

          <hr className="border-[#2e2924]" />
          <p className="text-sm text-[#737373]">
            This document serves as a placeholder for a complete legal policy.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'terms'}
        onClose={() => setActiveModal(null)}
        title="Terms of Service"
        size="large"
      >
        <div className="text-[15px] text-[#A3A3A3] space-y-8 max-w-3xl leading-relaxed">
          <p className="text-sm font-mono text-[#737373]">Last Updated: Draft Document</p>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">1. Acceptance of Terms</h4>
            <p>
              By accessing or using TaskFlow, you agree to be bound by these Terms. If you disagree
              with any part of the terms, you may not access the service.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">
              2. Workspace Usage & Acceptable Use
            </h4>
            <p>
              You are responsible for all activities that occur under your workspace. You agree not
              to use the service for any unlawful purpose or in any way that interrupts or damages
              the service.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">
              3. Human Responsibility for AI Actions
            </h4>
            <p>
              TaskFlow provides AI-generated suggestions and insights. You acknowledge that AI
              systems may produce inaccurate recommendations. You bear sole responsibility for any
              actions taken based on AI suggestions within the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-lg font-semibold text-[#F3EDE4]">4. Limitation of Liability</h4>
            <p>
              In no event shall TaskFlow be liable for any indirect, incidental, special,
              consequential or punitive damages, including without limitation, loss of profits,
              data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <hr className="border-[#2e2924]" />
          <p className="text-sm text-[#737373]">
            This document serves as a placeholder for complete terms of service.
          </p>
        </div>
      </Modal>

      {/* ARTICLE MODAL */}
      <Modal
        isOpen={activeArticle !== null}
        onClose={() => setActiveArticle(null)}
        title={activeArticle?.title || ''}
        category={activeArticle?.category || 'ARTICLE'}
        size="large"
      >
        <div className="text-[15px] text-[#A3A3A3] space-y-8 max-w-3xl leading-relaxed">
          {activeArticle?.content}

          <div className="mt-8 pt-8 border-t border-[#2e2924] flex justify-end">
            <button
              onClick={() => setActiveArticle(null)}
              className="px-6 py-2.5 rounded-xl bg-[#2e2924] hover:bg-[#3d3730] text-[#F3EDE4] font-medium transition-colors"
            >
              Close article
            </button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------- */}
      {/* DRAWERS */}
      {/* -------------------------------------------------------- */}
      <Drawer
        isOpen={activeDrawer === 'docs'}
        onClose={() => {
          setActiveDrawer(null);
          setTimeout(() => setExpandedDoc(null), 300);
        }}
        title="Documentation"
        category="RESOURCES"
      >
        <div className="space-y-8">
          <p className="text-[15px] text-[#A3A3A3] leading-relaxed">
            Learn how to set up, configure, and use TaskFlow in your organization.
          </p>
          <div className="grid gap-3">
            {[
              {
                title: 'Getting Started',
                desc: 'Initial setup and workspace configuration',
                icon: Book,
                content: (
                  <div className="space-y-3">
                    <p>
                      TaskFlow is designed to be intuitive. Start by creating a workspace, inviting
                      your team, and setting up your first project.
                    </p>
                    <ul className="space-y-1.5 mt-2 ml-4 list-disc marker:text-[#E85D22]">
                      <li>
                        <strong className="text-[#F3EDE4]">Create a Workspace:</strong> Isolate data
                        across multiple organizations.
                      </li>
                      <li>
                        <strong className="text-[#F3EDE4]">Invite Members:</strong> Configure your
                        role-based access controls (RBAC) to ensure everyone has the right
                        permissions.
                      </li>
                      <li>
                        <strong className="text-[#F3EDE4]">Setup Integrations:</strong> Connect
                        GitHub, OpenAI, and other tools.
                      </li>
                    </ul>
                    <div className="mt-4 pt-4 border-t border-[#2e2924]">
                      <button
                        onClick={() => {
                          setActiveDrawer(null);
                          setActiveArticle({
                            title: 'Getting Started',
                            category: 'DOCUMENTATION',
                            content: (
                              <div className="space-y-4">
                                <p>
                                  Welcome to TaskFlow! The setup process is designed to be as
                                  frictionless as possible while establishing a secure environment
                                  for your team's projects.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  1. Setting up your Workspace
                                </h4>
                                <p>
                                  Your workspace is the top-level container for all projects and
                                  members. Best practice is to create one workspace per organization
                                  or distinct business unit.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  2. Configuring Roles (RBAC)
                                </h4>
                                <p>
                                  Ensure you invite members with the correct baseline permissions.
                                  TaskFlow offers Admin, Member, and Viewer roles out of the box,
                                  with the ability to define custom roles based on your security
                                  policies.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  3. Activating Integrations
                                </h4>
                                <p>
                                  Link your GitHub and OpenAI accounts in the Workspace Settings to
                                  unlock the full power of TaskFlow's AI Copilot and traceability
                                  features.
                                </p>
                              </div>
                            ),
                          });
                        }}
                        className="text-[#E85D22] hover:text-[#F0703B] font-medium transition-colors text-[13px] flex items-center"
                      >
                        Read full setup guide <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Projects & Tasks',
                desc: 'Core project management features',
                icon: Layers,
                content: (
                  <div className="space-y-3">
                    <p>
                      Projects contain lists, boards, and timelines. Tasks are the fundamental units
                      of work.
                    </p>
                    <ul className="space-y-1.5 mt-2 ml-4 list-disc marker:text-[#E85D22]">
                      <li>
                        <strong className="text-[#F3EDE4]">Hierarchies:</strong> Create subtasks,
                        assign labels, and track activity.
                      </li>
                      <li>
                        <strong className="text-[#F3EDE4]">Views:</strong> Switch seamlessly between
                        Kanban, List, and Timeline views.
                      </li>
                      <li>
                        <strong className="text-[#F3EDE4]">Dependencies:</strong> Set clear blocking
                        tasks using the DAG engine.
                      </li>
                    </ul>
                    <div className="mt-4 pt-4 border-t border-[#2e2924]">
                      <button
                        onClick={() => {
                          setActiveDrawer(null);
                          setActiveArticle({
                            title: 'Projects & Tasks',
                            category: 'DOCUMENTATION',
                            content: (
                              <div className="space-y-4">
                                <p>
                                  TaskFlow treats tasks not just as to-do items, but as nodes in a
                                  broader execution graph. This is where you actually define the
                                  work to be done.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  Project Architecture
                                </h4>
                                <p>
                                  Projects contain multiple views (Kanban, List, Timeline). They are
                                  the containers for your sprints, milestones, and epics.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  Task Lifecycle
                                </h4>
                                <p>
                                  Every task goes through a defined lifecycle. Our advanced Directed
                                  Acyclic Graph (DAG) dependency engine ensures that if a blocking
                                  task is delayed, all dependent tasks are automatically highlighted
                                  for review.
                                </p>
                              </div>
                            ),
                          });
                        }}
                        className="text-[#E85D22] hover:text-[#F0703B] font-medium transition-colors text-[13px] flex items-center"
                      >
                        Explore project management <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                ),
              },
              {
                title: 'AI Copilot',
                desc: 'Using AI to identify risks and blockers',
                icon: Activity,
                content: (
                  <div className="space-y-3">
                    <p>
                      TaskFlow's AI Copilot automatically analyzes your project's metadata and
                      dependencies to foresee issues.
                    </p>
                    <ul className="space-y-1.5 mt-2 ml-4 list-disc marker:text-[#E85D22]">
                      <li>
                        <strong className="text-[#F3EDE4]">Risk Analysis:</strong> Highlight
                        potential timeline risks automatically.
                      </li>
                      <li>
                        <strong className="text-[#F3EDE4]">Task Decomposition:</strong> Suggest
                        subtask breakdowns for large epics.
                      </li>
                      <li>
                        <strong className="text-[#F3EDE4]">Quality Checks:</strong> Flag missing
                        requirements before execution begins.
                      </li>
                    </ul>
                  </div>
                ),
              },
              {
                title: 'Workspace Settings',
                desc: 'RBAC, billing, and team management',
                icon: Building2,
                content: (
                  <div className="space-y-3">
                    <p>Manage your organization's billing, security policies, and member access.</p>
                    <p>
                      You can define custom roles or use our pre-configured Admin, Member, and
                      Viewer roles to enforce the principle of least privilege across all projects.
                    </p>
                  </div>
                ),
              },
              {
                title: 'Security & Audit',
                desc: 'Monitoring access and compliance logs',
                icon: ShieldCheck,
                content: (
                  <div className="space-y-3">
                    <p>
                      TaskFlow maintains an immutable audit log of all critical workspace
                      activities.
                    </p>
                    <p>
                      Monitor logins, permission changes, and project deletions to maintain strict
                      SOC 2 compliance standards.
                    </p>
                    <div className="mt-4 pt-4 border-t border-[#2e2924]">
                      <button
                        onClick={() => {
                          setActiveDrawer(null);
                          setActiveArticle({
                            title: 'Security & Audit',
                            category: 'DOCUMENTATION',
                            content: (
                              <div className="space-y-4">
                                <p>
                                  TaskFlow is built with security as a foundational principle. We
                                  maintain an immutable audit log of all critical workspace
                                  activities.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  Compliance Standards
                                </h4>
                                <p>
                                  Our infrastructure is designed to maintain strict SOC 2 compliance
                                  standards. You can export audit logs at any time for your internal
                                  security reviews.
                                </p>
                                <h4 className="text-lg font-semibold text-[#F3EDE4] mt-6">
                                  Data Isolation
                                </h4>
                                <p>
                                  Workspaces are logically isolated. We utilize enterprise-grade
                                  encryption for all data at rest and in transit.
                                </p>
                              </div>
                            ),
                          });
                        }}
                        className="text-[#E85D22] hover:text-[#F0703B] font-medium transition-colors text-[13px] flex items-center"
                      >
                        View compliance docs <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                ),
              },
            ].map(cat => (
              <div
                key={cat.title}
                className="flex flex-col rounded-xl bg-[#141210] border border-[#2e2924] overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#E85D22] focus-within:border-transparent"
              >
                <button
                  onClick={() => setExpandedDoc(expandedDoc === cat.title ? null : cat.title)}
                  className="group flex items-start gap-4 p-4 text-left transition-colors outline-none w-full hover:bg-[#1A1A1A]"
                >
                  <div
                    className={`w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center shrink-0 transition-colors border border-[#333333] ${expandedDoc === cat.title ? 'text-[#E85D22]' : 'text-[#8A8A8A] group-hover:text-[#E85D22]'}`}
                  >
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`text-[15px] font-medium transition-colors ${expandedDoc === cat.title ? 'text-[#E85D22]' : 'text-[#F3EDE4] group-hover:text-[#E85D22]'}`}
                    >
                      {cat.title}
                    </h4>
                    <p className="text-[13px] text-[#8A8A8A] mt-1">{cat.desc}</p>
                  </div>
                  <div
                    className={`text-[#8A8A8A] transition-transform duration-300 ${expandedDoc === cat.title ? 'rotate-90 text-[#E85D22]' : ''}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedDoc === cat.title && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 pl-18 text-[14px] text-[#A3A3A3] leading-relaxed border-t border-[#2e2924] bg-[#1A1A1A]">
                        {cat.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      <Drawer
        isOpen={activeDrawer === 'guides'}
        onClose={() => {
          setActiveDrawer(null);
          setTimeout(() => setExpandedGuide(null), 300);
        }}
        title="Guides"
        category="RESOURCES"
      >
        <div className="space-y-8">
          <p className="text-[15px] text-[#A3A3A3] leading-relaxed">
            Best practices and workflows for engineering teams using TaskFlow.
          </p>
          <div className="grid gap-4">
            {[
              {
                title: 'Getting Started with TaskFlow',
                content: (
                  <div className="space-y-3">
                    <p>Explore the foundations of setting up your first workspace.</p>
                    <p>
                      We recommend establishing standard labels and milestone conventions early. A
                      strong foundation allows your team to effectively filter tasks and manage
                      capacity across multiple sprints.
                    </p>
                    <ul className="space-y-1 mt-2 text-[#8A8A8A]">
                      <li>• Setting up your profile</li>
                      <li>• Creating your first project</li>
                      <li>• Inviting team members</li>
                    </ul>
                  </div>
                ),
              },
              {
                title: 'Managing Projects effectively',
                content: (
                  <div className="space-y-3">
                    <p>
                      A deep dive into prioritizing tasks, managing sprints through Kanban boards,
                      and establishing clear lines of accountability.
                    </p>
                    <p>
                      This guide covers how to run effective stand-ups using the Project Dashboard,
                      and how to utilize custom views to track cross-team initiatives.
                    </p>
                  </div>
                ),
              },
              {
                title: 'Creating Tasks and subtasks',
                content: (
                  <div className="space-y-3">
                    <p>
                      Learn how to decompose large pieces of work into actionable tasks. Discover
                      keyboard shortcuts for rapid task entry.
                    </p>
                    <p>
                      Effective tasks have clear acceptance criteria, assigned owners, and explicit
                      due dates. We explore the anatomy of a perfect task.
                    </p>
                  </div>
                ),
              },
              {
                title: 'Using Dependencies (DAG)',
                content: (
                  <div className="space-y-3">
                    <p>
                      TaskFlow uses a Directed Acyclic Graph to ensure tasks don't block each other.
                      Learn how to construct healthy dependency chains without cycles.
                    </p>
                    <p>
                      Discover how the AI Copilot automatically visualizes critical paths and flags
                      circular dependencies before they cause timeline slips.
                    </p>
                  </div>
                ),
              },
              {
                title: 'Using AI Task Intelligence',
                content: (
                  <div className="space-y-3">
                    <p>
                      Activate the AI Copilot on individual tasks to suggest better descriptions,
                      estimate complexity, or identify missing acceptance criteria.
                    </p>
                    <p>
                      Always review AI suggestions before applying them. Human approval remains
                      required for execution of AI recommendations.
                    </p>
                  </div>
                ),
              },
            ].map((guide, i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl bg-[#141210] border border-[#2e2924] overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#E85D22] focus-within:border-transparent"
              >
                <button
                  onClick={() => setExpandedGuide(expandedGuide === i ? null : i)}
                  className="group flex flex-col p-5 text-left transition-all hover:bg-[#1A1A1A] outline-none w-full"
                >
                  <span className="text-[10px] font-bold text-[#E85D22] uppercase tracking-wider mb-2">
                    Guide
                  </span>
                  <h4
                    className={`text-[16px] font-medium mb-3 transition-colors ${expandedGuide === i ? 'text-[#E85D22]' : 'text-[#F3EDE4] group-hover:text-[#E85D22]'}`}
                  >
                    {guide.title}
                  </h4>
                  <div
                    className={`flex items-center text-[13px] font-medium transition-colors ${expandedGuide === i ? 'text-[#E85D22]' : 'text-[#8A8A8A] group-hover:text-[#F3EDE4]'}`}
                  >
                    {expandedGuide === i ? 'Close Guide' : 'Read Guide'}
                    <ChevronRight
                      className={`w-4 h-4 ml-1 transition-transform ${expandedGuide === i ? 'rotate-90' : 'group-hover:translate-x-1'}`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedGuide === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 pt-0 text-[14px] text-[#A3A3A3] leading-relaxed border-t border-[#2e2924] bg-[#1A1A1A]">
                        {guide.content}
                        <div className="mt-5 flex">
                          <button
                            onClick={() => {
                              setActiveDrawer(null);
                              setActiveArticle({
                                title: guide.title,
                                category: 'GUIDE',
                                content: (
                                  <div className="space-y-4">
                                    <h3 className="text-xl font-medium text-[#F3EDE4]">
                                      {guide.title}
                                    </h3>
                                    {guide.content}
                                    <p className="mt-6 pt-6 border-t border-[#2e2924]">
                                      This is an expanded view of the selected guide. In the full
                                      product, this would fetch the complete markdown article for
                                      this specific guide topic.
                                    </p>
                                  </div>
                                ),
                              });
                            }}
                            className="text-[13px] px-4 py-2 rounded-lg bg-[#2e2924] hover:bg-[#3d3730] text-[#F3EDE4] font-medium transition-colors flex items-center gap-2"
                          >
                            Read full article <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </>
  );
};
