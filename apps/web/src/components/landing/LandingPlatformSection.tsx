import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';

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

        {/* Premium 3D Security Core Visual */}
        <div className="relative h-[600px] w-full flex items-center justify-center perspective-[2000px] mb-20 group">
          <motion.div
            initial={{ rotateX: 25, rotateY: 0 }}
            whileInView={{ rotateX: 15, rotateY: 5 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="relative w-full max-w-[800px] h-full preserve-3d"
          >
            {/* Base Core Platform */}
            <motion.div
              initial={{ y: 0, opacity: 0, z: -150 }}
              whileInView={{ y: 60, opacity: 1, z: -150 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute inset-0 m-auto w-[600px] h-[300px] rounded-[32px] border border-[#1A1A1A] bg-gradient-to-b from-[#0A0A0A] to-[#050505] shadow-[0_60px_120px_rgba(0,0,0,0.9),_inset_0_2px_0_rgba(255,255,255,0.03)] flex items-center justify-center preserve-3d overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] pointer-events-none" />
              {/* Inner metallic structure */}
              <div className="w-[400px] h-[200px] rounded-[24px] border border-[#262626] bg-[#0F0F0F] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]" />
            </motion.div>

            {/* Glowing Orange Light Source */}
            <motion.div
              initial={{ opacity: 0, z: -50 }}
              whileInView={{ opacity: 1, z: -50 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute inset-0 m-auto w-[250px] h-[250px] bg-[#E85D22] rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"
            />

            {/* Protection Rings */}
            {[0, 1].map(ring => (
              <motion.div
                key={ring}
                initial={{ opacity: 0, z: -50 + ring * 50 }}
                whileInView={{ opacity: 1, z: -50 + ring * 50 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4 + ring * 0.2 }}
                className={`absolute inset-0 m-auto w-full max-w-[${400 - ring * 50}px] h-[${400 - ring * 50}px] rounded-full border ${ring === 0 ? 'border-[#333333]' : 'border-[#E85D22]/30 border-dashed'} bg-transparent preserve-3d`}
                style={{ transform: `rotateX(60deg) translateZ(${ring * 20}px)` }}
              />
            ))}

            {/* The Central Security Core Object */}
            <motion.div
              initial={{ y: 0, opacity: 0, z: 0 }}
              whileInView={{ y: -40, opacity: 1, z: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.6 }}
              className="absolute inset-0 m-auto w-[180px] h-[180px] rounded-[32px] border border-[#E85D22]/40 bg-[#161616]/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(232,93,34,0.15),_inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center preserve-3d transition-transform duration-700 group-hover:-translate-y-[50px]"
            >
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-[#E85D22]/10 to-transparent opacity-50" />
              <div className="relative w-20 h-20 rounded-[20px] bg-[#E85D22]/15 border border-[#E85D22]/30 flex items-center justify-center shadow-[0_0_30px_rgba(232,93,34,0.2)]">
                <Shield className="w-10 h-10 text-[#E85D22]" />
              </div>
            </motion.div>

            {/* Floating UI Panel 1: SOC2 */}
            <motion.div
              initial={{ x: -100, y: 50, opacity: 0, z: 100 }}
              whileInView={{ x: -160, y: 0, opacity: 1, z: 100 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.8 }}
              className="absolute left-1/2 top-1/2 w-52 p-4 rounded-[16px] border border-[#22C55E]/30 bg-[#111111]/90 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8),_0_0_30px_rgba(34,197,94,0.05)] preserve-3d transition-transform duration-700 group-hover:translate-x-[-180px] group-hover:translate-z-[120px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-[0.1em] text-[#22C55E] uppercase mb-1">
                    Security Layer
                  </div>
                  <div className="text-[14px] font-semibold text-[#F3EDE4]">SOC 2 Type II</div>
                </div>
              </div>
            </motion.div>

            {/* Floating UI Panel 2: Encryption */}
            <motion.div
              initial={{ x: 50, y: -50, opacity: 0, z: 80 }}
              whileInView={{ x: 80, y: -80, opacity: 1, z: 80 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.9 }}
              className="absolute left-1/2 top-1/2 w-56 p-4 rounded-[16px] border border-[#E85D22]/30 bg-[#111111]/90 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8),_0_0_30px_rgba(232,93,34,0.05)] preserve-3d transition-transform duration-700 group-hover:translate-x-[100px] group-hover:translate-z-[100px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#E85D22]/15 border border-[#E85D22]/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#E85D22]" />
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-[0.1em] text-[#E85D22] uppercase mb-1">
                    Data Protection
                  </div>
                  <div className="text-[14px] font-semibold text-[#F3EDE4]">E2E Encrypted</div>
                </div>
              </div>
            </motion.div>

            {/* Floating UI Panel 3: Uptime */}
            <motion.div
              initial={{ x: 80, y: 100, opacity: 0, z: 120 }}
              whileInView={{ x: 120, y: 60, opacity: 1, z: 120 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute left-1/2 top-1/2 w-44 p-3.5 rounded-[12px] border border-[#3B82F6]/30 bg-[#111111]/90 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] preserve-3d transition-transform duration-700 group-hover:translate-x-[140px] group-hover:translate-z-[140px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-pulse" />
                <div className="text-[13px] font-semibold text-[#F3EDE4]">99.99% Uptime</div>
              </div>
            </motion.div>
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
