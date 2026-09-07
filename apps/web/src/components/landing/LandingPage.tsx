import React, { useEffect, useState } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { LandingProductPreview } from './LandingProductPreview';
import { LandingCapabilityStrip } from './LandingCapabilityStrip';
import { LandingProductStory } from './LandingProductStory';
import { LandingAIShowcase } from './LandingAIShowcase';
import { LandingExecutionShowcase } from './LandingExecutionShowcase';
import { LandingDependencyShowcase } from './LandingDependencyShowcase';
import { LandingPlatformSection } from './LandingPlatformSection';
import { LandingCTA } from './LandingCTA';
import { LandingFooter } from './LandingFooter';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onGetStarted }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      setScrollProgress(maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleExplore = () => {
    const el = document.getElementById('product');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 overflow-x-hidden font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Scroll progress bar */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-sky-400 to-indigo-500 z-[60] transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <LandingNavbar onSignIn={onSignIn} onGetStarted={onGetStarted} />

      <main>
        <LandingHero onGetStarted={onGetStarted} onExplore={handleExplore} />
        <LandingCapabilityStrip />
        <LandingProductPreview />
        <LandingProductStory />
        <LandingAIShowcase />
        <LandingExecutionShowcase />
        <LandingDependencyShowcase />
        <LandingPlatformSection />
        <LandingCTA onGetStarted={onGetStarted} />
      </main>

      <LandingFooter />
    </div>
  );
};
