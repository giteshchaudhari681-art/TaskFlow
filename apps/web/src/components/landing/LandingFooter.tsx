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
    <footer className="border-t border-[#262626] bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          
          {/* Brand */}
          <div className="col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#E85D22] flex items-center justify-center shadow-[0_4px_12px_rgba(232,93,34,0.3)]">
                <Workflow className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-[18px] text-[#F3EDE4] tracking-tight">TaskFlow</span>
            </div>
            <p className="text-[14px] text-[#A3A3A3] leading-relaxed max-w-[280px]">
              AI-powered project operations platform for engineering and product teams that ship fast.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-[8px] bg-[#161616] border border-[#262626] flex items-center justify-center text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-[8px] bg-[#161616] border border-[#262626] flex items-center justify-center text-[#A3A3A3] hover:text-[#F3EDE4] hover:bg-[#1A1A1A] transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8A8A] mb-6">
                {category}
              </h4>
              <ul className="space-y-4">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-[14px] text-[#A3A3A3] hover:text-[#E85D22] transition-colors"
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
        <div className="pt-8 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[13px] text-[#8A8A8A]">
            © {new Date().getFullYear()} TaskFlow. All rights reserved.
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#8A8A8A]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
};
