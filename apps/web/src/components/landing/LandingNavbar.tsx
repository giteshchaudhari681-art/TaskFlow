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
  { id: 'product', label: 'Product' },
  { id: 'ai', label: 'Intelligence' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'platform', label: 'Platform' },
 ];

 return (
  <header
   className={`fixed top-0 left-0 right-0 z-50 border-b ${
    scrolled ? 'bg-[#141210] border-[#2e2924]' : 'bg-transparent border-transparent'
   }`}
  >
   <div className="max-w-[1100px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
    <button
     type="button"
     onClick={() => scrollToSection('hero')}
     className="flex items-center gap-2.5"
    >
     <span className="w-7 h-7 rounded-[4px] bg-[#c45c26] text-white flex items-center justify-center">
      <Workflow className="w-3.5 h-3.5" />
     </span>
     <span className="font-display text-[1.1rem] text-[#f3ede4]">TaskFlow</span>
    </button>

    <nav className="hidden md:flex items-center gap-1">
     {navLinks.map(({ id, label }) => (
      <button
       key={id}
       type="button"
       onClick={() => scrollToSection(id)}
       className="px-3 py-2 text-[13px] font-medium text-[#9c948a] hover:text-[#f3ede4]"
      >
       {label}
      </button>
     ))}
    </nav>

    <div className="flex items-center gap-2 shrink-0">
     <button
      type="button"
      onClick={onSignIn}
      className="hidden sm:inline-flex px-3 py-2 text-[13px] font-semibold text-[#b7afa5] hover:text-[#f3ede4]"
     >
      Sign in
     </button>
     <button
      type="button"
      onClick={onGetStarted}
      className="inline-flex px-3.5 py-2 rounded-[4px] bg-[#c45c26] hover:bg-[#a84d20] text-white text-[13px] font-semibold"
     >
      Get started
     </button>
     <button
      type="button"
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      className="md:hidden p-2 text-[#9c948a]"
      aria-label="Toggle menu"
     >
      {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
     </button>
    </div>
   </div>

   {mobileMenuOpen && (
    <div className="md:hidden border-t border-[#2e2924] bg-[#141210] px-5 py-4">
     {navLinks.map(({ id, label }) => (
      <button
       key={id}
       type="button"
       onClick={() => scrollToSection(id)}
       className="block w-full text-left py-2.5 text-sm text-[#b7afa5]"
      >
       {label}
      </button>
     ))}
     <button
      type="button"
      onClick={onSignIn}
      className="mt-3 w-full py-2.5 border border-[#3a342c] text-sm"
     >
      Sign in
     </button>
    </div>
   )}
  </header>
 );
};
