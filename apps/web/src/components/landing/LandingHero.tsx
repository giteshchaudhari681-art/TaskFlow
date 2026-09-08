import React from 'react';
import { ArrowRight, ShieldCheck, GitBranch, Activity } from 'lucide-react';

interface LandingHeroProps {
 onGetStarted: () => void;
 onExplore: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onExplore }) => {
 return (
  <section id="hero" className="relative min-h-[88vh] flex flex-col justify-center pt-[64px]">
   <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10 py-20 sm:py-28 w-full">
    <p className="tf-kicker mb-5">Project operations software</p>
    <h1 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] font-medium tracking-tight leading-[1.08] max-w-3xl mb-6 text-[#f3ede4]">
     Serious work deserves a calm operating picture.
    </h1>
    <p className="text-base sm:text-lg text-[#9c948a] max-w-[34rem] leading-relaxed mb-10">
     TaskFlow is project-management software for engineering teams: dependencies, delivery
     health, and collaboration — without the neon dashboard costume.
    </p>
    <div className="flex flex-col sm:flex-row items-start gap-3 mb-16">
     <button
      type="button"
      onClick={onGetStarted}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] bg-[#c45c26] hover:bg-[#a84d20] text-white text-sm font-semibold"
     >
      Create a workspace
      <ArrowRight className="w-4 h-4" />
     </button>
     <button
      type="button"
      onClick={onExplore}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] border border-[#3a342c] text-sm text-[#f3ede4] hover:bg-[#1c1916]"
     >
      See the product
     </button>
    </div>
    <div className="grid sm:grid-cols-3 gap-8 border-t border-[#2e2924] pt-8">
     {[
      { icon: GitBranch, label: 'Deterministic dependency graphs' },
      { icon: Activity, label: 'Delivery health as a first-class signal' },
      { icon: ShieldCheck, label: 'Tenant isolation and audit trails' },
     ].map(({ icon: Icon, label }) => (
      <div key={label} className="flex items-start gap-3 text-sm text-[#b7afa5]">
       <Icon className="w-4 h-4 text-[#c45c26] mt-0.5 shrink-0" />
       <span>{label}</span>
      </div>
     ))}
    </div>
   </div>
  </section>
 );
};
