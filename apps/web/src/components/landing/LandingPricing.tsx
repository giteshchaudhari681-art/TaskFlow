import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Building2, Rocket, ArrowRight, Sparkles } from 'lucide-react';

interface LandingPricingProps {
  onGetStarted: () => void;
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Rocket,
    iconColor: '#737373',
    iconBg: '#1A1A1A',
    badge: null,
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'For individuals and small teams getting started.',
    cta: 'Get started free',
    ctaStyle: 'border',
    features: [
      'Up to 3 projects',
      'Up to 5 members',
      '2 GB storage',
      'Basic task management',
      'Board & list views',
      'Community support',
    ],
    notIncluded: ['AI Copilot', 'Dependency graphs', 'Analytics', 'SSO / SAML'],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    iconColor: '#E85D22',
    iconBg: '#E85D22',
    badge: 'Most popular',
    monthlyPrice: 18,
    annualPrice: 14,
    description: 'For growing teams that need AI-powered project intelligence.',
    cta: 'Start free trial',
    ctaStyle: 'primary',
    features: [
      'Unlimited projects',
      'Unlimited members',
      '100 GB storage',
      'AI Copilot & risk detection',
      'Dependency graphs + DAG',
      'Workload balancing',
      'Advanced analytics',
      'Priority email support',
    ],
    notIncluded: ['SSO / SAML', 'Audit logs', 'Custom SLA'],
  },
];

const TOGGLE_OPTIONS = [
  { label: 'Monthly', value: 'monthly' as const },
  { label: 'Annual', value: 'annual' as const },
];

export const LandingPricing: React.FC<LandingPricingProps> = ({ onGetStarted }) => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  return (
    <section id="pricing" className="py-32 relative overflow-hidden bg-[#080808]">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#333333] to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#333333] to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#E85D22]/[0.025] rounded-full blur-[140px]" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#E85D22] block mb-4">
            PRICING
          </span>
          <h2 className="font-display text-[clamp(2.5rem,4vw,3.6rem)] font-medium tracking-tight leading-[1.05] text-[#F3EDE4] mb-5">
            Simple, transparent pricing.
          </h2>
          <p className="text-[17px] text-[#737373] max-w-[480px] mx-auto leading-relaxed">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-[10px] border border-[#222222] bg-[#111111]">
            {TOGGLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBilling(opt.value)}
                className={`relative px-5 py-2 rounded-[7px] text-[13px] font-semibold transition-all duration-200 ${
                  billing === opt.value
                    ? 'bg-[#1E1E1E] text-[#F3EDE4] shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                    : 'text-[#737373] hover:text-[#A3A3A3]'
                }`}
              >
                {opt.label}
                {opt.value === 'annual' && (
                  <span className="ml-2 text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded-full">
                    Save 22%
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-[800px] mx-auto gap-5 items-stretch">
          {PLANS.map((plan, i) => {
            const isPro = plan.id === 'pro';
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex flex-col rounded-[20px] border overflow-hidden transition-all duration-300 ${
                  isPro
                    ? 'border-[#E85D22]/40 bg-gradient-to-b from-[#141210] to-[#0F0D0B] shadow-[0_0_60px_rgba(232,93,34,0.1),_0_24px_48px_rgba(0,0,0,0.8)]'
                    : 'border-[#1E1E1E] bg-[#0F0F0F] hover:border-[#2A2A2A]'
                }`}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center">
                    <div className="flex items-center gap-1.5 bg-[#E85D22] text-white text-[11px] font-bold uppercase tracking-[0.12em] px-4 py-1.5 rounded-b-[8px]">
                      <Sparkles className="w-3 h-3" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className={`p-8 flex-1 ${plan.badge ? 'pt-12' : ''}`}>
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                      style={{
                        background: `${plan.iconBg}18`,
                        border: `1px solid ${plan.iconBg}30`,
                      }}
                    >
                      <plan.icon className="w-5 h-5" style={{ color: plan.iconColor }} />
                    </div>
                    <span className="text-[18px] font-bold text-[#F3EDE4]">{plan.name}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-2">
                    {price === null ? (
                      <div className="text-[3rem] font-display font-semibold text-[#F3EDE4] leading-none">
                        Custom
                      </div>
                    ) : price === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[3rem] font-display font-semibold text-[#F3EDE4] leading-none">
                          Free
                        </span>
                        <span className="text-[14px] text-[#555555] ml-1">forever</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[1.5rem] font-semibold text-[#737373]">$</span>
                        <span className="text-[3rem] font-display font-semibold text-[#F3EDE4] leading-none">
                          {price}
                        </span>
                        <span className="text-[14px] text-[#555555] ml-1">/ user / mo</span>
                      </div>
                    )}
                  </div>
                  {billing === 'annual' && price !== null && price !== 0 && (
                    <p className="text-[12px] text-[#555555] mb-5">
                      Billed annually · ${price * 12} / user / yr
                    </p>
                  )}

                  <p className="text-[14px] text-[#737373] leading-relaxed mb-8">
                    {plan.description}
                  </p>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className={`w-full py-3 rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all mb-8 ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-[#E85D22] text-white hover:bg-[#F0703B] shadow-[0_4px_16px_rgba(232,93,34,0.3)] hover:shadow-[0_6px_20px_rgba(232,93,34,0.4)] hover:-translate-y-px'
                        : 'border border-[#333333] text-[#A3A3A3] hover:border-[#444444] hover:text-[#F3EDE4]'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isPro ? 'bg-[#E85D22]/15' : 'bg-[#22C55E]/10'}`}
                        >
                          <Check
                            className={`w-2.5 h-2.5 ${isPro ? 'text-[#E85D22]' : 'text-[#22C55E]'}`}
                            strokeWidth={3}
                          />
                        </div>
                        <span className="text-[13px] text-[#A3A3A3]">{f}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map(f => (
                      <div key={f} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-[#2A2A2A] flex items-center justify-center shrink-0 bg-[#161616]">
                          <div className="w-2 h-px bg-[#444444]" />
                        </div>
                        <span className="text-[13px] text-[#737373]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise Panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[800px] mx-auto mt-5 rounded-[20px] border border-[#1E1E1E] bg-[#0A0A0A] overflow-hidden"
        >
          <div className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">
                  BUILT FOR ENTERPRISE
                </span>
              </div>
              <h3 className="font-display text-[24px] font-medium text-[#F3EDE4] mb-2 leading-tight">
                Security and scale that grows with you.
              </h3>
              <p className="text-[14px] text-[#737373] leading-relaxed max-w-[400px]">
                For large organisations needing compliance, custom scale, and dedicated support.
              </p>
            </div>

            <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
              <div className="space-y-2 mb-4 md:mb-2">
                <div className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={3} />
                  <span className="text-[13px] text-[#A3A3A3]">SSO / SAML</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={3} />
                  <span className="text-[13px] text-[#A3A3A3]">SOC 2 Type II & GDPR</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={3} />
                  <span className="text-[13px] text-[#A3A3A3]">Role-based access (RBAC)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onGetStarted}
                className="w-full md:w-auto px-6 py-3 rounded-[10px] text-[14px] font-semibold border border-[#333333] text-[#F3EDE4] hover:border-[#555555] hover:bg-[#111111] transition-all flex items-center justify-center gap-2"
              >
                Contact Sales
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center text-[13px] text-[#555555] mt-10"
        >
          All plans include a <span className="text-[#A3A3A3]">14-day free trial</span>. No credit
          card required.
          <span className="mx-2 opacity-40">·</span>
          Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
};
