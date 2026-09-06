/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        taskflow: {
          bg: '#070b14',
          surface: '#0d1322',
          card: '#121a2d',
          'card-hover': '#162038',
          border: '#1e293b',
          'border-subtle': '#152033',
          muted: '#64748b',
          text: '#f1f5f9',
          'text-dim': '#94a3b8',
          accent: '#38bdf8',
          'accent-glow': 'rgba(56, 189, 248, 0.15)',
          primary: '#6366f1',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px -4px rgba(56, 189, 248, 0.3)',
        'glow-indigo': '0 0 24px -4px rgba(99, 102, 241, 0.3)',
        'glow-purple': '0 0 24px -4px rgba(168, 85, 247, 0.3)',
        'glow-emerald': '0 0 24px -4px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.3)',
        'surface-elevated':
          '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-rest': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'card-hover':
          '0 10px 24px -4px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(56, 189, 248, 0.15)',
        'card-hover-primary':
          '0 10px 24px -4px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(99, 102, 241, 0.2)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
