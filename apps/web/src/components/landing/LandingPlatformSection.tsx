import React, { useRef } from 'react';
import {
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Users,
  Activity,
  Server,
  Key,
  Eye,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

const COMPLIANCE_BADGES = [
  { label: 'SOC 2 Type II', color: '#22C55E', dot: '#22C55E' },
  { label: 'GDPR', color: '#3B82F6', dot: '#3B82F6' },
  { label: 'HIPAA Ready', color: '#A855F7', dot: '#A855F7' },
  { label: 'ISO 27001', color: '#F59E0B', dot: '#F59E0B' },
];

const AUDIT_EVENTS = [
  {
    user: 'Alex Chen',
    action: 'Changed role: Viewer → Lead',
    time: '2m ago',
    avatar: 2,
    flag: false,
  },
  { user: 'Sarah Kim', action: 'Exported project data', time: '18m ago', avatar: 5, flag: true },
  {
    user: 'System',
    action: 'Backup completed successfully',
    time: '1h ago',
    avatar: 0,
    flag: false,
  },
  { user: 'Mike Johnson', action: 'API key rotated', time: '3h ago', avatar: 7, flag: false },
];

const PERMISSIONS = [
  { role: 'Owner', perms: ['Full access', 'Billing', 'Delete workspace'] },
  { role: 'Admin', perms: ['Manage members', 'Settings', 'All projects'] },
  { role: 'Lead', perms: ['Project admin', 'Assign tasks', 'View reports'] },
  { role: 'Member', perms: ['Create tasks', 'Comment', 'View only'] },
];

const INFRA_STATS = [
  { label: 'Uptime SLA', value: '99.99%', color: '#22C55E' },
  { label: 'Data regions', value: '12', color: '#3B82F6' },
  { label: 'Audit events/day', value: '840K', color: '#E85D22' },
  { label: 'Encryption keys', value: 'AES-256', color: '#A855F7' },
];

export const LandingPlatformSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -2]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 4]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const yParallax = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - left) / width - 0.5);
    mouseY.set((e.clientY - top) / height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section
      ref={containerRef}
      id="platform"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="py-32 relative overflow-hidden bg-[#080808]"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#E85D22]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#333333] to-transparent" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#E85D22]/[0.025] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[#3B82F6]/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20"
        >
          <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#E85D22] block mb-4">
            BUILT FOR ENTERPRISE
          </span>
          <div className="flex items-end justify-between gap-8">
            <h2 className="font-display text-[clamp(2.8rem,4vw,4rem)] font-medium tracking-tight leading-[1.05] text-[#F3EDE4] max-w-[560px]">
              Security and scale that grows with you.
            </h2>
            <p className="text-[16px] text-[#737373] leading-relaxed max-w-[380px] mb-2 hidden lg:block">
              Enterprise-grade infrastructure, compliance, and access controls — so your security
              team never has to say no.
            </p>
          </div>
        </motion.div>

        {/* Main 2-column layout */}
        <div className="grid lg:grid-cols-[1fr,1.2fr] gap-12 items-start mb-16">
          {/* LEFT: Stat tiles + compliance badges */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Infrastructure stats */}
            <div className="grid grid-cols-2 gap-4">
              {INFRA_STATS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="p-6 rounded-[16px] border border-[#1E1E1E] bg-[#111111] hover:border-[#2A2A2A] transition-all group"
                >
                  <div
                    className="text-[2rem] font-display font-semibold leading-none mb-2"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[12px] font-medium text-[#737373] uppercase tracking-wider">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Compliance badges */}
            <div className="p-6 rounded-[16px] border border-[#1E1E1E] bg-[#111111]">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#555555] mb-5">
                Compliance Certifications
              </div>
              <div className="grid grid-cols-2 gap-3">
                {COMPLIANCE_BADGES.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-[10px] border border-[#1A1A1A] bg-[#0D0D0D] hover:border-[#2A2A2A] transition-all cursor-pointer"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: b.color, boxShadow: `0 0 6px ${b.color}` }}
                    />
                    <span className="text-[13px] font-semibold" style={{ color: b.color }}>
                      {b.label}
                    </span>
                    <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: b.color }} />
                  </div>
                ))}
              </div>
            </div>

            {/* RBAC table */}
            <div className="p-6 rounded-[16px] border border-[#1E1E1E] bg-[#111111]">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#555555]">
                  Role-Based Access Control
                </div>
                <Key className="w-4 h-4 text-[#555555]" />
              </div>
              <div className="space-y-2">
                {PERMISSIONS.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 border-b border-[#0F0F0F] last:border-0"
                  >
                    <div className="w-16 shrink-0">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-[4px] ${
                          i === 0
                            ? 'text-[#E85D22] bg-[#E85D22]/10'
                            : i === 1
                              ? 'text-[#3B82F6] bg-[#3B82F6]/10'
                              : i === 2
                                ? 'text-[#A855F7] bg-[#A855F7]/10'
                                : 'text-[#737373] bg-[#1A1A1A]'
                        }`}
                      >
                        {p.role}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {p.perms.map((perm, j) => (
                        <span
                          key={j}
                          className="text-[11px] text-[#737373] bg-[#0D0D0D] border border-[#1E1E1E] px-2 py-0.5 rounded-[4px]"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Live audit log + security panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="perspective-[1400px]"
          >
            <motion.div
              style={{ y: yParallax, rotateX, rotateY }}
              className="rounded-[20px] border border-[#222222] bg-[#0F0F0F] shadow-[0_40px_100px_rgba(0,0,0,0.9),_inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden preserve-3d"
            >
              {/* Panel top bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#161616] border-b border-[#1E1E1E]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#E85D22]/15 border border-[#E85D22]/30 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#E85D22]" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#F3EDE4]">Security Center</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[12px] text-[#22C55E] font-medium">All systems normal</span>
                </div>
              </div>

              {/* Threat level meter */}
              <div className="px-6 pt-6 pb-4 border-b border-[#1A1A1A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#555555]">
                    Threat Level
                  </span>
                  <span className="text-[13px] font-bold text-[#22C55E]">LOW RISK</span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '18%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#16A34A]"
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[#444444] font-medium">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>

              {/* Infrastructure health */}
              <div className="px-6 py-4 border-b border-[#1A1A1A]">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#555555] mb-4">
                  Infrastructure Health
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'API', icon: Globe, status: 'Healthy', color: '#22C55E' },
                    { label: 'Database', icon: Server, status: 'Healthy', color: '#22C55E' },
                    { label: 'Auth', icon: Lock, status: 'Healthy', color: '#22C55E' },
                    { label: 'Storage', icon: Activity, status: 'Healthy', color: '#22C55E' },
                    { label: 'WebSocket', icon: Activity, status: 'Healthy', color: '#22C55E' },
                    { label: 'Workers', icon: Users, status: 'Degraded', color: '#F59E0B' },
                  ].map((svc, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-[10px] border ${svc.color === '#22C55E' ? 'border-[#22C55E]/15 bg-[#22C55E]/05' : 'border-[#F59E0B]/15 bg-[#F59E0B]/05'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <svc.icon className="w-3.5 h-3.5" style={{ color: svc.color }} />
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: svc.color }}
                        />
                      </div>
                      <div className="text-[11px] font-semibold text-[#E5E5E5]">{svc.label}</div>
                      <div className="text-[10px]" style={{ color: svc.color }}>
                        {svc.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit log */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-[#555555]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#555555]">
                      Live Audit Log
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-[11px] text-[#E85D22] font-semibold hover:text-[#F0703B] transition-colors">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {AUDIT_EVENTS.map((evt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-[10px] border ${evt.flag ? 'border-[#F59E0B]/20 bg-[#F59E0B]/05' : 'border-[#1A1A1A] bg-[#0D0D0D]'}`}
                    >
                      {evt.avatar > 0 ? (
                        <div className="w-7 h-7 rounded-full bg-[#262626] border border-[#333333] overflow-hidden shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${evt.avatar}&backgroundColor=transparent`}
                            alt=""
                          />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#E5E5E5] truncate">
                            {evt.user}
                          </span>
                          {evt.flag && (
                            <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#737373] truncate">{evt.action}</div>
                      </div>
                      <div className="text-[10px] text-[#555555] shrink-0">{evt.time}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Encryption indicator */}
              <div className="mx-6 mb-6 p-4 rounded-[12px] border border-[#E85D22]/15 bg-[#E85D22]/05 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-[#E85D22]" />
                  <div>
                    <div className="text-[12px] font-semibold text-[#F3EDE4]">
                      End-to-end encrypted
                    </div>
                    <div className="text-[11px] text-[#737373]">
                      AES-256-GCM · TLS 1.3 in transit
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#E85D22]" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Shield,
              color: '#22C55E',
              title: 'Multi-Tenant Isolation',
              description:
                'Strict logical database isolation protects each workspace boundary. Zero cross-contamination between accounts.',
            },
            {
              icon: Users,
              color: '#3B82F6',
              title: 'Granular Permissions',
              description:
                'Five-tier RBAC with fine-grained control over every project, task, and workspace action.',
            },
            {
              icon: Activity,
              color: '#E85D22',
              title: 'Real-Time Sync',
              description:
                'Event-driven WebSocket architecture with global CDN keeps every client synchronized instantly.',
            },
          ].map(({ icon: Icon, color, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 bg-[#111111] border border-[#1E1E1E] rounded-[16px] hover:border-[#2A2A2A] transition-all group cursor-pointer"
            >
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-5 border"
                style={{ background: `${color}15`, borderColor: `${color}30` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-[16px] font-bold text-[#F3EDE4] mb-3 group-hover:text-white transition-colors">
                {title}
              </h3>
              <p className="text-[14px] text-[#737373] leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
