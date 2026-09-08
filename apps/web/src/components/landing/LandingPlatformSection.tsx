import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Lock, Server } from 'lucide-react';

export const LandingPlatformSection: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section id="platform" className="py-32 relative overflow-hidden bg-[#0A0A0A]">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          style={{ y: yBg }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-[#E85D22]/[0.02] rounded-full blur-[140px]"
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto text-center mb-24"
        >
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#E85D22]">
              BUILT FOR ENTERPRISE
            </span>
          </div>
          <h2 className="font-display text-[clamp(3rem,4.5vw,4rem)] font-medium tracking-tight leading-[1.05] mb-8 text-[#F3EDE4]">
            Scale without the growing pains.
          </h2>
          <p className="text-[1.2rem] text-[#A3A3A3] leading-relaxed font-sans max-w-[640px] mx-auto">
            TaskFlow is built on enterprise-grade infrastructure to support your team as it grows
            from 10 to 10,000 without a hiccup.
          </p>
        </motion.div>

        {/* 3D Infrastructure Visual */}
        <div className="relative h-[600px] w-full flex items-center justify-center perspective-[1600px] mb-20">
          <motion.div
            initial={{ rotateX: 30, rotateY: 0 }}
            whileInView={{ rotateX: 25, rotateY: 8 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="relative w-full max-w-[800px] h-full preserve-3d"
          >
            {/* Layer 1: Base/Data Layer */}
            <motion.div
              initial={{ y: 0, opacity: 0 }}
              whileInView={{ y: 80, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] rounded-[24px] border-2 border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-md shadow-[0_40px_100px_rgba(0,0,0,0.9),_inset_0_2px_0_rgba(255,255,255,0.02)] flex items-end p-8 preserve-3d transform"
              style={{ translateZ: -100 }}
            >
              <div className="w-full flex justify-between items-center opacity-40">
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-20 h-4 bg-[#262626] rounded-full" />
                  ))}
                </div>
                <Server className="w-8 h-8 text-[#A3A3A3]" />
              </div>
            </motion.div>

            {/* Layer 2: API/Compute Layer */}
            <motion.div
              initial={{ y: 0, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[260px] rounded-[24px] border border-[#262626] bg-[#111111]/80 backdrop-blur-xl shadow-[0_40px_100px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] flex items-end p-8 preserve-3d"
              style={{ translateZ: 0 }}
            >
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 pointer-events-none" />
              <div className="w-full flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-[8px] bg-[#262626] border border-[#333333] flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#8A8A8A]" />
                  </div>
                  <div className="w-12 h-12 rounded-[8px] bg-[#262626] border border-[#333333]" />
                  <div className="w-12 h-12 rounded-[8px] bg-[#262626] border border-[#333333]" />
                </div>
              </div>
            </motion.div>

            {/* Layer 3: Security/Application Layer (Top) */}
            <motion.div
              initial={{ y: 0, opacity: 0 }}
              whileInView={{ y: -80, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.6 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[220px] rounded-[24px] border border-[#E85D22]/30 bg-[#161616]/90 backdrop-blur-2xl shadow-[0_40px_120px_rgba(232,93,34,0.2),_inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center preserve-3d overflow-hidden"
              style={{ translateZ: 100 }}
            >
              {/* Glowing edge effect */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#E85D22] to-transparent opacity-60" />

              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-[12px] bg-[#E85D22]/10 border border-[#E85D22]/30 flex items-center justify-center shadow-[0_0_40px_rgba(232,93,34,0.3)]">
                  <Shield className="w-8 h-8 text-[#E85D22]" />
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-bold tracking-widest text-[#F3EDE4] uppercase mb-2">
                    SOC2 Type II
                  </div>
                  <div className="text-[13px] text-[#A3A3A3] font-medium">
                    End-to-end encryption
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Connecting Beams */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[200px] border-l border-r border-[#E85D22]/20 border-dashed transform -translate-z-50"
            />
          </motion.div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              title: 'Multi-Tenant Isolation',
              description:
                'Strict logical database isolation protecting each workspace boundary. Zero data cross-contamination.',
            },
            {
              title: 'Role-Based Access',
              description:
                'Fine-grained RBAC with Owner, Admin, Lead, Member, and Viewer permission layers.',
            },
            {
              title: 'Real-Time Sync',
              description:
                'Event-driven WebSocket architecture keeps every connected client synchronized instantly.',
            },
          ].map(({ title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center bg-[#111111] border border-[#262626] rounded-[16px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <h3 className="text-[18px] font-bold text-[#F3EDE4] mb-4">{title}</h3>
              <p className="text-[15px] text-[#A3A3A3] leading-relaxed max-w-[320px] mx-auto">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
