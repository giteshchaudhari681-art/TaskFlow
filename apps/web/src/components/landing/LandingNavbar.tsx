import React, { useState, useEffect } from 'react';
import { Workflow, Menu, X } from 'lucide-react';

interface LandingNavbarProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onSignIn, onGetStarted }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { id: 'features', label: 'Features' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'docs', label: 'Docs' },
    { id: 'changelog', label: 'Changelog' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-[#0a0a0a]/80 backdrop-blur-md border-[#262626]'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between gap-8">
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

        <nav className="hidden lg:flex items-center justify-center gap-8 flex-1">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className="text-[13px] font-medium text-[#A3A3A3] hover:text-[#F3EDE4] transition-colors duration-200 tracking-wide"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
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
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-[400px] border-t border-[#262626]' : 'max-h-0'
        } bg-[#0D0D0D]/95 backdrop-blur-xl`}
      >
        <div className="px-6 py-4 space-y-1">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#161616] rounded-[6px] transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="pt-4 pb-2 px-4 border-t border-[#262626] mt-4">
            <button
              type="button"
              onClick={onSignIn}
              className="w-full py-2.5 text-sm font-medium text-[#F3EDE4] border border-[#262626] hover:bg-[#161616] rounded-[6px] transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
