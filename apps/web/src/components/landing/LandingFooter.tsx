import React from 'react';
import { Workflow, Github, Twitter } from 'lucide-react';

const footerLinks = {
 Product: [
  { label: 'Overview', href: '#product' },
  { label: 'AI Intelligence', href: '#ai' },
  { label: 'Dependency Engine', href: '#dependencies' },
  { label: 'Platform', href: '#platform' },
 ],
 Resources: [
  { label: 'Documentation', href: '#' },
  { label: 'API Reference', href: '#' },
  { label: 'Release Notes', href: '#' },
  { label: 'System Status', href: '#' },
 ],
 Company: [
  { label: 'About', href: '#' },
  { label: 'Security', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
 ],
};

export const LandingFooter: React.FC = () => {
 return (
  <footer className="border-t border-white/[0.06] bg-[#040608]">
   <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-16 pb-10">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
     {/* Brand */}
     <div className="col-span-2 space-y-5">
      <div className="flex items-center gap-2.5">
       <div className="w-7 h-7 rounded-[9px] bg-taskflow-surface flex items-center justify-center shadow-lg shadow-sky-500/20">
        <Workflow className="w-3.5 h-3.5 text-white" />
       </div>
       <span className="font-bold text-[15px] text-white tracking-tight">TaskFlow</span>
      </div>
      <p className="text-[13px] text-slate-500 leading-relaxed max-w-[240px]">
       AI-powered project operations platform for engineering and product teams that ship
       fast.
      </p>
      <div className="flex items-center gap-3">
       <a
        href="#"
        className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white hover:border-white/[0.15] transition-all"
       >
        <Github className="w-3.5 h-3.5" />
       </a>
       <a
        href="#"
        className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white hover:border-white/[0.15] transition-all"
       >
        <Twitter className="w-3.5 h-3.5" />
       </a>
      </div>
     </div>

     {/* Link columns */}
     {Object.entries(footerLinks).map(([category, links]) => (
      <div key={category}>
       <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-5">
        {category}
       </h4>
       <ul className="space-y-3">
        {links.map(({ label, href }) => (
         <li key={label}>
          <a
           href={href}
           className="text-[13px] text-slate-500 hover:text-white transition-colors"
          >
           {label}
          </a>
         </li>
        ))}
       </ul>
      </div>
     ))}
    </div>

    {/* Bottom bar */}
    <div className="pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
     <div className="text-[12px] text-slate-600">
      © {new Date().getFullYear()} TaskFlow. All rights reserved.
     </div>
     <div className="flex items-center gap-2 text-[12px] text-slate-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      All systems operational
     </div>
    </div>
   </div>
  </footer>
 );
};
