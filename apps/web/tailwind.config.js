/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        taskflow: {
          bg: '#070a0f',
          canvas: '#0b0f17',
          surface: '#0f172a',
          'surface-hover': '#1e293b',
          card: '#111827',
          'card-hover': '#1a2336',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(56, 189, 248, 0.3)',
          'border-subtle': 'rgba(255, 255, 255, 0.05)',
          muted: '#64748b',
          text: '#f8fafc',
          'text-dim': '#94a3b8',
          accent: '#38bdf8',
          'accent-glow': 'rgba(56, 189, 248, 0.15)',
          primary: '#0284c7',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#f43f5e',
          purple: '#a855f7',
          indigo: '#6366f1',
        },
      },
      fontFamily: {
        display: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        sans: [
          'Inter',
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 2px 8px -2px rgba(0, 0, 0, 0.4)',
        'elevation-2': '0 8px 24px -4px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.3)',
        'elevation-3': '0 16px 36px -6px rgba(0, 0, 0, 0.65), 0 4px 12px -2px rgba(0, 0, 0, 0.4)',
        'elevation-4': '0 24px 48px -12px rgba(0, 0, 0, 0.75)',
        'glow-cyan': '0 0 25px -5px rgba(56, 189, 248, 0.25)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.25)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.25)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
      },
      backgroundImage: {
        'radial-spotlight':
          'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(56, 189, 248, 0.08), transparent 40%)',
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'hero-glow':
          'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.05) 50%, transparent 80%)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
