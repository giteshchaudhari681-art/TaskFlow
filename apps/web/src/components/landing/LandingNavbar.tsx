import React, { useState, useEffect } from 'react';
import { Workflow, Menu, X, ArrowRight } from 'lucide-react';

interface LandingNavbarProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onSignIn, onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { id: 'product', label: 'Product' },
    { id: 'ai', label: 'Intelligence' },
    { id: 'dependencies', label: 'Dependencies' },
    { id: 'platform', label: 'Platform' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#06080d]/90 backdrop-blur-2xl border-b border-white/[0.07] shadow-xl shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-[68px] flex items-center justify-between gap-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="flex items-center gap-2.5 group select-none cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:shadow-sky-500/50 group-hover:scale-105 transition-all duration-200 ring-1 ring-white/20">
            <Workflow className="w-[17px] h-[17px] text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white group-hover:text-sky-300 transition-colors">
            TaskFlow
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150 cursor-pointer"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onSignIn}
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.07] transition-all duration-150 cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 transition-all duration-200 hover:-translate-y-px cursor-pointer"
          >
            <span>Get started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/[0.05] border border-white/[0.09] text-slate-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.07] bg-[#06080d]/98 backdrop-blur-3xl px-5 pt-4 pb-6">
          <nav className="flex flex-col gap-1 mb-5">
            {navLinks.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="text-left px-3.5 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="border-t border-white/[0.07] pt-4 flex flex-col gap-2">
            <button
              onClick={onSignIn}
              className="w-full py-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-sm font-semibold text-slate-200"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold shadow-lg shadow-sky-500/20"
            >
              Get started free
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
