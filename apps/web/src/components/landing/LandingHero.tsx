import React, { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, Zap, Sparkles, GitBranch } from 'lucide-react';

interface LandingHeroProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onExplore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Animated particle grid effect */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dots: { x: number; y: number; vx: number; vy: number; opacity: number }[] = [];
    const DOT_COUNT = 60;
    for (let i = 0; i < DOT_COUNT; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${d.opacity})`;
        ctx.fill();
      });

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center pt-[68px] overflow-hidden"
    >
      {/* Canvas particle field */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Atmospheric radial glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[900px] h-[600px] bg-gradient-radial from-sky-500/[0.14] via-indigo-500/[0.06] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-sky-600/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-24 sm:py-32 flex flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/[0.10] border border-sky-500/[0.25] text-[12px] font-semibold text-sky-300 mb-8 tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>AI-powered project operations · Now generally available</span>
        </div>

        {/* Primary headline */}
        <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-black text-white tracking-[-0.03em] leading-[1.04] max-w-4xl mb-6">
          Ship faster with{' '}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              complete clarity
            </span>
            <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-sky-400/0 via-sky-400/60 to-sky-400/0 blur-sm" />
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-[clamp(1rem,2vw,1.25rem)] text-slate-400 max-w-[600px] leading-[1.7] mb-12 font-normal">
          TaskFlow gives engineering teams real-time dependency graphs, AI delivery intelligence,
          and live execution telemetry — all in one operational platform.
        </p>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={onGetStarted}
            className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[15px] font-bold shadow-2xl shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            <span>Get started free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-slate-200 hover:text-white text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
          >
            <span>See how it works</span>
          </button>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            {
              icon: ShieldCheck,
              label: 'Enterprise multi-tenant isolation',
              color: 'text-emerald-400',
            },
            { icon: Zap, label: 'Real-time Socket.IO telemetry', color: 'text-amber-400' },
            { icon: GitBranch, label: 'Deterministic DAG engine', color: 'text-sky-400' },
            { icon: Sparkles, label: 'AI risk prevention', color: 'text-violet-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-[12px] text-slate-500 font-medium"
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade into next section */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#06080d] to-transparent" />
    </section>
  );
};
